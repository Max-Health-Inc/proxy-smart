import { useState, useCallback, useMemo } from "react"
import {
  Card,
  CardContent,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
} from "@proxy-smart/shared-ui"
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Pencil,
  FileText,
  Heart,
  ShieldAlert,
  Pill,
  Syringe,
  TestTubes,
  Stethoscope,
  ClipboardList,
  Save,
  X,
} from "lucide-react"
import { format } from "date-fns"
import type { ImportedResource } from "@/lib/fhir-client"
import { useTranslation } from "react-i18next"

/** Filter out FHIR validation warnings that are not useful to patients (e.g. missing narrative) */
const SUPPRESSED_WARNING_PATTERNS = [/narrative/i, /text\.div/i, /text\.status/i, /dom-6/i]
function filterWarnings(warnings: string[]): string[] {
  return warnings.filter(w => !SUPPRESSED_WARNING_PATTERNS.some(p => p.test(w)))
}

// ── Resource type display config ─────────────────────────────────────────────

const RESOURCE_ICONS: Record<string, typeof Heart> = {
  Condition: Heart,
  AllergyIntolerance: ShieldAlert,
  MedicationRequest: Stethoscope,
  MedicationStatement: Pill,
  Observation: TestTubes,
  Immunization: Syringe,
  Procedure: ClipboardList,
  DiagnosticReport: FileText,
}

const RESOURCE_COLORS: Record<string, string> = {
  Condition: "text-rose-500",
  AllergyIntolerance: "text-amber-500",
  MedicationRequest: "text-cyan-500",
  MedicationStatement: "text-blue-500",
  Observation: "text-purple-500",
  Immunization: "text-green-500",
  Procedure: "text-indigo-500",
  DiagnosticReport: "text-orange-500",
}

// ── Editable field definitions per resource type ─────────────────────────────

interface EditableField {
  label: string
  path: string         // dot-notation path into the FHIR resource
  type: "text" | "date" | "number"
}

const EDITABLE_FIELDS: Record<string, EditableField[]> = {
  Condition: [
    { label: "Condition Name", path: "code.coding.0.display", type: "text" },
    { label: "Condition Code", path: "code.coding.0.code", type: "text" },
    { label: "Onset Date", path: "onsetDateTime", type: "date" },
    { label: "Clinical Status", path: "clinicalStatus.coding.0.code", type: "text" },
    { label: "Verification Status", path: "verificationStatus.coding.0.code", type: "text" },
  ],
  AllergyIntolerance: [
    { label: "Substance", path: "code.coding.0.display", type: "text" },
    { label: "Substance Code", path: "code.coding.0.code", type: "text" },
    { label: "Criticality", path: "criticality", type: "text" },
    { label: "Reaction", path: "reaction.0.manifestation.0.coding.0.display", type: "text" },
    { label: "Onset Date", path: "onsetDateTime", type: "date" },
  ],
  MedicationRequest: [
    { label: "Medication", path: "medicationCodeableConcept.coding.0.display", type: "text" },
    { label: "Medication Code", path: "medicationCodeableConcept.coding.0.code", type: "text" },
    { label: "Dosage Instructions", path: "dosageInstruction.0.text", type: "text" },
    { label: "Authored On", path: "authoredOn", type: "date" },
    { label: "Status", path: "status", type: "text" },
  ],
  MedicationStatement: [
    { label: "Medication", path: "medicationCodeableConcept.coding.0.display", type: "text" },
    { label: "Medication Code", path: "medicationCodeableConcept.coding.0.code", type: "text" },
    { label: "Dosage", path: "dosage.0.text", type: "text" },
    { label: "Status", path: "status", type: "text" },
  ],
  Observation: [
    { label: "Name", path: "code.coding.0.display", type: "text" },
    { label: "Observation Code", path: "code.coding.0.code", type: "text" },
    { label: "Value", path: "valueQuantity.value", type: "number" },
    { label: "Unit", path: "valueQuantity.unit", type: "text" },
    { label: "Effective Date", path: "effectiveDateTime", type: "date" },
    { label: "Status", path: "status", type: "text" },
  ],
  Immunization: [
    { label: "Vaccine", path: "vaccineCode.coding.0.display", type: "text" },
    { label: "Vaccine Code", path: "vaccineCode.coding.0.code", type: "text" },
    { label: "Date Given", path: "occurrenceDateTime", type: "date" },
    { label: "Status", path: "status", type: "text" },
  ],
  Procedure: [
    { label: "Procedure Name", path: "code.coding.0.display", type: "text" },
    { label: "Procedure Code", path: "code.coding.0.code", type: "text" },
    { label: "Performed Date", path: "performedDateTime", type: "date" },
    { label: "Status", path: "status", type: "text" },
  ],
  DiagnosticReport: [
    { label: "Report Name", path: "code.coding.0.display", type: "text" },
    { label: "Report Code", path: "code.coding.0.code", type: "text" },
    { label: "Issued Date", path: "issued", type: "date" },
    { label: "Status", path: "status", type: "text" },
    { label: "Conclusion", path: "conclusion", type: "text" },
  ],
}

