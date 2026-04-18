import type { Patient, QuestionnaireResponse } from "fhir/r4"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Spinner, Separator } from "@proxy-smart/shared-ui"
import { formatHumanName, searchCoverage, type PASCoverage } from "@/lib/fhir-client"
import { getUSCoreDemographics } from "@/lib/patient-extensions"
import { type SelectedService } from "@/components/ServiceSelector"
import { Send, User, Stethoscope, FileText, CheckCircle, Shield } from "lucide-react"

interface PaReviewSubmitProps {
  patient: Patient
  service: SelectedService
  questionnaireResponse: QuestionnaireResponse
  onSubmit: () => Promise<void>
  submitting: boolean
}

export function PaReviewSubmit({
  patient,
  service,
  questionnaireResponse,
  onSubmit,
  submitting,
}: PaReviewSubmitProps) {
  const responseItems = questionnaireResponse.item ?? []
  const answeredCount = responseItems.filter((i) => i.answer?.length).length
  const { race, ethnicity, birthSexDisplay } = getUSCoreDemographics(patient)
  const [coverage, setCoverage] = useState<PASCoverage | null>(null)

  useEffect(() => {
    if (patient.id) {
      searchCoverage(patient.id).then((c) => setCoverage(c[0] ?? null)).catch(() => {})
    }
  }, [patient.id])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="size-5 text-emerald-500" />
          Review & Submit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient */}
        <div className="flex items-center gap-3">
          <User className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Patient</p>
            <p className="text-sm font-medium">{formatHumanName(patient.name)}</p>
            <div className="flex gap-2 mt-0.5 flex-wrap">
              {patient.birthDate && (
                <Badge variant="outline" className="text-xs font-normal">DOB: {patient.birthDate}</Badge>
              )}
              {patient.gender && (
                <Badge variant="outline" className="text-xs font-normal capitalize">{patient.gender}</Badge>
              )}
              {birthSexDisplay && birthSexDisplay !== patient.gender && (
                <Badge variant="outline" className="text-xs font-normal">Birth Sex: {birthSexDisplay}</Badge>
              )}
              {race?.text && (
                <Badge variant="secondary" className="text-xs font-normal">{race.text}</Badge>
              )}
              {ethnicity?.text && (
                <Badge variant="secondary" className="text-xs font-normal">{ethnicity.text}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Coverage */}
        {coverage && (
          <div className="flex items-center gap-3">
            <Shield className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Insurance</p>
              <p className="text-sm font-medium">{coverage.payor?.[0]?.display ?? "Payer"}</p>
              <div className="flex gap-2 mt-0.5 flex-wrap">
                {coverage.identifier?.[0]?.value && (
                  <Badge variant="outline" className="text-xs font-normal font-mono">
                    ID: {coverage.identifier[0].value}
                  </Badge>
                )}
                {coverage.class?.find(c => c.type?.coding?.[0]?.code === "plan")?.name && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {coverage.class.find(c => c.type?.coding?.[0]?.code === "plan")!.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Service */}
        <div className="flex items-center gap-3">
          <Stethoscope className="size-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Procedure Requested</p>
            <p className="text-sm font-medium">
              <span className="font-mono mr-1">{service.procedure.code}</span>
              {service.procedure.display}
            </p>
            {service.diagnosisText && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Diagnosis: {service.diagnosisText}
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Documentation summary */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium">Documentation</p>
            <Badge variant="outline" className="text-xs">
              {answeredCount} answer{answeredCount !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="space-y-2">
            {responseItems.map((item) => {
              if (!item.answer?.length) return null
              const answer = item.answer[0]
              const displayValue =
                answer.valueString ??
                answer.valueCoding?.display ??
                answer.valueDate ??
                (answer.valueBoolean !== undefined ? (answer.valueBoolean ? "Yes" : "No") : null) ??
                answer.valueInteger?.toString() ??
                answer.valueDecimal?.toString() ??
                "—"

              return (
                <div key={item.linkId} className="flex justify-between text-sm py-1">
                  <span className="text-muted-foreground">{item.text ?? item.linkId}</span>
                  <span className="font-medium max-w-[60%] text-right">{displayValue}</span>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        <Button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? (
            <><Spinner size="sm" /> Submitting to payer...</>
          ) : (
            <><Send className="size-4" /> Submit Prior Authorization</>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          This will submit a FHIR Claim resource with use=preauthorization to the payer endpoint via PAS (Da Vinci Prior Authorization Support).
        </p>
      </CardContent>
    </Card>
  )
}
