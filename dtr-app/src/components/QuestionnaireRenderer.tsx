import { useState, useMemo } from "react"
import type {
  Patient,
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireItem,
  QuestionnaireResponseItem,
} from "fhir/r4"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatHumanName } from "@/lib/fhir-client"
import { type SelectedService } from "@/components/ServiceSelector"
import { GENERIC_PA_ITEMS } from "@/lib/generic-questionnaire"
import { ArrowRight, FileQuestion, Info } from "lucide-react"

interface QuestionnaireRendererProps {
  /** FHIR Questionnaire from payer — null if none found (use generic) */
  questionnaire: Questionnaire | null
  patient: Patient
  service: SelectedService
  onComplete: (response: QuestionnaireResponse) => void
}

type AnswerMap = Map<string, string>

export function QuestionnaireRenderer({
  questionnaire,
  patient,
  service,
  onComplete,
}: QuestionnaireRendererProps) {
  // Use the payer Questionnaire items or fall back to generic PA items
  const items = useMemo<QuestionnaireItem[]>(
    () => questionnaire?.item ?? GENERIC_PA_ITEMS,
    [questionnaire]
  )

  // Pre-populate answers from patient/service context (DTR auto-population)
  const [answers, setAnswers] = useState<AnswerMap>(() => {
    const map = new Map<string, string>()
    // Auto-fill what we can from context
    map.set("patient-name", formatHumanName(patient.name))
    map.set("patient-dob", patient.birthDate ?? "")
    map.set("patient-gender", patient.gender ?? "")
    map.set("patient-id", patient.identifier?.[0]?.value ?? patient.id ?? "")
    map.set("procedure-code", service.procedure.code)
    map.set("procedure-display", service.procedure.display)
    map.set("diagnosis", service.diagnosisText)
    map.set("clinical-notes", service.notes)
    return map
  })

  const updateAnswer = (linkId: string, value: string) => {
    setAnswers((prev) => {
      const next = new Map(prev)
      next.set(linkId, value)
      return next
    })
  }

  const handleSubmit = () => {
    const responseItems: QuestionnaireResponseItem[] = items
      .map((item) => buildResponseItem(item, answers))
      .filter(Boolean) as QuestionnaireResponseItem[]

    const qr: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      questionnaire: questionnaire?.url ?? questionnaire?.id
        ? `Questionnaire/${questionnaire?.id}`
        : undefined,
      status: "completed",
      subject: { reference: `Patient/${patient.id}` },
      authored: new Date().toISOString(),
      item: responseItems,
    }

    onComplete(qr)
  }

  const isGeneric = !questionnaire

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileQuestion className="size-5" />
          {questionnaire?.title ?? "Prior Authorization Documentation"}
        </CardTitle>
        {isGeneric && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Info className="size-3.5" />
            No payer-specific questionnaire found. Using standard PA documentation form.
          </div>
        )}
        {!isGeneric && (
          <Badge variant="outline" className="w-fit text-xs mt-1">
            Payer Questionnaire: {questionnaire.publisher ?? questionnaire.name ?? questionnaire.id}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-populated section */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Auto-populated from patient context
          </h3>
          <div className="grid grid-cols-2 gap-3 p-3 bg-accent/30 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Patient Name</p>
              <p className="text-sm font-medium">{answers.get("patient-name")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date of Birth</p>
              <p className="text-sm font-medium">{answers.get("patient-dob") || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Procedure</p>
              <p className="text-sm font-medium">
                {answers.get("procedure-code")} — {answers.get("procedure-display")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Diagnosis</p>
              <p className="text-sm font-medium">{answers.get("diagnosis") || "—"}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Questionnaire items */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Required Documentation
          </h3>
          {items.map((item) => (
            <QuestionnaireItemField
              key={item.linkId}
              item={item}
              value={answers.get(item.linkId) ?? ""}
              onChange={(v) => updateAnswer(item.linkId, v)}
            />
          ))}
        </div>

        <Button onClick={handleSubmit} className="w-full">
          Continue to Review <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Individual item renderer ─────────────────────────────────────────────────

interface QuestionnaireItemFieldProps {
  item: QuestionnaireItem
  value: string
  onChange: (value: string) => void
}

function QuestionnaireItemField({ item, value, onChange }: QuestionnaireItemFieldProps) {
  const required = item.required ?? false
  const labelText = `${item.text ?? item.linkId}${required ? " *" : ""}`

  switch (item.type) {
    case "display":
      return (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          {item.text}
        </div>
      )

    case "boolean":
      return (
        <div className="space-y-1">
          <Label>{labelText}</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )

    case "choice":
      return (
        <div className="space-y-1">
          <Label>{labelText}</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {item.answerOption?.map((opt, i) => {
                const display = opt.valueCoding?.display ?? opt.valueString ?? opt.valueCoding?.code ?? `Option ${i + 1}`
                const val = opt.valueCoding?.code ?? opt.valueString ?? display
                return (
                  <SelectItem key={val} value={val}>
                    {display}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      )

    case "date":
      return (
        <div className="space-y-1">
          <Label>{labelText}</Label>
          <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      )

    case "integer":
    case "decimal":
      return (
        <div className="space-y-1">
          <Label>{labelText}</Label>
          <Input
            type="number"
            step={item.type === "decimal" ? "0.01" : "1"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={item.text ?? ""}
          />
        </div>
      )

    case "text":
      return (
        <div className="space-y-1">
          <Label>{labelText}</Label>
          <textarea
            className="flex w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={item.text ?? ""}
          />
        </div>
      )

    // string, url, reference, etc.
    default:
      return (
        <div className="space-y-1">
          <Label>{labelText}</Label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={item.text ?? ""}
          />
        </div>
      )
  }
}

// ── Build response item from answers ─────────────────────────────────────────

function buildResponseItem(
  item: QuestionnaireItem,
  answers: AnswerMap
): QuestionnaireResponseItem | null {
  const value = answers.get(item.linkId)
  if (item.type === "display") return null
  if (!value && !item.item?.length) return null

  const responseItem: QuestionnaireResponseItem = {
    linkId: item.linkId,
    text: item.text,
  }

  if (value) {
    switch (item.type) {
      case "boolean":
        responseItem.answer = [{ valueBoolean: value === "true" }]
        break
      case "integer":
        responseItem.answer = [{ valueInteger: parseInt(value, 10) }]
        break
      case "decimal":
        responseItem.answer = [{ valueDecimal: parseFloat(value) }]
        break
      case "date":
        responseItem.answer = [{ valueDate: value }]
        break
      case "choice":
        responseItem.answer = [{
          valueCoding: {
            code: value,
            display: item.answerOption?.find((o) => o.valueCoding?.code === value)?.valueCoding?.display ?? value,
          },
        }]
        break
      default:
        responseItem.answer = [{ valueString: value }]
    }
  }

  // Nested items
  if (item.item?.length) {
    const children = item.item
      .map((child) => buildResponseItem(child, answers))
      .filter(Boolean) as QuestionnaireResponseItem[]
    if (children.length > 0) responseItem.item = children
  }

  return responseItem
}
