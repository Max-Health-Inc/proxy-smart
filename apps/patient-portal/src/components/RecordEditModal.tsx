import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Badge,
} from "@max-health-inc/shared-ui"
import { Loader2, Pencil, Save, X, AlertTriangle } from "lucide-react"
import { updateResource, type DynamicFhirResource } from "@/lib/fhir-client"
import { useTranslation } from "react-i18next"

// ── Types ────────────────────────────────────────────────────────────────────

type FhirResource = DynamicFhirResource

export interface RecordEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: FhirResource | null
  /** Called after successful save with the updated resource from the server */
  onSaved: (updated: FhirResource) => void
}

// ── Editable field definitions per resource type ─────────────────────────────

interface EditableField {
  label: string
  path: string
  type: "text" | "date" | "number"
}

const EDITABLE_FIELDS: Record<string, EditableField[]> = {
  Condition: [
    { label: "Condition Name", path: "code.coding.0.display", type: "text" },
    { label: "Onset Date", path: "onsetDateTime", type: "date" },
    { label: "Clinical Status", path: "clinicalStatus.coding.0.code", type: "text" },
  ],
  AllergyIntolerance: [
    { label: "Substance", path: "code.coding.0.display", type: "text" },
    { label: "Criticality", path: "criticality", type: "text" },
    { label: "Reaction", path: "reaction.0.manifestation.0.coding.0.display", type: "text" },
    { label: "Onset Date", path: "onsetDateTime", type: "date" },
  ],
  MedicationRequest: [
    { label: "Medication", path: "medicationCodeableConcept.coding.0.display", type: "text" },
    { label: "Dosage Instructions", path: "dosageInstruction.0.text", type: "text" },
    { label: "Status", path: "status", type: "text" },
  ],
  MedicationStatement: [
    { label: "Medication", path: "medicationCodeableConcept.coding.0.display", type: "text" },
    { label: "Dosage", path: "dosage.0.text", type: "text" },
    { label: "Status", path: "status", type: "text" },
  ],
  Observation: [
    { label: "Name", path: "code.coding.0.display", type: "text" },
    { label: "Value", path: "valueQuantity.value", type: "number" },
    { label: "Unit", path: "valueQuantity.unit", type: "text" },
    { label: "Effective Date", path: "effectiveDateTime", type: "date" },
  ],
  Immunization: [
    { label: "Vaccine", path: "vaccineCode.coding.0.display", type: "text" },
    { label: "Date Given", path: "occurrenceDateTime", type: "date" },
    { label: "Status", path: "status", type: "text" },
  ],
  Procedure: [
    { label: "Procedure Name", path: "code.coding.0.display", type: "text" },
    { label: "Performed Date", path: "performedDateTime", type: "date" },
    { label: "Status", path: "status", type: "text" },
  ],
}

// ── Path helpers ─────────────────────────────────────────────────────────────

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

function setByPath(obj: FhirResource, path: string, value: unknown): FhirResource {
  const clone = JSON.parse(JSON.stringify(obj)) as FhirResource
  const keys = path.split(".")
  let current: unknown = clone
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (current == null || typeof current !== "object") return clone
    const next = (current as FhirResource)[k]
    if (next == null || typeof next !== "object") {
      const nextKey = keys[i + 1]
      ;(current as FhirResource)[k] = /^\d+$/.test(nextKey) ? [] : {}
    }
    current = (current as FhirResource)[k]
  }
  if (current != null && typeof current === "object") {
    (current as FhirResource)[keys[keys.length - 1]] = value
  }
  return clone
}

// ── Verification helpers ─────────────────────────────────────────────────────

function isVerified(resource: FhirResource): boolean {
  const code = resource.verificationStatus?.coding?.[0]?.code
  return code === "confirmed"
}

/** Extension URL for storing the original resource snapshot before patient edits */
export const ORIGINAL_SNAPSHOT_EXT = "http://proxy-smart.com/fhir/StructureDefinition/original-snapshot"

/**
 * When editing a verified resource, set verificationStatus to "provisional"
 * so it appears as "pending review" until re-confirmed by a practitioner.
 * Also stores the original resource as a snapshot extension for discard/revert.
 */
function markAsPendingReview(resource: FhirResource, originalResource: FhirResource): FhirResource {
  if (!resource.verificationStatus) return resource

  // Only store snapshot if not already present (first edit)
  const existingExts = (resource.extension as Array<{ url: string; valueString?: string }>) ?? []
  const hasSnapshot = existingExts.some(e => e.url === ORIGINAL_SNAPSHOT_EXT)
  const snapshotExt = hasSnapshot
    ? existingExts
    : [...existingExts, { url: ORIGINAL_SNAPSHOT_EXT, valueString: JSON.stringify(originalResource) }]

  return {
    ...resource,
    extension: snapshotExt,
    verificationStatus: {
      coding: [{
        system: resource.verificationStatus.coding?.[0]?.system
          ?? "http://terminology.hl7.org/CodeSystem/condition-ver-status",
        code: "provisional",
        display: "Provisional",
      }],
      text: "Provisional",
    },
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function RecordEditModal({ open, onOpenChange, resource, onSaved }: RecordEditModalProps) {
  const [editValues, setEditValues] = useState<Record<string, string>>(() => {
    if (!resource) return {}
    const rt = resource.resourceType as string | undefined
    const flds = rt ? (EDITABLE_FIELDS[rt] ?? []) : []
    if (!flds.length) return {}
    const vals: Record<string, string> = {}
    for (const f of flds) {
      const current = getByPath(resource, f.path)
      vals[f.path] = current != null ? String(current) : ""
    }
    return vals
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resourceType = resource?.resourceType as string | undefined
  const fields = resourceType ? (EDITABLE_FIELDS[resourceType] ?? []) : []
  const wasVerified = resource ? isVerified(resource) : false
  const { t } = useTranslation()

  const handleSave = useCallback(async () => {
    if (!resource) return
    setSaving(true)
    setError(null)
    try {
      // Apply field edits
      let updated = JSON.parse(JSON.stringify(resource)) as FhirResource
      for (const f of fields) {
        const val = editValues[f.path]
        if (val === undefined) continue
        const coerced = f.type === "number"
          ? (val === "" ? undefined : Number(val))
          : (val === "" ? undefined : val)
        updated = setByPath(updated, f.path, coerced)
      }

      // If the resource was verified, mark as provisional (pending review)
      if (wasVerified) {
        updated = markAsPendingReview(updated, resource)
      }

      const result = await updateResource(updated)
      onSaved(result)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("recordEdit.failedToSave"))
    } finally {
      setSaving(false)
    }
  }, [resource, fields, editValues, wasVerified, onSaved, onOpenChange])

  if (!resource || !fields.length) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" />
            {t("recordEdit.editTitle", { resourceType })}
          </DialogTitle>
          <DialogDescription>
            {wasVerified && (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mt-1">
                <AlertTriangle className="size-3.5" />
                {t("recordEdit.verifiedWarning")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {wasVerified && (
            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              {t("recordEdit.pendingReview")}
            </Badge>
          )}

          {fields.map(f => (
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

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="size-4 mr-1" />
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 mr-1 animate-spin" />
                {t("common.saving")}
              </>
            ) : (
              <>
                <Save className="size-4 mr-1" />
                {wasVerified ? t("recordEdit.saveAsProvisional") : t("recordEdit.saveChanges")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
