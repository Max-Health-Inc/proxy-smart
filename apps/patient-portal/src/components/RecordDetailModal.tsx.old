import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  Button,
} from "@proxy-smart/shared-ui"
import { format } from "date-fns"
import { useState } from "react"
import { ShieldCheck, ShieldAlert, Calendar, User, Clock, Tag, FileText, Link2, Pencil, Trash2, Phone, Mail, MapPin, GraduationCap } from "lucide-react"
import { findLinkedDocuments } from "@/components/DocumentsCard"
import type { DocumentReference, DynamicFhirResource } from "@/lib/fhir-client"
import { isValidConditionVerStatusCode, type ConditionVerStatusCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ConditionVerStatus"
import { isValidAllergyintoleranceVerificationCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-AllergyintoleranceVerification"
import type { ReactionEventSeverityCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ReactionEventSeverity"
import type { ConditionClinicalCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ConditionClinical"
import { isValidConditionSeverityCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ConditionSeverity"
import { criticalityStyles, type AllergyIntoleranceCriticalityCode } from "@/lib/ips-display-helpers"
import { RecordEditModal } from "@/components/RecordEditModal"
import { deleteResource } from "@/lib/fhir-client"
import { useTranslation } from "react-i18next"

// ── Types ────────────────────────────────────────────────────────────────────

type FhirResource = DynamicFhirResource

export interface RecordDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Display name for the record (the bold text the user clicked) */
  title: string
  /** The underlying FHIR resource */
  resource: FhirResource | null
  /** All patient documents — used to find cross-references */
  documents?: DocumentReference[]
  /** Called when the user edits and saves this resource */
  onResourceUpdated?: (updated: FhirResource) => void
  /** Called when the user deletes this resource */
  onResourceDeleted?: () => void
}

// ── Metadata extraction helpers ──────────────────────────────────────────────

function extractRecordedDate(r: FhirResource): string | undefined {
  return (
    r.recordedDate ??      // Condition, AllergyIntolerance
    r.authoredOn ??        // MedicationRequest
    r.dateAsserted ??      // MedicationStatement
    r.effectiveDateTime ?? // Observation
    r.occurrenceDateTime ?? // Immunization
    r.performedDateTime ?? // Procedure
    r.meta?.lastUpdated
  )
}

function extractOnsetDate(r: FhirResource): string | undefined {
  return r.onsetDateTime ?? r.onsetPeriod?.start
}

function extractPerformer(r: FhirResource): string | undefined {
  // Different resource types put performer / asserter in different places
  const ref =
    r.asserter?.display ??
    r.asserter?.reference ??
    r.recorder?.display ??
    r.recorder?.reference ??
    r.performer?.[0]?.actor?.display ??
    r.performer?.[0]?.actor?.reference ??
    r.performer?.[0]?.display ??
    r.performer?.[0]?.reference ??
    r.requester?.display ??
    r.requester?.reference
  if (!ref) return undefined
  // Clean "Practitioner/123" → "Practitioner 123" if no display name
  return ref.includes("/") && !ref.includes(" ") ? ref.replace("/", " #") : ref
}

const VERIFIED_CODES: ReadonlySet<string> = new Set<ConditionVerStatusCode | string>(["confirmed"])

function isVerifiedCode(code: string): boolean {
  return isValidConditionVerStatusCode(code)
    ? (VERIFIED_CODES.has(code))
    : isValidAllergyintoleranceVerificationCode(code)
      ? code === "confirmed"
      : code === "confirmed" || code === "verified"
}

function extractVerificationStatus(r: FhirResource): { verified: boolean; label: string } | undefined {
  const vs = r.verificationStatus
  if (!vs) return undefined
  const code = vs.coding?.[0]?.code ?? vs.text ?? "unknown"
  const display = vs.coding?.[0]?.display ?? vs.text ?? code
  return {
    verified: isVerifiedCode(code),
    label: display,
  }
}

function extractClinicalStatus(r: FhirResource): { code: ConditionClinicalCode | string; display: string } | undefined {
  const cs = r.clinicalStatus
  if (!cs) return undefined
  const code = (cs.coding?.[0]?.code ?? "") as ConditionClinicalCode | string
  const display = cs.coding?.[0]?.display ?? cs.text ?? code
  return { code, display }
}

const SEVERITY_I18N_KEYS: Record<string, string> = { "24484000": "conditionSeverity.severe", "6736007": "conditionSeverity.moderate", "255604002": "conditionSeverity.mild" }

function extractSeverity(r: FhirResource, t: (key: string) => string): string | undefined {
  const sev = r.severity?.coding?.[0]?.code
  if (!sev) return undefined
  if (isValidConditionSeverityCode(sev)) return SEVERITY_I18N_KEYS[sev] ? t(SEVERITY_I18N_KEYS[sev]) : sev
  return r.severity?.coding?.[0]?.display ?? r.severity?.text ?? sev
}

function extractCategory(r: FhirResource): string | undefined {
  const cat = r.category?.[0]
  if (!cat) return undefined
  return cat.coding?.[0]?.display ?? cat.text ?? cat.coding?.[0]?.code
}

function extractCode(r: FhirResource): { system?: string; code?: string; display?: string } | undefined {
  const c = r.code ?? r.vaccineCode ?? r.medicationCodeableConcept
  if (!c) return undefined
  const coding = c.coding?.[0]
  return {
    system: coding?.system,
    code: coding?.code,
    display: coding?.display ?? c.text,
  }
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—"
  try {
    return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a")
  } catch {
    return dateStr
  }
}

function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return "—"
  try {
    return format(new Date(dateStr), "MMM d, yyyy")
  } catch {
    return dateStr
  }
}

// ── Component ────────────────────────────────────────────────────────────────

const severityBadgeStyles: Record<ReactionEventSeverityCode, string> = {
  severe: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/20",
  moderate: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/20",
  mild: "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/20",
}

/** Resource types that support inline editing */
const EDITABLE_TYPES = new Set([
  "Condition", "AllergyIntolerance", "MedicationRequest",
  "MedicationStatement", "Observation", "Immunization", "Procedure",
])

export function RecordDetailModal({ open, onOpenChange, title, resource, documents, onResourceUpdated, onResourceDeleted }: RecordDetailModalProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { t } = useTranslation()
  if (!resource) return null

  const recordedDate = extractRecordedDate(resource)
  const onsetDate = extractOnsetDate(resource)
  const performer = extractPerformer(resource)
  const verification = extractVerificationStatus(resource)
  const clinicalStatus = extractClinicalStatus(resource)
  const severity = extractSeverity(resource, t)
  const category = extractCategory(resource)
  const code = extractCode(resource)
  const resourceType = resource.resourceType as string | undefined
  const resourceId = resource.id as string | undefined
  const lastUpdated = resource.meta?.lastUpdated as string | undefined
  const linkedDocs = findLinkedDocuments(documents ?? [], resourceType, resourceId)

  const canDelete = onResourceDeleted && resourceType && resourceId && EDITABLE_TYPES.has(resourceType) && (!verification || !verification.verified)

  async function handleDelete() {
    if (!resourceType || !resourceId) return
    setDeleting(true)
    try {
      await deleteResource(resourceType, resourceId)
      onResourceDeleted?.()
      onOpenChange(false)
    } catch {
      // keep modal open on failure
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {title}
            {verification && (
              <Badge
                variant={verification.verified ? "default" : "secondary"}
                className={verification.verified
                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"}
              >
                {verification.verified ? (
                  <ShieldCheck className="size-3 mr-1" />
                ) : (
                  <ShieldAlert className="size-3 mr-1" />
                )}
                {verification.label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {resourceType && <span className="text-xs font-mono">{resourceType}</span>}
            {resourceId && <span className="text-xs font-mono text-muted-foreground"> / {resourceId}</span>}
          </DialogDescription>
          {onResourceUpdated && resourceType && EDITABLE_TYPES.has(resourceType) && (
            <div className="flex items-center gap-2 mt-1">
              <Button variant="outline" size="sm" className="w-fit" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5 mr-1" />
                {t("recordDetail.editRecord")}
              </Button>
              {canDelete && !confirmDelete && (
                <Button variant="outline" size="sm" className="w-fit text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-3.5 mr-1" />
                  {t("recordDetail.deleteRecord")}
                </Button>
              )}
              {canDelete && confirmDelete && (
                <div className="flex items-center gap-2">
                  <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
                    {deleting ? t("recordDetail.deleting") : t("recordDetail.confirmDelete")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    {t("recordDetail.cancel")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Recorded / effective date */}
          {recordedDate && (
            <DetailRow icon={<Calendar className="size-4 text-blue-500" />} label={t("recordDetail.recorded")}>
              {formatDate(recordedDate)}
            </DetailRow>
          )}

          {/* Onset date (conditions) */}
          {onsetDate && (
            <DetailRow icon={<Clock className="size-4 text-purple-500" />} label={t("recordDetail.onset")}>
              {formatShortDate(onsetDate)}
            </DetailRow>
          )}

          {/* Clinical status */}
          {clinicalStatus && (
            <DetailRow icon={<Tag className="size-4 text-teal-500" />} label={t("recordDetail.clinicalStatus")}>
              <Badge variant={(clinicalStatus.code as ConditionClinicalCode) === "active" ? "default" : "secondary"} className="text-xs">
                {clinicalStatus.display}
              </Badge>
            </DetailRow>
          )}

          {severity && (
            <DetailRow icon={<Tag className="size-4 text-orange-500" />} label={t("recordDetail.severity")}>
              <span className="capitalize">{severity}</span>
            </DetailRow>
          )}

          {/* Criticality (AllergyIntolerance) */}
          {resource.criticality && (() => {
            const crit = criticalityStyles[resource.criticality as AllergyIntoleranceCriticalityCode]
            return crit ? (
              <DetailRow icon={<ShieldAlert className="size-4 text-red-500" />} label={t("recordDetail.criticality")}>
                <Badge variant={crit.variant} className="text-xs">{t(crit.i18nKey)}</Badge>
              </DetailRow>
            ) : (
              <DetailRow icon={<ShieldAlert className="size-4 text-red-500" />} label={t("recordDetail.criticality")}>
                <span className="capitalize">{resource.criticality}</span>
              </DetailRow>
            )
          })()}

          {/* Category */}
          {category && (
            <DetailRow icon={<FileText className="size-4 text-slate-500" />} label={t("recordDetail.category")}>
              <span className="capitalize">{category}</span>
            </DetailRow>
          )}

          {/* Performer / Asserter */}
          <DetailRow icon={<User className="size-4 text-indigo-500" />} label={t("recordDetail.verifiedBy")}>
            {performer ? (
              <span className="font-medium">{performer}</span>
            ) : (
              <span className="text-muted-foreground italic">{t("recordDetail.notRecorded")}</span>
            )}
          </DetailRow>

          {/* Code system info */}
          {code?.code && (
            <DetailRow icon={<Tag className="size-4 text-gray-500" />} label={t("recordDetail.code")}>
              <span className="font-mono text-xs">
                {code.code}
                {code.system && (
                  <span className="text-muted-foreground ml-1">
                    ({code.system.split("/").pop()})
                  </span>
                )}
              </span>
            </DetailRow>
          )}

          {/* Last updated */}
          {lastUpdated && (
            <DetailRow icon={<Clock className="size-4 text-gray-400" />} label={t("recordDetail.lastUpdated")}>
              {formatDate(lastUpdated)}
            </DetailRow>
          )}

          {/* Value (for Observations) */}
          {resource.valueQuantity && (
            <DetailRow icon={<Tag className="size-4 text-emerald-500" />} label={t("recordDetail.value")}>
              <span className="font-medium">
                {resource.valueQuantity.value} {resource.valueQuantity.unit || ""}
              </span>
            </DetailRow>
          )}

          {/* Components (e.g. blood pressure systolic/diastolic) */}
          {resource.component?.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t("recordDetail.components")}</p>
              <div className="space-y-1">
                {resource.component.map((comp: FhirResource, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{comp.code?.coding?.[0]?.display || comp.code?.text || t("recordDetail.component", { n: i + 1 })}</span>
                    <span className="text-muted-foreground">
                      {comp.valueQuantity
                        ? `${comp.valueQuantity.value} ${comp.valueQuantity.unit || ""}`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dosage info (medications) */}
          {resource.dosage?.[0]?.text && (
            <DetailRow icon={<FileText className="size-4 text-blue-400" />} label={t("recordDetail.dosage")}>
              {resource.dosage[0].text}
            </DetailRow>
          )}
          {resource.dosageInstruction?.[0]?.text && (
            <DetailRow icon={<FileText className="size-4 text-blue-400" />} label={t("recordDetail.dosage")}>
              {resource.dosageInstruction[0].text}
            </DetailRow>
          )}

          {/* Reaction (allergies) */}
          {resource.reaction?.[0] && (
            <DetailRow icon={<ShieldAlert className="size-4 text-amber-500" />} label={t("recordDetail.reaction")}>
              {resource.reaction[0].manifestation?.[0]?.coding?.[0]?.display ||
                resource.reaction[0].manifestation?.[0]?.text ||
                t("recordDetail.unknownReaction")}
              {resource.reaction[0].severity && (
                <Badge
                  variant="outline"
                  className={`ml-2 text-xs ${severityBadgeStyles[resource.reaction[0].severity as ReactionEventSeverityCode] || ""}`}
                >
                  {resource.reaction[0].severity}
                </Badge>
              )}
            </DetailRow>
          )}

          {/* Telecom (Practitioner, Organization, etc.) */}
          {resource.telecom?.length > 0 && (
            <div className="border-t pt-3 mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("recordDetail.contact")}</p>
              {resource.telecom.map((t: { system?: string; value?: string; use?: string }, i: number) => {
                if (!t.value) return null
                const icon = t.system === 'phone' || t.system === 'fax'
                  ? <Phone className="size-4 text-green-500" />
                  : <Mail className="size-4 text-blue-500" />
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div className="min-w-0">
                      {t.use && <p className="text-xs text-muted-foreground capitalize">{t.use}</p>}
                      {t.system === 'email' ? (
                        <a href={`mailto:${t.value}`} className="text-sm text-primary hover:underline">{t.value}</a>
                      ) : t.system === 'phone' ? (
                        <a href={`tel:${t.value}`} className="text-sm text-primary hover:underline">{t.value}</a>
                      ) : (
                        <p className="text-sm">{t.value}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Address */}
          {resource.address?.length > 0 && resource.address[0]?.text && (
            <DetailRow icon={<MapPin className="size-4 text-rose-500" />} label={t("recordDetail.address")}>
              {resource.address[0].text}
            </DetailRow>
          )}

          {/* Qualification (Practitioner) */}
          {resource.qualification?.length > 0 && (
            <DetailRow icon={<GraduationCap className="size-4 text-violet-500" />} label={t("recordDetail.qualification")}>
              {resource.qualification.map((q: { code?: { coding?: { display?: string }[]; text?: string } }, i: number) => (
                <span key={i}>{q.code?.coding?.[0]?.display ?? q.code?.text ?? ''}{i < resource.qualification.length - 1 ? ', ' : ''}</span>
              ))}
            </DetailRow>
          )}

          {/* Note */}
          {resource.note?.[0]?.text && (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">{t("recordDetail.notes")}</p>
              <p className="text-sm">{resource.note[0].text}</p>
            </div>
          )}

          {/* Linked Documents */}
          {linkedDocs.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t("recordDetail.sourceDocuments")}</p>
              <div className="space-y-1.5">
                {linkedDocs.map((doc, i) => {
                  const docTitle = doc.content?.[0]?.attachment?.title ?? doc.description ?? "Document"
                  const docUrl = doc.content?.[0]?.attachment?.url
                    ?? (doc.content?.[0]?.attachment?.data && doc.content?.[0]?.attachment?.contentType
                      ? `data:${doc.content[0].attachment.contentType};base64,${doc.content[0].attachment.data}`
                      : undefined)
                  return (
                    <div key={doc.id || i} className="flex items-center gap-2 text-sm">
                      <Link2 className="size-3.5 text-sky-500 shrink-0" />
                      {docUrl ? (
                        <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                          {docTitle}
                        </a>
                      ) : (
                        <span className="truncate">{docTitle}</span>
                      )}
                      {doc.date && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatShortDate(doc.date)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {onResourceUpdated && (
      <RecordEditModal
        open={editOpen}
        onOpenChange={setEditOpen}
        resource={resource}
        onSaved={(updated) => {
          onResourceUpdated(updated)
          // Close both edit and detail modals
          setEditOpen(false)
          onOpenChange(false)
        }}
      />
    )}
    </>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm">{children}</p>
      </div>
    </div>
  )
}

// ── Utility: check if a resource is "verified" ──────────────────────────────

export function isResourceVerified(resource: FhirResource): boolean {
  const vs = resource.verificationStatus
  if (vs) {
    const code = vs.coding?.[0]?.code ?? ""
    return isVerifiedCode(code)
  }
  // Resources without verificationStatus: consider verified if asserter/performer exists
  const performer = extractPerformer(resource)
  return !!performer
}
