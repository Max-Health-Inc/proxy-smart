import { useState, useCallback, useRef } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Spinner,
} from "@proxy-smart/shared-ui"
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

// ── State machine ────────────────────────────────────────────────────────────

type ImportStep = "upload" | "processing" | "review" | "saving" | "done"

interface ResourceSelection {
  resource: import("@/lib/fhir-client").ImportedResource
  selected: boolean
  editedResource?: Record<string, unknown>
}

// ── Component ────────────────────────────────────────────────────────────────

export function DocumentImport({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ImportStep>("upload")
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DocumentImportResponse | null>(null)
  const [selections, setSelections] = useState<ResourceSelection[]>([])
  const [saveProgress, setSaveProgress] = useState({ saved: 0, total: 0 })
  const [saveErrors, setSaveErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const patientId = smartAuth.getToken()?.patient as string | undefined

  const processFile = useCallback(async (file: File) => {
    if (!patientId) {
      setError("No patient context — cannot import documents without a patient ID.")
      return
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.")
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

    // Save accepted resources (use edited version if available)
    for (let i = 0; i < toSave.length; i++) {
      const resourceData = toSave[i].editedResource ?? toSave[i].resource.resource
      try {
        await createResource(resourceData as { resourceType: string })
        setSaveProgress(p => ({ ...p, saved: p.saved + 1 }))
      } catch (err) {
        errors.push(
          `${toSave[i].resource.resourceType}: ${err instanceof Error ? err.message : "Failed"}`
        )
      }
    }

    // Save DocumentReference only when resources were accepted
    if (result?.documentReference) {
      try {
        await createResource(result.documentReference as { resourceType: string })
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
  }, [selections, result, patientId])

  const selectedCount = selections.filter(s => s.selected).length

  // ── Upload step ────────────────────────────────────────────────────────────

  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="size-4" />
            Import Medical Document
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
            <p className="text-sm font-medium">Drop a PDF here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              Lab reports, discharge summaries, prescriptions, etc.
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
              Cancel
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
            Processing Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Extracting text, generating FHIR resources, and validating...
            </p>
            <p className="text-xs text-muted-foreground text-center">
              This may take a minute for large documents.
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
                  {result.pagesProcessed} page{result.pagesProcessed !== 1 ? "s" : ""} processed
                  {" · "}
                  {result.resources.length} resource{result.resources.length !== 1 ? "s" : ""} extracted
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
                  {selectedCount === selections.length ? "Deselect All" : "Select All"}
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
                Failed to Extract ({result.failed.length})
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
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedCount} of {selections.length} selected
            </span>
            <Button
              size="sm"
              disabled={selectedCount === 0}
              onClick={handleConfirm}
            >
              <Check className="size-4" />
              Save {selectedCount} Resource{selectedCount !== 1 ? "s" : ""}
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
            Saving Resources
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
              {saveProgress.saved} of {saveProgress.total} saved...
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
            {hasErrors ? "Import Completed with Errors" : "Import Complete"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {saveProgress.saved - saveErrors.length} resource{saveProgress.saved - saveErrors.length !== 1 ? "s" : ""} saved
            to your health record.
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
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
