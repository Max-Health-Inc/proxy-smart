import { useState, useCallback, useEffect } from "react"
import type { Patient, Task } from "fhir/r4"
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Badge, Spinner } from "@max-health-inc/shared-ui"
import {
  buildAccessRequestTask,
  type AccessRequestDraft,
} from "@/lib/task-builder"
import { RESOURCE_TYPE_OPTIONS } from "@/lib/consent-builder"
import { searchPatients, formatHumanName } from "@/lib/fhir-client"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  User,
  Eye,
  Clock,
  Send,
  FileText,
} from "lucide-react"
import { format } from "date-fns"

type Step = "patient" | "resources" | "period" | "review"
const STEPS: Step[] = ["patient", "resources", "period", "review"]

interface AccessRequestFormProps {
  practitionerId: string
  practitionerDisplay: string
  onSubmit: (task: Task) => Promise<void>
  onCancel: () => void
}

export function AccessRequestForm({
  practitionerId,
  practitionerDisplay,
  onSubmit,
  onCancel,
}: AccessRequestFormProps) {
  const [step, setStep] = useState<Step>("patient")
  const [submitting, setSubmitting] = useState(false)

  // Patient search
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  // Request details
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>([
    "Observation",
    "Condition",
    "MedicationRequest",
  ])
  const [action, setAction] = useState<"access" | "disclose">("access")
  const [periodStart, setPeriodStart] = useState(() => format(new Date(), "yyyy-MM-dd"))
  const [periodEnd, setPeriodEnd] = useState(() =>
    format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  )
  const [reason, setReason] = useState("")

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    try {
      const results = await searchPatients(searchQuery)
      setPatients(results)
    } catch {
      setPatients([])
    } finally {
      setSearchLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    // Auto-search on mount with empty query to show available patients
    searchPatients("").then(setPatients).catch(() => {})
  }, [])

  const stepIndex = STEPS.indexOf(step)
  const canGoNext =
    step === "patient"
      ? selectedPatient !== null
      : step === "resources"
        ? selectedResourceTypes.length > 0
        : step === "period"
          ? periodStart !== ""
          : true

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
    if (!selectedPatient?.id) return
    setSubmitting(true)
    try {
      const draft: AccessRequestDraft = {
        patientId: selectedPatient.id,
        patientDisplay: formatHumanName(selectedPatient.name),
        practitionerId,
        practitionerDisplay,
        resourceTypes: selectedResourceTypes,
        action,
        periodStart,
        periodEnd: periodEnd || undefined,
        reason: reason || undefined,
      }
      const task = buildAccessRequestTask(draft)
      await onSubmit(task)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleResourceType = (code: string) => {
    setSelectedResourceTypes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
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
          <h2 className="text-xl font-semibold">Request Data Access</h2>
          <p className="text-sm text-muted-foreground">
            Step {stepIndex + 1} of {STEPS.length}
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

      {/* Step 1: Patient selection */}
      {step === "patient" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Select Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search patients by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchLoading}>
                {searchLoading ? <Spinner size="sm" /> : <Search className="size-4" />}
              </Button>
            </div>

            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {patients.map((patient) => {
                const isSelected = selectedPatient?.id === patient.id
                return (
                  <button
                    key={patient.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/30"
                    }`}
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <User className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{formatHumanName(patient.name)}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.birthDate && `Born ${patient.birthDate}`}
                        {patient.identifier?.[0]?.value && ` · MRN: ${patient.identifier[0].value}`}
                      </p>
                    </div>
                    {isSelected && <Check className="size-5 text-primary shrink-0" />}
                  </button>
                )
              })}
              {patients.length === 0 && !searchLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Search for a patient to request access.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Resource types + action */}
      {step === "resources" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="size-5" />
              Select Data Types & Action
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-3 block">Resource Types</Label>
              <div className="flex flex-wrap gap-2">
                {RESOURCE_TYPE_OPTIONS.map(({ code, label }) => (
                  <Badge
                    key={code}
                    variant={selectedResourceTypes.includes(code) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleResourceType(code)}
                  >
                    {selectedResourceTypes.includes(code) && <Check className="size-3 mr-1" />}
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Action</Label>
              <div className="flex gap-2">
                {(["access", "disclose"] as const).map((a) => (
                  <Badge
                    key={a}
                    variant={action === a ? "default" : "outline"}
                    className="cursor-pointer select-none capitalize"
                    onClick={() => setAction(a)}
                  >
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Period + reason */}
      {step === "period" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Access Period & Reason
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Start Date</Label>
                <Input
                  id="start"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end">End Date</Label>
                <Input
                  id="end"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Reason for Access (optional)</Label>
              <Input
                id="reason"
                placeholder="e.g. Referral consultation, follow-up care..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === "review" && selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Review Access Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium">{formatHumanName(selectedPatient.name)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requester</span>
                <span className="font-medium">{practitionerDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Action</span>
                <Badge variant="outline" className="capitalize">{action}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Resource Types</span>
                <div className="flex flex-wrap gap-1">
                  {selectedResourceTypes.map((rt) => (
                    <Badge key={rt} variant="secondary" className="text-xs">{rt}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Period</span>
                <span>{periodStart} — {periodEnd || "No expiry"}</span>
              </div>
              {reason && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reason</span>
                  <span>{reason}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="size-4" />
          {stepIndex === 0 ? "Cancel" : "Back"}
        </Button>

        {step === "review" ? (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Spinner size="sm" /> : <Send className="size-4" />}
            Send Request
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