// ── Path helpers ─────────────────────────────────────────────────────────────

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

function setByPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>
  const keys = path.split(".")
  let current: unknown = clone
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (current == null || typeof current !== "object") return clone
    const next = (current as Record<string, unknown>)[k]
    if (next == null || typeof next !== "object") {
      // Auto-create intermediate object or array
      const nextKey = keys[i + 1]
      ;(current as Record<string, unknown>)[k] = /^\d+$/.test(nextKey) ? [] : {}
    }
    current = (current as Record<string, unknown>)[k]
  }
  if (current != null && typeof current === "object") {
    (current as Record<string, unknown>)[keys[keys.length - 1]] = value
  }
  return clone
}

// ── Display helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try { return format(new Date(iso), "MMM d, yyyy") } catch { return iso }
}

function getResourceTitle(resource: Record<string, unknown>): string {
  const rt = resource.resourceType as string
  const code = resource.code as { coding?: { display?: string }[]; text?: string } | undefined
  if (code) return code.coding?.[0]?.display || code.text || `Unknown ${rt}`
  const medCode = resource.medicationCodeableConcept as { coding?: { display?: string }[]; text?: string } | undefined
  if (medCode) return medCode.coding?.[0]?.display || medCode.text || "Unknown medication"
  const vaccineCode = resource.vaccineCode as { coding?: { display?: string }[]; text?: string } | undefined
  if (vaccineCode) return vaccineCode.coding?.[0]?.display || vaccineCode.text || "Unknown vaccine"
  return `${rt} resource`
}

function getResourceDetail(resource: Record<string, unknown>): string | null {
  if (resource.onsetDateTime) return `Onset: ${formatDate(resource.onsetDateTime as string)}`
  const dosage = resource.dosageInstruction as { text?: string }[] | undefined
  if (dosage?.[0]?.text) return dosage[0].text
  const dosageStmt = resource.dosage as { text?: string }[] | undefined
  if (dosageStmt?.[0]?.text) return dosageStmt[0].text
  const vq = resource.valueQuantity as { value?: number; unit?: string } | undefined
  if (vq?.value != null) return `${vq.value} ${vq.unit ?? ""}`
  if (resource.valueString) return resource.valueString as string
  const rx = resource.reaction as { manifestation?: { coding?: { display?: string }[] }[] }[] | undefined
  if (rx?.[0]?.manifestation?.[0]?.coding?.[0]?.display) return `Reaction: ${rx[0].manifestation[0].coding[0].display}`
  if (resource.authoredOn) return `Authored: ${formatDate(resource.authoredOn as string)}`
  if (resource.occurrenceDateTime) return formatDate(resource.occurrenceDateTime as string)
  return null
}

// ── Detail fields for expansion view ─────────────────────────────────────────

interface DetailField { label: string; value: string }

function getDetailFields(resource: Record<string, unknown>): DetailField[] {
  const fields: DetailField[] = []
  const rt = resource.resourceType as string

  const editableFields = EDITABLE_FIELDS[rt] || []
  for (const f of editableFields) {
    const val = getByPath(resource, f.path)
    if (val != null && val !== "") {
      const display = f.type === "date" ? formatDate(String(val)) : String(val)
      fields.push({ label: f.label, value: display })
    }
  }

  // Always show patient reference
  const subject = resource.subject as { reference?: string } | undefined
  if (subject?.reference) fields.push({ label: "Patient", value: subject.reference })

  // Show meta tags if present
  const meta = resource.meta as { tag?: { code?: string }[] } | undefined
  if (meta?.tag?.length) {
    fields.push({ label: "Tags", value: meta.tag.map(t => t.code).filter(Boolean).join(", ") })
  }

  return fields
}

