import { useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Spinner,
} from "@proxy-smart/shared-ui"
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  Check,
  X,
  XCircle,
} from "lucide-react"
import { smartAuth } from "@/lib/smart-auth"
import {
  scribeFromText,
  createResource,
  type ImportedResource,
  type FailedResource,
  type ScribeResponse,
} from "@/lib/fhir-client"
import { ResourceReviewCard } from "./ResourceReviewCard"

// ── State machine ────────────────────────────────────────────────────────────

type ScribeStep = "input" | "processing" | "review" | "saving" | "done"

interface ResourceSelection {
  resource: ImportedResource
  selected: boolean
  editedResource?: Record<string, unknown>
}

// ── Component ────────────────────────────────────────────────────────────────

export function PatientScribe({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ScribeStep>("input")
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScribeResponse | null>(null)
  const [selections, setSelections] = useState<ResourceSelection[]>([])
  const [saveProgress, setSaveProgress] = useState({ saved: 0, total: 0 })
  const [saveErrors, setSaveErrors] = useState<string[]>([])

  const patientId = smartAuth.getToken()?.patient as string | undefined

  const handleSubmit = useCallback(async () => {
    if (!patientId) {
      setError("No patient context — cannot use scribe without a patient ID.")
      return
    }
    if (!text.trim()) {
      setError("Please enter some text to process.")
      return
    }

    setError(null)
    setStep("processing")

    try {
      const res = await scribeFromText(text, patientId)
      setResult(res)
      setSelections(res.resources.map(r => ({ resource: r, selected: true })))
      setStep("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scribe failed")
      setStep("input")
    }
  }, [patientId, text])

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

    const totalSteps = toSave.length + (rejected.length > 0 ? 1 : 0)
    setStep("saving")
    setSaveProgress({ saved: 0, total: totalSteps })
    const errors: string[] = []

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
            code: "scribe-resource-rejection",
            display: "Patient Scribe Resource Rejection",
          }],
          action: "C",
          recorded: new Date().toISOString(),
          outcome: "0",
          outcomeDesc: `Patient declined ${rejected.length} resource(s) from scribe input`,
          agent: [{
            who: { reference: `Patient/${patientId}` },
            requestor: true,
          }],
          source: {
            observer: { display: "Patient Portal - Patient Scribe" },
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
  }, [selections, patientId])

  const selectedCount = selections.filter(s => s.selected).length

  // ── Input step ─────────────────────────────────────────────────────────────

  if (step === "input") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4" />
            Patient Scribe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Describe your symptoms, medications, allergies, or any health information in your own words.
            The AI will extract structured medical records for your review.
          </p>
          <textarea
            className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            placeholder="e.g. I've been taking metformin 500mg twice daily for type 2 diabetes since 2020. I'm also allergic to penicillin — I get hives. Last week my blood pressure was 135/85..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!text.trim()}>
              <Send className="size-4" />
              Extract Records
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
            Processing Your Input
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Analyzing your text and generating medical records...
            </p>
            <p className="text-xs text-muted-foreground text-center">
              This may take a moment.
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
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Scribe Results</p>
                <p className="text-xs text-muted-foreground">
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
            {hasErrors ? "Completed with Errors" : "Records Saved"}
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
