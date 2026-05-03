import { useState } from "react"
import type { Patient, Questionnaire, QuestionnaireResponse } from "fhir/r4"
import { Button, Badge } from "@proxy-smart/shared-ui"
import { toast } from "sonner"
import { ServiceSelector, type SelectedService } from "@/components/ServiceSelector"
import { QuestionnaireRenderer } from "@/components/QuestionnaireRenderer"
import { SmartFormsQuestionnaireRenderer } from "@/components/SmartFormsQuestionnaireRenderer"
import { PaReviewSubmit } from "@/components/PaReviewSubmit"
import { createQuestionnaireResponse, submitClaim } from "@/lib/fhir-client"
import { buildPasClaim } from "@/lib/pas-builder"
import { ArrowLeft, ArrowRight } from "lucide-react"

interface NewPaWorkflowProps {
  patient: Patient
  onComplete: () => void
}

type WorkflowStep = "service" | "documentation" | "review"

const STEPS: { key: WorkflowStep; label: string }[] = [
  { key: "service", label: "Service" },
  { key: "documentation", label: "Documentation" },
  { key: "review", label: "Review & Submit" },
]

export function NewPaWorkflow({ patient, onComplete }: NewPaWorkflowProps) {
  const [step, setStep] = useState<WorkflowStep>("service")
  const [selectedService, setSelectedService] = useState<SelectedService | null>(null)
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [questionnaireResponse, setQuestionnaireResponse] = useState<QuestionnaireResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const currentIndex = STEPS.findIndex((s) => s.key === step)

  const handleServiceSelect = (service: SelectedService, q: Questionnaire | null) => {
    setSelectedService(service)
    setQuestionnaire(q)
    setStep("documentation")
  }

  const handleDocumentationComplete = (qr: QuestionnaireResponse) => {
    setQuestionnaireResponse(qr)
    setStep("review")
  }

  const handleSubmit = async () => {
    if (!selectedService || !questionnaireResponse) return

    setSubmitting(true)
    try {
      // Save QuestionnaireResponse
      const savedQr = await createQuestionnaireResponse(questionnaireResponse)

      // Build and submit PAS Claim
      const claim = buildPasClaim({
        patient,
        service: selectedService,
        questionnaireResponseId: savedQr.id,
      })

      try {
        await submitClaim(claim)
        toast.success("Prior authorization submitted", {
          description: "Your PA request has been sent to the payer.",
        })
      } catch {
        // Claim/$submit may not be available on all servers — the QR was saved
        toast.success("Documentation saved", {
          description: "QuestionnaireResponse recorded. Claim/$submit not available on this server.",
        })
      }

      onComplete()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed"
      toast.error("Failed to submit", { description: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <Badge
              variant={i <= currentIndex ? "default" : "outline"}
              className="tabular-nums"
            >
              {i + 1}
            </Badge>
            <span className={`text-sm ${i <= currentIndex ? "font-medium" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <ArrowRight className="size-3.5 text-muted-foreground mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === "service" && (
        <ServiceSelector
          patientId={patient.id!}
          onSelect={handleServiceSelect}
        />
      )}

      {step === "documentation" && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setStep("service")}>
            <ArrowLeft className="size-4" /> Back to service selection
          </Button>
          {questionnaire ? (
            <SmartFormsQuestionnaireRenderer
              questionnaire={questionnaire}
              patient={patient}
              service={selectedService!}
              onComplete={handleDocumentationComplete}
            />
          ) : (
            <QuestionnaireRenderer
              questionnaire={null}
              patient={patient}
              service={selectedService!}
              onComplete={handleDocumentationComplete}
            />
          )}
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setStep("documentation")}>
            <ArrowLeft className="size-4" /> Back to documentation
          </Button>
          <PaReviewSubmit
            patient={patient}
            service={selectedService!}
            questionnaireResponse={questionnaireResponse!}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      )}
    </div>
  )
}
