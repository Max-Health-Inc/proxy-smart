import { useState, useEffect } from "react"
import type { Questionnaire } from "fhir/r4"
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Badge, Spinner } from "@proxy-smart/shared-ui"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@proxy-smart/shared-ui"
import { searchConditions, searchQuestionnaires, searchCoverage, type Condition, type PASCoverage } from "@/lib/fhir-client"
import { COMMON_PROCEDURES, type ProcedureCode } from "@/lib/procedure-codes"
import { ArrowRight, Stethoscope, Shield } from "lucide-react"

export interface SelectedService {
  procedure: ProcedureCode
  diagnosis: Condition | null
  diagnosisText: string
  notes: string
}

interface ServiceSelectorProps {
  patientId: string
  onSelect: (service: SelectedService, questionnaire: Questionnaire | null) => void
}

export function ServiceSelector({ patientId, onSelect }: ServiceSelectorProps) {
  const [conditions, setConditions] = useState<Condition[]>([])
  const [coverage, setCoverage] = useState<PASCoverage | null>(null)
  const [loadingConditions, setLoadingConditions] = useState(true)
  const [selectedProcedure, setSelectedProcedure] = useState<string>("")
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string>("")
  const [diagnosisText, setDiagnosisText] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    searchConditions(patientId)
      .then(setConditions)
      .catch(() => setConditions([]))
      .finally(() => setLoadingConditions(false))
    searchCoverage(patientId)
      .then((c) => setCoverage(c[0] ?? null))
      .catch(() => {})
  }, [patientId])

  const handleContinue = async () => {
    const procedure = COMMON_PROCEDURES.find((p) => p.code === selectedProcedure)
    if (!procedure) return

    setSubmitting(true)
    try {
      // Try to find a matching Questionnaire for this procedure context
      const questionnaires = await searchQuestionnaires(procedure.code)
      const questionnaire = questionnaires[0] ?? null

      const diagnosis = conditions.find((c) => c.id === selectedDiagnosis) ?? null

      onSelect(
        {
          procedure,
          diagnosis,
          diagnosisText: diagnosisText || (diagnosis?.code?.coding?.[0]?.display ?? ""),
          notes,
        },
        questionnaire
      )
    } catch {
      // No questionnaire found — proceed with generic form
      const diagnosis = conditions.find((c) => c.id === selectedDiagnosis) ?? null
      onSelect(
        {
          procedure,
          diagnosis,
          diagnosisText: diagnosisText || (diagnosis?.code?.coding?.[0]?.display ?? ""),
          notes,
        },
        null
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="size-5" />
          Select Service Requiring Authorization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Coverage */}
        {coverage && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-primary/10">
            <Shield className="size-4 text-primary shrink-0" />
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="font-medium">{coverage.payor?.[0]?.display ?? "Payer"}</span>
              {coverage.class?.find(c => c.type?.coding?.[0]?.code === "plan")?.name && (
                <Badge variant="outline" className="text-xs font-normal">
                  {coverage.class!.find(c => c.type?.coding?.[0]?.code === "plan")!.name}
                </Badge>
              )}
              {coverage.identifier?.[0]?.value && (
                <Badge variant="secondary" className="text-xs font-normal font-mono">
                  {coverage.identifier[0].value}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Procedure */}
        <div className="space-y-2">
          <Label>Procedure / Service</Label>
          <Select value={selectedProcedure} onValueChange={setSelectedProcedure}>
            <SelectTrigger>
              <SelectValue placeholder="Select a procedure..." />
            </SelectTrigger>
            <SelectContent>
              {COMMON_PROCEDURES.map((proc) => (
                <SelectItem key={proc.code} value={proc.code}>
                  <span className="font-mono text-xs mr-2">{proc.code}</span>
                  {proc.display}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Diagnosis */}
        <div className="space-y-2">
          <Label>Diagnosis</Label>
          {loadingConditions ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size="sm" /> Loading patient conditions...
            </div>
          ) : conditions.length > 0 ? (
            <Select value={selectedDiagnosis} onValueChange={setSelectedDiagnosis}>
              <SelectTrigger>
                <SelectValue placeholder="Select from patient conditions..." />
              </SelectTrigger>
              <SelectContent>
                {conditions.map((c) => {
                  const display = c.code?.coding?.[0]?.display ?? c.code?.text ?? "Unknown"
                  const code = c.code?.coding?.[0]?.code ?? ""
                  return (
                    <SelectItem key={c.id} value={c.id!}>
                      {code && <span className="font-mono text-xs mr-2">{code}</span>}
                      {display}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Enter diagnosis (e.g., K08.1 — Loss of teeth due to extraction)"
              value={diagnosisText}
              onChange={(e) => setDiagnosisText(e.target.value)}
            />
          )}
        </div>

        {/* Clinical notes */}
        <div className="space-y-2">
          <Label>Clinical Notes (optional)</Label>
          <Input
            placeholder="Brief justification or relevant clinical details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selectedProcedure || submitting}
          className="w-full"
        >
          {submitting ? (
            <><Spinner size="sm" /> Finding documentation requirements...</>
          ) : (
            <>Continue to Documentation <ArrowRight className="size-4" /></>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
