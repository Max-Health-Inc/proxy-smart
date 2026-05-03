import { useState, useMemo } from "react"
import type {
  Patient,
  Questionnaire,
  QuestionnaireResponse,
  QuestionnaireItem,
  QuestionnaireResponseItem,
} from "fhir/r4"
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Badge } from "@max-health-inc/shared-ui"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@max-health-inc/shared-ui"
import { formatHumanName } from "@/lib/fhir-client"
import { type SelectedService } from "@/components/ServiceSelector"
import { GENERIC_PA_ITEMS } from "@/lib/generic-questionnaire"
import { getItemExtensions, type ItemExtensions } from "@/lib/dtr-extensions"
import type { QuestionnaireAnswersStatusCode } from "hl7.fhir.us.davinci-dtr-generated/valuesets/ValueSet-QuestionnaireAnswersStatus"
import { ArrowRight, FileQuestion, Info, HelpCircle, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"

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
  const items = useMemo<QuestionnaireItem[]>(
    () => questionnaire?.item ?? GENERIC_PA_ITEMS,
    [questionnaire]
  )

  const [answers, setAnswers] = useState<AnswerMap>(() => {
    const map = new Map<string, string>()
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
      status: "completed" satisfies QuestionnaireAnswersStatusCode,
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
              answers={answers}
              onChangeNested={updateAnswer}
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

// ── Individual item renderer with DTR extension awareness ────────────────────

interface QuestionnaireItemFieldProps {
  item: QuestionnaireItem
  value: string
  onChange: (value: string) => void
  answers: AnswerMap
  onChangeNested: (linkId: string, value: string) => void
}

function QuestionnaireItemField({ item, value, onChange, answers, onChangeNested }: QuestionnaireItemFieldProps) {
  const ext = getItemExtensions(item)
  const [collapsed, setCollapsed] = useState(ext.collapsible === "default-closed")

  // Hidden items: skip rendering entirely
  if (ext.hidden) return null

  const required = item.required ?? false
  const labelText = ext.shortText ?? item.text ?? item.linkId
  const label = `${labelText}${required ? " *" : ""}`

  // Display items with category-aware styling
  if (item.type === "display") {
    return <DisplayItem text={item.text} category={ext.displayCategory} supportLinks={ext.supportLinks} />
  }

  // Group items with collapsible support
  if (item.type === "group") {
    return (
      <GroupItem
        item={item}
        ext={ext}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        answers={answers}
        onChangeNested={onChangeNested}
      />
    )
  }

  // Render based on item control extension first, then fall back to type
  const control = ext.itemControl

  if (item.type === "boolean") {
    return <BooleanField label={label} value={value} onChange={onChange} />
  }

  if (item.type === "choice" || item.type === "open-choice") {
    if (control === "radio-button") {
      return <RadioField item={item} label={label} value={value} onChange={onChange} ext={ext} />
    }
    if (control === "check-box") {
      return <CheckboxField item={item} label={label} value={value} onChange={onChange} ext={ext} />
    }
    if (control === "autocomplete") {
      return <AutocompleteField item={item} label={label} value={value} onChange={onChange} />
    }
    // Default: dropdown
    return <ChoiceField item={item} label={label} value={value} onChange={onChange} />
  }

  if (item.type === "date") {
    return <DateField label={label} value={value} onChange={onChange} ext={ext} />
  }

  if (item.type === "integer" || item.type === "decimal") {
    if (control === "slider") {
      return <SliderField label={label} value={value} onChange={onChange} ext={ext} itemType={item.type} />
    }
    return <NumericField label={label} value={value} onChange={onChange} ext={ext} itemType={item.type} />
  }

  if (item.type === "text") {
    return <TextAreaField label={label} value={value} onChange={onChange} ext={ext} />
  }

  // string, url, reference, etc.
  return <StringField label={label} value={value} onChange={onChange} ext={ext} />
}

// ── Typed field components ───────────────────────────────────────────────────

function DisplayItem({ text, category, supportLinks }: { text?: string; category?: string; supportLinks: string[] }) {
  const baseClass = "text-sm p-3 rounded-md"
  const categoryClass =
    category === "instructions" ? `${baseClass} bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-900` :
    category === "help" ? `${baseClass} bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900` :
    category === "security" ? `${baseClass} bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900` :
    `${baseClass} text-muted-foreground bg-muted/50`

  const icon = category === "help" ? <HelpCircle className="size-4 shrink-0 mt-0.5" /> : category === "instructions" ? <Info className="size-4 shrink-0 mt-0.5" /> : null

  return (
    <div className={categoryClass}>
      <div className="flex gap-2">
        {icon}
        <span>{text}</span>
      </div>
      {supportLinks.length > 0 && (
        <div className="flex gap-2 mt-2">
          {supportLinks.map((link, i) => (
            <a key={i} href={link} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs underline hover:no-underline">
              More info <ExternalLink className="size-3" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function GroupItem({ item, ext, collapsed, onToggle, answers, onChangeNested }: {
  item: QuestionnaireItem; ext: ItemExtensions; collapsed: boolean
  onToggle: () => void; answers: AnswerMap; onChangeNested: (linkId: string, value: string) => void
}) {
  const isCollapsible = !!ext.collapsible
  const CollapseIcon = collapsed ? ChevronRight : ChevronDown

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className={`flex items-center gap-2 p-3 bg-muted/30 ${isCollapsible ? "cursor-pointer hover:bg-muted/50" : ""}`}
        onClick={isCollapsible ? onToggle : undefined}
      >
        {isCollapsible && <CollapseIcon className="size-4 text-muted-foreground" />}
        <h4 className="text-sm font-medium">{item.text}</h4>
        {item.required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
      </div>
      {(!isCollapsible || !collapsed) && (
        <div className="p-3 space-y-4">
          {item.item?.map((child) => (
            <QuestionnaireItemField
              key={child.linkId}
              item={child}
              value={answers.get(child.linkId) ?? ""}
              onChange={(v) => onChangeNested(child.linkId, v)}
              answers={answers}
              onChangeNested={onChangeNested}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BooleanField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
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
}

function ChoiceField({ item, label, value, onChange }: {
  item: QuestionnaireItem; label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {item.answerOption?.map((opt, i) => {
            const display = opt.valueCoding?.display ?? opt.valueString ?? opt.valueCoding?.code ?? `Option ${i + 1}`
            const val = opt.valueCoding?.code ?? opt.valueString ?? display
            return <SelectItem key={val} value={val}>{display}</SelectItem>
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

function RadioField({ item, label, value, onChange, ext }: {
  item: QuestionnaireItem; label: string; value: string; onChange: (v: string) => void; ext: ItemExtensions
}) {
  const horizontal = ext.choiceOrientation === "horizontal"
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className={horizontal ? "flex flex-wrap gap-4" : "space-y-2"}>
        {item.answerOption?.map((opt, i) => {
          const display = opt.valueCoding?.display ?? opt.valueString ?? opt.valueCoding?.code ?? `Option ${i + 1}`
          const val = opt.valueCoding?.code ?? opt.valueString ?? display
          return (
            <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio" name={item.linkId} value={val} checked={value === val}
                onChange={() => onChange(val)}
                className="accent-primary size-4"
              />
              {display}
            </label>
          )
        })}
      </div>
    </div>
  )
}

function CheckboxField({ item, label, value, onChange, ext }: {
  item: QuestionnaireItem; label: string; value: string; onChange: (v: string) => void; ext: ItemExtensions
}) {
  const selected = value ? value.split(",") : []
  const horizontal = ext.choiceOrientation === "horizontal"

  const toggle = (val: string) => {
    const next = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]
    onChange(next.join(","))
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className={horizontal ? "flex flex-wrap gap-4" : "space-y-2"}>
        {item.answerOption?.map((opt, i) => {
          const display = opt.valueCoding?.display ?? opt.valueString ?? opt.valueCoding?.code ?? `Option ${i + 1}`
          const val = opt.valueCoding?.code ?? opt.valueString ?? display
          return (
            <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox" checked={selected.includes(val)}
                onChange={() => toggle(val)}
                className="accent-primary size-4"
              />
              {display}
            </label>
          )
        })}
      </div>
    </div>
  )
}

function AutocompleteField({ item, label, value, onChange }: {
  item: QuestionnaireItem; label: string; value: string; onChange: (v: string) => void
}) {
  const listId = `${item.linkId}-list`
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        list={listId} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Type to search..."
      />
      <datalist id={listId}>
        {item.answerOption?.map((opt, i) => {
          const display = opt.valueCoding?.display ?? opt.valueString ?? opt.valueCoding?.code ?? `Option ${i + 1}`
          const val = opt.valueCoding?.code ?? opt.valueString ?? display
          return <option key={val} value={val}>{display}</option>
        })}
      </datalist>
    </div>
  )
}

function DateField({ label, value, onChange, ext }: {
  label: string; value: string; onChange: (v: string) => void; ext: ItemExtensions
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
      {ext.entryFormat && (
        <p className="text-xs text-muted-foreground">Format: {ext.entryFormat}</p>
      )}
    </div>
  )
}

function NumericField({ label, value, onChange, ext, itemType }: {
  label: string; value: string; onChange: (v: string) => void; ext: ItemExtensions; itemType: string
}) {
  const step = itemType === "decimal"
    ? ext.maxDecimalPlaces ? `0.${"0".repeat(ext.maxDecimalPlaces - 1)}1` : "0.01"
    : "1"
  const unit = ext.unit

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number" step={step}
          min={ext.minValue} max={ext.maxValue}
          value={value} onChange={(e) => onChange(e.target.value)}
        />
        {unit && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {unit.display ?? unit.code}
          </span>
        )}
      </div>
      {(ext.minValue !== undefined || ext.maxValue !== undefined) && (
        <p className="text-xs text-muted-foreground">
          {ext.minValue !== undefined && ext.maxValue !== undefined
            ? `Range: ${ext.minValue} – ${ext.maxValue}`
            : ext.minValue !== undefined ? `Minimum: ${ext.minValue}` : `Maximum: ${ext.maxValue}`}
          {unit ? ` ${unit.display ?? unit.code}` : ""}
        </p>
      )}
    </div>
  )
}

function SliderField({ label, value, onChange, ext, itemType }: {
  label: string; value: string; onChange: (v: string) => void; ext: ItemExtensions; itemType: string
}) {
  const min = ext.minValue ?? 0
  const max = ext.maxValue ?? 100
  const step = ext.sliderStep ?? (itemType === "decimal" ? 0.1 : 1)
  const unit = ext.unit

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-medium tabular-nums">
          {value || min}{unit ? ` ${unit.display ?? unit.code}` : ""}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value || String(min)}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function TextAreaField({ label, value, onChange, ext }: {
  label: string; value: string; onChange: (v: string) => void; ext: ItemExtensions
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <textarea
        className="flex w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ext.entryFormat ?? ""}
        minLength={ext.minLength}
      />
      {ext.entryFormat && <p className="text-xs text-muted-foreground">Format: {ext.entryFormat}</p>}
    </div>
  )
}

function StringField({ label, value, onChange, ext }: {
  label: string; value: string; onChange: (v: string) => void; ext: ItemExtensions
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ext.entryFormat ?? ""}
        minLength={ext.minLength}
      />
      {ext.entryFormat && <p className="text-xs text-muted-foreground">Format: {ext.entryFormat}</p>}
    </div>
  )
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
      case "open-choice":
        responseItem.answer = value.split(",").map((v) => ({
          valueCoding: {
            code: v.trim(),
            display: item.answerOption?.find((o) => o.valueCoding?.code === v.trim())?.valueCoding?.display ?? v.trim(),
          },
        }))
        break
      default:
        responseItem.answer = [{ valueString: value }]
    }
  }

  if (item.item?.length) {
    const children = item.item
      .map((child) => buildResponseItem(child, answers))
      .filter(Boolean) as QuestionnaireResponseItem[]
    if (children.length > 0) responseItem.item = children
  }

  return responseItem
}
