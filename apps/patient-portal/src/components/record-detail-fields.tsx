import type { ReactNode } from "react"
import { format } from "date-fns"
import {
  Calendar, Clock, Tag, FileText, User, ShieldAlert,
  Phone, Mail, MapPin, GraduationCap, Link2, Activity,
} from "lucide-react"
import { Badge } from "@proxy-smart/shared-ui"
import type { DynamicFhirResource, DocumentReference } from "@/lib/fhir-client"
import { findLinkedDocuments } from "@/components/DocumentsCard"
import { isValidConditionSeverityCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ConditionSeverity"
import { criticalityStyles, type AllergyIntoleranceCriticalityCode } from "@/lib/ips-display-helpers"
import type { ReactionEventSeverityCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ReactionEventSeverity"
import type { ConditionClinicalCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ConditionClinical"

type FhirResource = DynamicFhirResource
type TranslateFn = (key: string, options?: Record<string, unknown>) => string

// ── Types ────────────────────────────────────────────────────────────────────

export interface DetailField {
  key: string
  icon: ReactNode
  label: string
  content: ReactNode
  /** If true, renders as a bordered section instead of an inline row */
  section?: boolean
}

// ── Format helpers ───────────────────────────────────────────────────────────

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—"
  try { return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a") }
  catch { return dateStr }
}

export function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return "—"
  try { return format(new Date(dateStr), "MMM d, yyyy") }
  catch { return dateStr }
}

// ── FHIR extraction helpers ──────────────────────────────────────────────────

function extractRecordedDate(r: FhirResource): string | undefined {
  return (
    r.recordedDate ?? r.authoredOn ?? r.dateAsserted ??
    r.effectiveDateTime ?? r.occurrenceDateTime ?? r.performedDateTime ??
    r.meta?.lastUpdated
  )
}

function extractOnsetDate(r: FhirResource): string | undefined {
  return r.onsetDateTime ?? r.onsetPeriod?.start
}

export function extractPerformer(r: FhirResource): string | undefined {
  const ref =
    r.asserter?.display ?? r.asserter?.reference ??
    r.recorder?.display ?? r.recorder?.reference ??
    r.performer?.[0]?.actor?.display ?? r.performer?.[0]?.actor?.reference ??
    r.performer?.[0]?.display ?? r.performer?.[0]?.reference ??
    r.requester?.display ?? r.requester?.reference
  if (!ref) return undefined
  return ref.includes("/") && !ref.includes(" ") ? ref.replace("/", " #") : ref
}

function displayCodeableConcept(cc: { coding?: { display?: string; code?: string }[]; text?: string } | null | undefined): string | undefined {
  if (!cc) return undefined
  return cc.coding?.[0]?.display ?? cc.text ?? cc.coding?.[0]?.code
}

// ── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_I18N: Record<string, string> = {
  "24484000": "conditionSeverity.severe",
  "6736007": "conditionSeverity.moderate",
  "255604002": "conditionSeverity.mild",
}

const REACTION_BADGE: Record<string, string> = {
  severe: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/20",
  moderate: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/20",
  mild: "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/20",
}

const DATE_KEYS = ["recordedDate", "authoredOn", "dateAsserted", "effectiveDateTime", "occurrenceDateTime", "performedDateTime"]
const PERFORMER_KEYS = ["asserter", "recorder", "performer", "requester"]
const CODE_KEYS = ["code", "vaccineCode", "medicationCodeableConcept"]
const SKIP_ALWAYS = new Set([
  "resourceType", "id", "meta", "text", "contained", "extension",
  "modifierExtension", "verificationStatus", "identifier", "subject", "patient", "name",
])

// ── Main builder ─────────────────────────────────────────────────────────────

export function buildDetailFields(
  resource: FhirResource,
  t: TranslateFn,
  documents?: DocumentReference[],
): DetailField[] {
  const fields: DetailField[] = []
  const handled = new Set<string>()

  function add(key: string | string[], icon: ReactNode, label: string, content: ReactNode, section?: boolean) {
    const keys = Array.isArray(key) ? key : [key]
    keys.forEach(k => handled.add(k))
    fields.push({ key: keys[0], icon, label, content, section })
  }

  // ── Known fields (priority order) ──────────────────────────────────────

  const recorded = extractRecordedDate(resource)
  if (recorded) add(DATE_KEYS, <Calendar className="size-4 text-blue-500" />, t("recordDetail.recorded"), formatDate(recorded))

  const onset = extractOnsetDate(resource)
  if (onset) add(["onsetDateTime", "onsetPeriod"], <Clock className="size-4 text-purple-500" />, t("recordDetail.onset"), formatShortDate(onset))

  if (resource.clinicalStatus) {
    const code = (resource.clinicalStatus.coding?.[0]?.code ?? "") as ConditionClinicalCode | string
    const display = resource.clinicalStatus.coding?.[0]?.display ?? resource.clinicalStatus.text ?? code
    add("clinicalStatus", <Tag className="size-4 text-teal-500" />, t("recordDetail.clinicalStatus"),
      <Badge variant={code === "active" ? "default" : "secondary"} className="text-xs">{display}</Badge>)
  }

  const sevCode = resource.severity?.coding?.[0]?.code
  if (sevCode) {
    const display = (isValidConditionSeverityCode(sevCode) && SEVERITY_I18N[sevCode])
      ? t(SEVERITY_I18N[sevCode])
      : (resource.severity?.coding?.[0]?.display ?? resource.severity?.text ?? sevCode)
    add("severity", <Tag className="size-4 text-orange-500" />, t("recordDetail.severity"), <span className="capitalize">{display}</span>)
  }

  if (resource.criticality) {
    const crit = criticalityStyles[resource.criticality as AllergyIntoleranceCriticalityCode]
    add("criticality", <ShieldAlert className="size-4 text-red-500" />, t("recordDetail.criticality"),
      crit ? <Badge variant={crit.variant} className="text-xs">{t(crit.i18nKey)}</Badge> : <span className="capitalize">{resource.criticality}</span>)
  }

  const catDisplay = displayCodeableConcept(resource.category?.[0])
  if (catDisplay) add("category", <FileText className="size-4 text-slate-500" />, t("recordDetail.category"), <span className="capitalize">{catDisplay}</span>)

  const performer = extractPerformer(resource)
  add(PERFORMER_KEYS, <User className="size-4 text-indigo-500" />, t("recordDetail.verifiedBy"),
    performer ? <span className="font-medium">{performer}</span> : <span className="text-muted-foreground italic">{t("recordDetail.notRecorded")}</span>)

  const codeField = resource.code ?? resource.vaccineCode ?? resource.medicationCodeableConcept
  if (codeField?.coding?.[0]?.code) {
    const c = codeField.coding[0]
    add(CODE_KEYS, <Tag className="size-4 text-gray-500" />, t("recordDetail.code"),
      <span className="font-mono text-xs">{c.code}{c.system && <span className="text-muted-foreground ml-1">({c.system.split("/").pop()})</span>}</span>)
  }

  if (resource.meta?.lastUpdated) {
    add("meta", <Clock className="size-4 text-gray-400" />, t("recordDetail.lastUpdated"), formatDate(resource.meta.lastUpdated))
  }

  if (resource.valueQuantity) {
    add("valueQuantity", <Tag className="size-4 text-emerald-500" />, t("recordDetail.value"),
      <span className="font-medium">{resource.valueQuantity.value} {resource.valueQuantity.unit ?? ""}</span>)
  }

  if (resource.component?.length > 0) {
    add("component", <Activity className="size-4 text-blue-500" />, t("recordDetail.components"), (
      <div className="space-y-1">
        {resource.component.map((comp: FhirResource, i: number) => (
          <div key={i} className="flex justify-between text-sm">
            <span>{comp.code?.coding?.[0]?.display || comp.code?.text || t("recordDetail.component", { n: i + 1 })}</span>
            <span className="text-muted-foreground">{comp.valueQuantity ? `${comp.valueQuantity.value} ${comp.valueQuantity.unit ?? ""}` : "—"}</span>
          </div>
        ))}
      </div>
    ), true)
  }

  const dosageText = resource.dosage?.[0]?.text ?? resource.dosageInstruction?.[0]?.text
  if (dosageText) add(["dosage", "dosageInstruction"], <FileText className="size-4 text-blue-400" />, t("recordDetail.dosage"), dosageText)

  if (resource.reaction?.[0]) {
    const rx = resource.reaction[0]
    add("reaction", <ShieldAlert className="size-4 text-amber-500" />, t("recordDetail.reaction"), <>
      {rx.manifestation?.[0]?.coding?.[0]?.display || rx.manifestation?.[0]?.text || t("recordDetail.unknownReaction")}
      {rx.severity && <Badge variant="outline" className={`ml-2 text-xs ${REACTION_BADGE[rx.severity as ReactionEventSeverityCode] ?? ""}`}>{rx.severity}</Badge>}
    </>)
  }

  if (resource.telecom?.length > 0) {
    add("telecom", <Phone className="size-4 text-green-500" />, t("recordDetail.contact"), (
      <div className="space-y-2">
        {resource.telecom.map((tc: { system?: string; value?: string; use?: string }, i: number) => {
          if (!tc.value) return null
          const ico = tc.system === "phone" || tc.system === "fax" ? <Phone className="size-4 text-green-500" /> : <Mail className="size-4 text-blue-500" />
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="mt-0.5 shrink-0">{ico}</div>
              <div className="min-w-0">
                {tc.use && <p className="text-xs text-muted-foreground capitalize">{tc.use}</p>}
                {tc.system === "email" ? <a href={`mailto:${tc.value}`} className="text-sm text-primary hover:underline">{tc.value}</a>
                  : tc.system === "phone" ? <a href={`tel:${tc.value}`} className="text-sm text-primary hover:underline">{tc.value}</a>
                  : <p className="text-sm">{tc.value}</p>}
              </div>
            </div>
          )
        })}
      </div>
    ), true)
  }

  if (resource.address?.length > 0) {
    const addr = resource.address[0]
    const txt = addr.text ?? [addr.line?.join(", "), addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean).join(", ")
    if (txt) add("address", <MapPin className="size-4 text-rose-500" />, t("recordDetail.address"), txt)
  }

  if (resource.qualification?.length > 0) {
    add("qualification", <GraduationCap className="size-4 text-violet-500" />, t("recordDetail.qualification"),
      resource.qualification
        .map((q: { code?: { coding?: { display?: string }[]; text?: string } }) => q.code?.coding?.[0]?.display ?? q.code?.text)
        .filter(Boolean).join(", "))
  }

  if (resource.note?.[0]?.text) {
    add("note", <FileText className="size-4 text-gray-500" />, t("recordDetail.notes"), resource.note[0].text, true)
  }

  // Linked documents
  const rType = resource.resourceType as string | undefined
  const rId = resource.id as string | undefined
  const linkedDocs = findLinkedDocuments(documents ?? [], rType, rId)
  if (linkedDocs.length > 0) {
    add("linkedDocs", <Link2 className="size-4 text-sky-500" />, t("recordDetail.sourceDocuments"), (
      <div className="space-y-1.5">
        {linkedDocs.map((doc, i) => {
          const docTitle = doc.content?.[0]?.attachment?.title ?? doc.description ?? "Document"
          const url = doc.content?.[0]?.attachment?.url
            ?? (doc.content?.[0]?.attachment?.data && doc.content?.[0]?.attachment?.contentType
              ? `data:${doc.content[0].attachment.contentType};base64,${doc.content[0].attachment.data}` : undefined)
          return (
            <div key={doc.id || i} className="flex items-center gap-2 text-sm">
              <Link2 className="size-3.5 text-sky-500 shrink-0" />
              {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{docTitle}</a>
                : <span className="truncate">{docTitle}</span>}
              {doc.date && <span className="text-xs text-muted-foreground shrink-0">{formatShortDate(doc.date)}</span>}
            </div>
          )
        })}
      </div>
    ), true)
  }

  // ── Generic fallback for remaining fields ──────────────────────────────

  for (const [key, val] of Object.entries(resource)) {
    if (SKIP_ALWAYS.has(key) || handled.has(key) || val == null || val === "") continue
    if (Array.isArray(val) && val.length === 0) continue

    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim()

    if (typeof val === "string") {
      if (/^\d{4}-\d{2}/.test(val)) add(key, <Calendar className="size-4 text-gray-400" />, label, formatDate(val))
      else add(key, <Tag className="size-4 text-gray-400" />, label, val)
    } else if (typeof val === "number" || typeof val === "boolean") {
      add(key, <Tag className="size-4 text-gray-400" />, label, String(val))
    } else if (val?.coding || val?.text) {
      const display = displayCodeableConcept(val)
      if (display) add(key, <Tag className="size-4 text-gray-400" />, label, display)
    } else if (val?.value !== undefined && val?.unit !== undefined) {
      add(key, <Tag className="size-4 text-gray-400" />, label, `${val.value} ${val.unit}`)
    } else if (val?.display || val?.reference) {
      add(key, <User className="size-4 text-gray-400" />, label, val.display ?? val.reference?.replace("/", " #"))
    } else if (Array.isArray(val) && val[0]?.coding) {
      const displays = val.map(displayCodeableConcept).filter(Boolean)
      if (displays.length) add(key, <Tag className="size-4 text-gray-400" />, label, displays.join(", "))
    }
  }

  return fields
}