// ── Component ────────────────────────────────────────────────────────────────

interface ResourceReviewCardProps {
  resource: ImportedResource
  selected: boolean
  onToggleSelect: () => void
  onResourceEdited: (updated: Record<string, unknown>) => void
}

export function ResourceReviewCard({ resource, selected, onToggleSelect, onResourceEdited }: ResourceReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  const r = resource
  const res = r.resource as Record<string, unknown>
  const Icon = RESOURCE_ICONS[r.resourceType] || FileText
  const color = RESOURCE_COLORS[r.resourceType] || "text-gray-500"
  const detailFields = useMemo(() => getDetailFields(res), [res])
  const editableFields = EDITABLE_FIELDS[r.resourceType] || []
  const filteredWarnings = useMemo(() => filterWarnings(r.warnings), [r.warnings])
  const { t } = useTranslation()

  const openEditDialog = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Pre-populate edit values from current resource
    const vals: Record<string, string> = {}
    for (const f of editableFields) {
      const current = getByPath(res, f.path)
      vals[f.path] = current != null ? String(current) : ""
    }
    setEditValues(vals)
    setEditing(true)
  }, [editableFields, res])

  const handleSaveEdit = useCallback(() => {
    let updated = { ...res } as Record<string, unknown>
    for (const f of editableFields) {
      const val = editValues[f.path]
      if (val === undefined) continue
      const coerced = f.type === "number" ? (val === "" ? undefined : Number(val)) : (val === "" ? undefined : val)
      updated = setByPath(updated, f.path, coerced)
    }
    onResourceEdited(updated)
    setEditing(false)
  }, [editValues, editableFields, res, onResourceEdited])

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(prev => !prev)
  }, [])

  return (
    <>
      <Card
        className={`transition-all ${
          selected ? "ring-2 ring-primary/50" : "opacity-60"
        }`}
      >
        <CardContent className="py-3">
          {/* Main row — click to select/deselect */}
          <div className="flex items-start gap-3 cursor-pointer" onClick={onToggleSelect}>
            <div className={`mt-0.5 ${selected ? "text-primary" : "text-muted-foreground"}`}>
              {selected ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <div className="size-5 rounded-full border-2 border-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${color}`} />
                <Badge variant="outline" className="text-xs">{r.resourceType}</Badge>
                {r.retriesNeeded > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {t("common.nFixes", { n: r.retriesNeeded })}
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium mt-1 truncate">
                {getResourceTitle(res)}
              </p>
              {getResourceDetail(res) && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {getResourceDetail(res)}
                </p>
              )}
              {filteredWarnings.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="size-3 text-amber-500" />
                  <span className="text-xs text-amber-600">
                    {filteredWarnings.length} warning{filteredWarnings.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
            {/* Expand / Edit buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {editableFields.length > 0 && selected && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={openEditDialog} title={t("recordDetail.editRecord")}>
                  <Pencil className="size-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleExpand} title="Show details">
                {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Expanded detail view */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
              {detailFields.length > 0 ? (
                <div className="grid gap-2">
                  {detailFields.map((f, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 text-xs">
                      <span className="font-medium text-muted-foreground sm:w-32 sm:shrink-0">{f.label}:</span>
                      <span className="text-foreground break-all">{f.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No structured details available</p>
              )}
              {filteredWarnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-amber-600">Warnings:</p>
                  {filteredWarnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-600 pl-2">• {w}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-4" />
              {t("recordEdit.editTitle", { resourceType: r.resourceType })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {editableFields.map(f => (
              <div key={f.path} className="space-y-1.5">
                <Label className="text-sm">{f.label}</Label>
                <Input
                  type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                  value={editValues[f.path] ?? ""}
                  onChange={e => setEditValues(prev => ({ ...prev, [f.path]: e.target.value }))}
                  className="text-sm"
                />
              </div>
            ))}
            {editableFields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No editable fields defined for {r.resourceType}.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <X className="size-4 mr-1" />
              {t("common.cancel")}
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={editableFields.length === 0}>
              <Save className="size-4 mr-1" />
              {t("recordEdit.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
