import { useState, useCallback, useRef } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
} from "@proxy-smart/shared-ui"
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Heart,
  ShieldAlert,
  Pill,
  Syringe,
  TestTubes,
  Stethoscope,
  ClipboardList,
  Check,
  X,
} from "lucide-react"
import { smartAuth } from "@/lib/smart-auth"
import {
  importDocument,
  createResource,
  type ImportedResource,
  type FailedResource,
  type DocumentImportResponse,
} from "@/lib/fhir-client"
import { format } from "date-fns"

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

// ── Helpers to extract display text from FHIR resources ──────────────────────

function getResourceTitle(resource: Record<string, unknown>): string {
  const rt = resource.resourceType as string

  // CodeableConcept-based resources
  const code = resource.code as { coding?: { display?: string }[]; text?: string } | undefined
  if (code) {
    return code.coding?.[0]?.display || code.text || `Unknown ${rt}`
  }

  // MedicationRequest / MedicationStatement
  const medCode = resource.medicationCodeableConcept as { coding?: { display?: string }[]; text?: string } | undefined
  if (medCode) {
    return medCode.coding?.[0]?.display || medCode.text || `Unknown medication`
  }

  // Immunization
  const vaccineCode = resource.vaccineCode as { coding?: { display?: string }[]; text?: string } | undefined
  if (vaccineCode) {
    return vaccineCode.coding?.[0]?.display || vaccineCode.text || `Unknown vaccine`
  }

  return `${rt} resource`
}

function getResourceDetail(resource: Record<string, unknown>): string | null {
  // Condition onset
  if (resource.onsetDateTime) {
    return `Onset: ${formatDate(resource.onsetDateTime as string)}`
  }

  // Medication dosage
  const dosage = resource.dosageInstruction as { text?: string }[] | undefined
  if (dosage?.[0]?.text) return dosage[0].text

  const dosageStmt = resource.dosage as { text?: string }[] | undefined
  if (dosageStmt?.[0]?.text) return dosageStmt[0].text

  // Observation value
  const valueQuantity = resource.valueQuantity as { value?: number; unit?: string } | undefined
  if (valueQuantity?.value != null) {
    return `${valueQuantity.value} ${valueQuantity.unit ?? ""}`
  }
  const valueString = resource.valueString as string | undefined
  if (valueString) return valueString

  // Allergy reaction
  const reaction = resource.reaction as { manifestation?: { coding?: { display?: string }[] }[] }[] | undefined
  if (reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display) {
    return `Reaction: ${reaction[0].manifestation[0].coding[0].display}`
  }

  // Date
  if (resource.authoredOn) return `Authored: ${formatDate(resource.authoredOn as string)}`
  if (resource.occurrenceDateTime) return formatDate(resource.occurrenceDateTime as string)

  return null
}

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "MMM d, yyyy")
  } catch {
    return iso
  }
}

// ── State machine ────────────────────────────────────────────────────────────

type ImportStep = "upload" | "processing" | "review" | "saving" | "done"

interface ResourceSelection {
  resource: ImportedResource
  selected: boolean
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

  const handleConfirm = useCallback(async () => {
    const toSave = selections.filter(s => s.selected)
    if (toSave.length === 0) return

    setStep("saving")
    setSaveProgress({ saved: 0, total: toSave.length + 1 }) // +1 for DocumentReference
    const errors: string[] = []

    for (let i = 0; i < toSave.length; i++) {
      try {
        await createResource(toSave[i].resource.resource as { resourceType: string })
        setSaveProgress(p => ({ ...p, saved: p.saved + 1 }))
      } catch (err) {
        errors.push(
          `${toSave[i].resource.resourceType}: ${err instanceof Error ? err.message : "Failed"}`
        )
      }
    }

    // Save the DocumentReference wrapping the original PDF
    if (result?.documentReference) {
      try {
        await createResource(result.documentReference as { resourceType: string })
        setSaveProgress(p => ({ ...p, saved: p.saved + 1 }))
      } catch (err) {
        errors.push(`DocumentReference: ${err instanceof Error ? err.message : "Failed"}`)
      }
    }

    setSaveErrors(errors)
    setStep("done")
  }, [selections, result])

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
          {selections.map((sel, i) => {
            const r = sel.resource
            const Icon = RESOURCE_ICONS[r.resourceType] || FileText
            const color = RESOURCE_COLORS[r.resourceType] || "text-gray-500"

            return (
              <Card
                key={i}
                className={`cursor-pointer transition-all ${
                  sel.selected
                    ? "ring-2 ring-primary/50"
                    : "opacity-60"
                }`}
                onClick={() => toggleSelection(i)}
              >
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${sel.selected ? "text-primary" : "text-muted-foreground"}`}>
                      {sel.selected ? <CheckCircle2 className="size-5" /> : <div className="size-5 rounded-full border-2 border-muted-foreground/30" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`size-4 ${color}`} />
                        <Badge variant="outline" className="text-xs">
                          {r.resourceType}
                        </Badge>
                        {r.retriesNeeded > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {r.retriesNeeded} fix{r.retriesNeeded !== 1 ? "es" : ""}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1 truncate">
                        {getResourceTitle(r.resource as Record<string, unknown>)}
                      </p>
                      {getResourceDetail(r.resource as Record<string, unknown>) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {getResourceDetail(r.resource as Record<string, unknown>)}
                        </p>
                      )}
                      {r.warnings.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="size-3 text-amber-500" />
                          <span className="text-xs text-amber-600">{r.warnings.length} warning{r.warnings.length !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
