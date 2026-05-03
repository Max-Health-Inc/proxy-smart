import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Badge, Button,
} from "@proxy-smart/shared-ui"
import { useState } from "react"
import { ShieldCheck, ShieldAlert, Pencil, Trash2, Undo2 } from "lucide-react"
import type { DocumentReference, DynamicFhirResource } from "@/lib/fhir-client"
import { deleteResource, updateResource } from "@/lib/fhir-client"
import { isValidConditionVerStatusCode, type ConditionVerStatusCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ConditionVerStatus"
import { isValidAllergyintoleranceVerificationCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-AllergyintoleranceVerification"
import { RecordEditModal } from "@/components/RecordEditModal"
import { ORIGINAL_SNAPSHOT_EXT } from "@/components/RecordEditModal"
import { useTranslation } from "react-i18next"
import { buildDetailFields, extractPerformer } from "@/components/record-detail-fields"

// ── Types ────────────────────────────────────────────────────────────────────

type FhirResource = DynamicFhirResource

export interface RecordDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  resource: FhirResource | null
  documents?: DocumentReference[]
  onResourceUpdated?: (updated: FhirResource) => void
  onResourceDeleted?: () => void
}

// ── Verification helpers ─────────────────────────────────────────────────────

const VERIFIED_CODES: ReadonlySet<string> = new Set<ConditionVerStatusCode | string>(["confirmed"])

function isVerifiedCode(code: string): boolean {
  return isValidConditionVerStatusCode(code)
    ? VERIFIED_CODES.has(code)
    : isValidAllergyintoleranceVerificationCode(code)
      ? code === "confirmed"
      : code === "confirmed" || code === "verified"
}

function extractVerificationStatus(r: FhirResource): { verified: boolean; label: string } | undefined {
  const vs = r.verificationStatus
  if (!vs) return undefined
  const code = vs.coding?.[0]?.code ?? vs.text ?? "unknown"
  const display = vs.coding?.[0]?.display ?? vs.text ?? code
  return { verified: isVerifiedCode(code), label: display }
}

const EDITABLE_TYPES = new Set([
  "Condition", "AllergyIntolerance", "MedicationRequest",
  "MedicationStatement", "Observation", "Immunization", "Procedure",
])

// ── Component ────────────────────────────────────────────────────────────────

export function RecordDetailModal({
  open, onOpenChange, title, resource, documents, onResourceUpdated, onResourceDeleted,
}: RecordDetailModalProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { t } = useTranslation()
  if (!resource) return null

  const verification = extractVerificationStatus(resource)
  const resourceType = resource.resourceType as string | undefined
  const resourceId = resource.id as string | undefined
  const canEdit = onResourceUpdated && resourceType && EDITABLE_TYPES.has(resourceType)
  const canDelete = onResourceDeleted && resourceType && resourceId
    && EDITABLE_TYPES.has(resourceType) && (!verification || !verification.verified)
  const hasSnapshot = ((resource.extension as Array<{ url: string }>) ?? []).some(e => e.url === ORIGINAL_SNAPSHOT_EXT)
  const fields = buildDetailFields(resource, t, documents)

  async function handleDelete() {
    if (!resource || !resourceType || !resourceId) return
    setDeleting(true)
    try {
      // Check for original snapshot extension — revert instead of delete
      const exts = (resource.extension as Array<{ url: string; valueString?: string }>) ?? []
      const snapshot = exts.find(e => e.url === ORIGINAL_SNAPSHOT_EXT)
      if (snapshot?.valueString) {
        const original = JSON.parse(snapshot.valueString) as FhirResource
        await updateResource(original)
      } else {
        await deleteResource(resourceType, resourceId)
      }
      onResourceDeleted?.()
      onOpenChange(false)
    } catch { /* keep modal open */ }
    finally { setDeleting(false); setConfirmDelete(false) }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col">
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
                  {verification.verified ? <ShieldCheck className="size-3 mr-1" /> : <ShieldAlert className="size-3 mr-1" />}
                  {verification.label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {resourceType && <span className="text-xs font-mono">{resourceType}</span>}
              {resourceId && <span className="text-xs font-mono text-muted-foreground"> / {resourceId}</span>}
            </DialogDescription>
            {canEdit && (
              <div className="flex items-center gap-2 mt-1">
                <Button variant="outline" size="sm" className="w-fit" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-3.5 mr-1" />{t("recordDetail.editRecord")}
                </Button>
                {canDelete && !confirmDelete && (
                  <Button variant="outline" size="sm" className="w-fit text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                    {hasSnapshot
                      ? <><Undo2 className="size-3.5 mr-1" />{t("recordDetail.discardChanges", "Discard Changes")}</>
                      : <><Trash2 className="size-3.5 mr-1" />{t("recordDetail.deleteRecord")}</>}
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

          <div className="space-y-4 pt-2 overflow-y-auto">
            {fields.map(f => f.section ? (
              <div key={f.key} className="border-t pt-3 mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{f.label}</p>
                <div className="text-sm">{f.content}</div>
              </div>
            ) : (
              <DetailRow key={f.key} icon={f.icon} label={f.label}>{f.content}</DetailRow>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {onResourceUpdated && (
        <RecordEditModal
          key={resource?.id}
          open={editOpen}
          onOpenChange={setEditOpen}
          resource={resource}
          onSaved={(updated) => {
            onResourceUpdated(updated)
            setEditOpen(false)
            onOpenChange(false)
          }}
        />
      )}
    </>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
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
  const performer = extractPerformer(resource)
  return !!performer
}