import { useState, useCallback, useEffect } from "react"
import type { Consent, Practitioner } from "fhir/r4"
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Badge, Spinner } from "@proxy-smart/shared-ui"
import { usePractitioners } from "@/hooks/usePractitioners"
import { buildR4Consent, RESOURCE_TYPE_OPTIONS, type ConsentDraft } from "@/lib/consent-builder"
import { formatHumanName } from "@/lib/fhir-client"
import { ArrowLeft, ArrowRight, Check, Search, FileJson, User, Eye, Clock } from "lucide-react"
import { format } from "date-fns"

type Step = "practitioner" | "resources" | "period" | "review"
const STEPS: Step[] = ["practitioner", "resources", "period", "review"]

interface ConsentBuilderProps {
  patientId: string
  patientDisplay: string
  personReference: string
  onSubmit: (consent: Consent) => Promise<void>
  onCancel: () => void
}

export function ConsentBuilder({
  patientId,
  patientDisplay,
  personReference,
  onSubmit,
  onCancel,
}: ConsentBuilderProps) {
  const [step, setStep] = useState<Step>("practitioner")
  const [submitting, setSubmitting] = useState(false)

  // Draft state
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null)
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>([
    "Observation",
    "Condition",
    "MedicationRequest",
  ])
  const [action, setAction] = useState<"access" | "disclose">("access")
  const [periodStart, setPeriodStart] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [periodEnd, setPeriodEnd] = useState(() =>
    format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  )

  // Practitioner search
  const { practitioners, loading: searchLoading, search } = usePractitioners()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = useCallback(() => {
    search(searchQuery)
  }, [search, searchQuery])

  // Load practitioners on mount (shows all in demo mode)
  useEffect(() => {
    search("")
  }, [search])

  const stepIndex = STEPS.indexOf(step)
  const canGoNext =
    step === "practitioner" ? selectedPractitioner !== null :
    step === "resources" ? selectedResourceTypes.length > 0 :
    step === "period" ? periodStart !== "" :
    true
  
  const goNext = () => {
    const nextIdx = stepIndex + 1
    if (nextIdx < STEPS.length) setStep(STEPS[nextIdx])
  }
  
  const goBack = () => {
    const prevIdx = stepIndex - 1
    if (prevIdx >= 0) setStep(STEPS[prevIdx])
    else onCancel()
  }

  const handleSubmit = async () => {
    if (!selectedPractitioner?.id) return
    setSubmitting(true)
    try {
      const draft: ConsentDraft = {
        patientId,
        practitionerId: selectedPractitioner.id,
        practitionerDisplay: formatHumanName(selectedPractitioner.name),
        resourceTypes: selectedResourceTypes,
        action,
        periodStart,
        periodEnd: periodEnd || undefined,
      }
      const consent = buildR4Consent(draft, personReference)
      await onSubmit(consent)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleResourceType = (code: string) => {
    setSelectedResourceTypes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">New Consent</h2>
          <p className="text-sm text-muted-foreground">
            For {patientDisplay} &middot; Step {stepIndex + 1} of {STEPS.length}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= stepIndex ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Practitioner selection */}
      {step === "practitioner" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Select Practitioner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search practitioners by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchLoading}>
                {searchLoading ? <Spinner size="sm" /> : <Search className="size-4" />}
              </Button>
            </div>

            <div className="space-y-2">
              {practitioners.map((p) => {
                const isSelected = selectedPractitioner?.id === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPractitioner(p)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <p className="font-medium">{formatHumanName(p.name)}</p>
                    {p.qualification?.[0]?.code?.text && (
                      <p className="text-sm text-muted-foreground">{p.qualification[0].code.text}</p>
                    )}
                  </button>
                )
              })}
              {!searchLoading && practitioners.length === 0 && searchQuery && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No practitioners found. Try a different search term.
                </p>
              )}
            </div>

            {selectedPractitioner && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium">Selected:</p>
                <p>{formatHumanName(selectedPractitioner.name)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Resource types */}
      {step === "resources" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="size-5" />
              Access Scope
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-3">Resource Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {RESOURCE_TYPE_OPTIONS.map(({ code, label }) => {
                  const checked = selectedResourceTypes.includes(code)
                  return (
                    <button
                      key={code}
                      onClick={() => toggleResourceType(code)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors ${
                        checked
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <div
                        className={`size-4 rounded border flex items-center justify-center ${
                          checked ? "bg-primary border-primary" : "border-input"
                        }`}
                      >
                        {checked && <Check className="size-3 text-primary-foreground" />}
                      </div>
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label className="mb-2">Action</Label>
              <div className="flex gap-2">
                {(["access", "disclose"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAction(a)}
                    className={`px-4 py-2 rounded-lg border text-sm capitalize transition-colors ${
                      action === a
                        ? "border-primary bg-primary/5"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {a === "access" ? "Read Only" : "Read + Share"}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Period */}
      {step === "period" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Time Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start" className="mb-2">Start Date</Label>
                <Input
                  id="start"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end" className="mb-2">End Date</Label>
                <Input
                  id="end"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty for no expiry</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="size-5" />
              Review Consent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium">{patientDisplay}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Practitioner</span>
                <span className="font-medium">
                  {selectedPractitioner ? formatHumanName(selectedPractitioner.name) : "—"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Action</span>
                <span className="capitalize font-medium">
                  {action === "access" ? "Read Only" : "Read + Share"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Period</span>
                <span className="font-medium">
                  {periodStart} — {periodEnd || "No expiry"}
                </span>
              </div>
              <div className="py-2">
                <span className="text-muted-foreground block mb-2">Resource Types</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedResourceTypes.map((rt) => (
                    <Badge key={rt} variant="outline">
                      {rt}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <pre className="text-xs overflow-auto max-h-48 bg-muted p-4 rounded-lg">
              {JSON.stringify(
                selectedPractitioner?.id
                  ? buildR4Consent(
                      {
                        patientId,
                        practitionerId: selectedPractitioner.id,
                        practitionerDisplay: formatHumanName(selectedPractitioner.name),
                        resourceTypes: selectedResourceTypes,
                        action,
                        periodStart,
                        periodEnd: periodEnd || undefined,
                      },
                      personReference
                    )
                  : {},
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack}>
          {stepIndex === 0 ? "Cancel" : "Back"}
        </Button>
        {step === "review" ? (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Spinner size="sm" /> : <Check className="size-4" />}
            Create Consent
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canGoNext}>
            Next
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
