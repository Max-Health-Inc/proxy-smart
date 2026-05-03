import { useState, useCallback, useRef } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Spinner,
} from "@max-health-inc/shared-ui"
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Check,
  X,
} from "lucide-react"
import { smartAuth } from "@/lib/smart-auth"
import {
  importDocument,
  createResource,
  type FailedResource,
  type DocumentImportResponse,
} from "@/lib/fhir-client"
import { ResourceReviewCard } from "./ResourceReviewCard"
import { useTranslation } from "react-i18next"

// ── State machine ────────────────────────────────────────────────────────────

type ImportStep = "upload" | "processing" | "review" | "saving" | "done"

interface ResourceSelection {
  resource: import("@/lib/fhir-client").ImportedResource
  selected: boolean
  editedResource?: Record<string, unknown>
}

// ── Component ────────────────────────────────────────────────────────────────

export function DocumentImport({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const [step, setStep] = useState<ImportStep>("upload")
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DocumentImportResponse | null>(null)
  const [selections, setSelections] = useState<ResourceSelection[]>([])
  const [saveProgress, setSaveProgress] = useState({ saved: 0, total: 0 })
  const [saveErrors, setSaveErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const patientId = smartAuth.getToken()?.patient as string | undefined
  const { t } = useTranslation()

  const processFile = useCallback(async (file: File) => {
    if (!patientId) {
      setError(t("documentImport.noPatientContext"))
      return
    }

    if (file.type !== "application/pdf") {
      setError(t("documentImport.onlyPdf"))
      return
    }

    setError(null)
    setStep("processing")

    try {
      const res = await importDocument(file, patientId)
      setResult(res)
      setSelections(res.resources.map(r => ({ resource: r, selected: true })))
      setStep("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
      setStep("upload")
    }
  }, [patientId])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const toggleSelection = useCallback((index: number) => {
    setSelections(prev => prev.map((s, i) =>
      i === index ? { ...s, selected: !s.selected } : s
    ))
  }, [])

  const toggleAll = useCallback((selected: boolean) => {
    setSelections(prev => prev.map(s => ({ ...s, selected })))
  }, [])

  const handleResourceEdited = useCallback((index: number, updated: Record<string, unknown>) => {
    setSelections(prev => prev.map((s, i) =>
      i === index ? { ...s, editedResource: updated } : s
    ))
  }, [])

  const handleConfirm = useCallback(async () => {
    const toSave = selections.filter(s => s.selected)
    const rejected = selections.filter(s => !s.selected)
    if (toSave.length === 0) return

    const totalSteps = toSave.length
      + (result?.documentReference ? 1 : 0)
      + (rejected.length > 0 ? 1 : 0) // audit step
    setStep("saving")
    setSaveProgress({ saved: 0, total: totalSteps })
    const errors: string[] = []

    // Save accepted resources (use edited version if available) and collect references
    const savedRefs: { reference: string }[] = []
    for (let i = 0; i < toSave.length; i++) {
      const resourceData = toSave[i].editedResource ?? toSave[i].resource.resource
      try {
        const saved = await createResource(resourceData as { resourceType: string })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const id = (saved as any).id as string | undefined
        if (id) savedRefs.push({ reference: `${toSave[i].resource.resourceType}/${id}` })
        setSaveProgress(p => ({ ...p, saved: p.saved + 1 }))
      } catch (err) {
        errors.push(
          `${toSave[i].resource.resourceType}: ${err instanceof Error ? err.message : "Failed"}`
        )
      }
    }

    // Save DocumentReference with context.related linking to saved resources
    if (result?.documentReference) {
      try {
        const docRef = { ...result.documentReference } as Record<string, unknown>
        if (savedRefs.length > 0) {
          docRef.context = { ...(docRef.context as object ?? {}), related: savedRefs }
        }
        await createResource(docRef as { resourceType: string })
        setSaveProgress(p => ({ ...p, saved: p.saved + 1 }))
      } catch (err) {
        errors.push(`DocumentReference: ${err instanceof Error ? err.message : "Failed"}`)
      }
    }

    // Audit trail for rejected resources
    if (rejected.length > 0 && patientId) {
      try {
        const auditEvent = {
          resourceType: "AuditEvent",
          type: {
            system: "http://terminology.hl7.org/CodeSystem/audit-event-type",
            code: "rest",
            display: "RESTful Operation",
          },
          subtype: [{
            system: "http://proxy-smart.dev/audit",
            code: "document-import-rejection",
            display: "Document Import Resource Rejection",
          }],
          action: "C",
          recorded: new Date().toISOString(),
          outcome: "0",
          outcomeDesc: `Patient declined ${rejected.length} extracted resource(s) during document import of ${result?.fileName ?? "unknown"}`,
          agent: [{
            who: { reference: `Patient/${patientId}` },
            requestor: true,
          }],
          source: {
            observer: { display: "Patient Portal - Document Import" },
          },
          entity: rejected.map(r => ({
            what: { display: `${r.resource.resourceType} (rejected)` },
            detail: [{
              type: "resource-json",
              valueString: JSON.stringify(r.resource.resource),
            }],
          })),
        }
        await createResource(auditEvent as { resourceType: string })
        setSaveProgress(p => ({ ...p, saved: p.saved + 1 }))
      } catch (err) {
        errors.push(`Audit trail: ${err instanceof Error ? err.message : "Failed"}`)
      }
    }

    setSaveErrors(errors)
    setStep("done")
    onSaved?.()
  }, [selections, result, patientId])

  const selectedCount = selections.filter(s => s.selected).length

  // ── Upload step ────────────────────────────────────────────────────────────

  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="size-4" />
            {t("documentImport.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="size-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">{t("documentImport.dropZone")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("documentImport.dropZoneHint")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t("common.cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Processing step ────────────────────────────────────────────────────────

  if (step === "processing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Spinner size="sm" />
            {t("documentImport.processing")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground text-center">
              {t("documentImport.processingHint")}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {t("documentImport.processingLarge")}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Review step ────────────────────────────────────────────────────────────

  if (step === "review" && result) {
    return (
      <div className="space-y-4">
        {/* Summary banner */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{result.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {t("common.nPagesProcessed", { n: result.pagesProcessed })}
                  {" · "}
                  {t("common.nResourcesExtracted", { n: result.resources.length })}
                  {result.failed.length > 0 && (
                    <span className="text-destructive">
                      {" · "}{result.failed.length} failed
                    </span>
                  )}
                  {" · "}{(result.processingTimeMs / 1000).toFixed(1)}s
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAll(selectedCount < selections.length)}
                >
                  {selectedCount === selections.length ? t("common.deselectAll") : t("common.selectAll")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resource cards */}
        <div className="grid gap-3 md:grid-cols-2">
          {selections.map((sel, i) => (
            <ResourceReviewCard
              key={i}
              resource={sel.editedResource
                ? { ...sel.resource, resource: sel.editedResource }
                : sel.resource
              }
              selected={sel.selected}
              onToggleSelect={() => toggleSelection(i)}
              onResourceEdited={(updated) => handleResourceEdited(i, updated)}
            />
          ))}
        </div>

        {/* Failed resources */}
        {result.failed.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="size-4" />
                {t("common.failedToExtract", { n: result.failed.length })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.failed.map((f: FailedResource, i: number) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{f.resourceType}</span>
                    <span className="text-muted-foreground ml-2">
                      — {f.errors[0] || "validation failed"}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("common.nSelected", { n: selectedCount, total: selections.length })}
            </span>
            <Button
              size="sm"
              disabled={selectedCount === 0}
              onClick={handleConfirm}
            >
              <Check className="size-4" />
              {t("common.saveNResources", { n: selectedCount })}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Saving step ────────────────────────────────────────────────────────────

  if (step === "saving") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Spinner size="sm" />
            {t("common.savingResources")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 py-4">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(saveProgress.saved / saveProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t("common.nOfNSaved", { n: saveProgress.saved, total: saveProgress.total })}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Done step ──────────────────────────────────────────────────────────────

  if (step === "done") {
    const hasErrors = saveErrors.length > 0

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {hasErrors ? (
              <AlertTriangle className="size-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="size-4 text-green-500" />
            )}
            {hasErrors ? t("common.completedWithErrors") : t("documentImport.importComplete")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("common.nResourcesSaved", { n: saveProgress.saved - saveErrors.length })}
          </p>

          {hasErrors && (
            <ul className="space-y-1">
              {saveErrors.map((err, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-destructive">
                  <X className="size-3 shrink-0" />
                  {err}
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end">
            <Button size="sm" onClick={onClose}>
              {t("common.done")}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
