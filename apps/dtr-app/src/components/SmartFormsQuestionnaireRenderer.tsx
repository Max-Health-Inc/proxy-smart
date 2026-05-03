/**
 * Smart Forms Questionnaire Renderer
 *
 * SDC-compliant Questionnaire renderer powered by @aehrc/smart-forms-renderer.
 * Handles: enableWhen, calculatedExpression, repeating groups, choice/open-choice,
 * conditional display, answerValueSet, and all SDC item types.
 *
 * Pre-population strategy:
 * 1. Try FHIR server's Questionnaire/$populate (server-side CQL/FHIRPath)
 * 2. Fall back to Smart Forms' built-in SDC expression engine (initialExpression,
 *    calculatedExpression, x-fhir-query variables via FHIRPath)
 */
import { useState, useCallback, useEffect, useRef } from "react"
import type { Patient, Questionnaire, QuestionnaireResponse } from "fhir/r4"
import type { QuestionnaireAnswersStatusCode } from "hl7.fhir.us.davinci-dtr-generated/valuesets/ValueSet-QuestionnaireAnswersStatus"
import {
  BaseRenderer,
  useBuildForm,
  getResponse,
  removeEmptyAnswersFromResponse,
  RendererThemeProvider,
} from "@aehrc/smart-forms-renderer"
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Spinner } from "@max-health-inc/shared-ui"
import { type SelectedService } from "@/components/ServiceSelector"
import { prePopulate, type PrePopulationResult } from "@/lib/questionnaire-populate"
import { ArrowRight, FileQuestion, Sparkles, Zap } from "lucide-react"

interface SmartFormsQuestionnaireRendererProps {
  questionnaire: Questionnaire
  patient: Patient
  service: SelectedService
  onComplete: (response: QuestionnaireResponse) => void
}

export function SmartFormsQuestionnaireRenderer({
  questionnaire,
  patient,
  service,
  onComplete,
}: SmartFormsQuestionnaireRendererProps) {
  const [prePopResult, setPrePopResult] = useState<PrePopulationResult | null>(null)
  const [prePopulating, setPrePopulating] = useState(true)
  const prePopRan = useRef(false)

  // Try server-side $populate on mount
  useEffect(() => {
    if (prePopRan.current) return
    prePopRan.current = true

    async function runPrePopulation() {
      try {
        const result = await prePopulate(questionnaire, patient)
        setPrePopResult(result)
      } catch (err) {
        console.warn("[SmartForms] $populate failed, continuing without:", err)
        setPrePopResult({
          questionnaireResponse: {
            resourceType: "QuestionnaireResponse",
            questionnaire: questionnaire.url ?? `Questionnaire/${questionnaire.id}`,
            status: "in-progress" satisfies QuestionnaireAnswersStatusCode,
            subject: { reference: `Patient/${patient.id}` },
            authored: new Date().toISOString(),
            item: [],
          },
          serverPopulated: false,
        })
      } finally {
        setPrePopulating(false)
      }
    }

    runPrePopulation()
  }, [questionnaire, patient])

  if (prePopulating || !prePopResult) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner className="size-6" />
          <p className="text-sm text-muted-foreground">
            Loading questionnaire and pre-populating from patient data...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <SmartFormsRendererInner
      questionnaire={questionnaire}
      patient={patient}
      service={service}
      prePopResult={prePopResult}
      onComplete={onComplete}
    />
  )
}

/** Inner component — rendered after pre-population completes */
function SmartFormsRendererInner({
  questionnaire,
  patient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  service,
  prePopResult,
  onComplete,
}: SmartFormsQuestionnaireRendererProps & { prePopResult: PrePopulationResult }) {
  const isBuilding = useBuildForm({
    questionnaire,
    questionnaireResponse: prePopResult.questionnaireResponse,
  })

  const handleSubmit = useCallback(() => {
    const response = getResponse()
    if (!response) return

    // Clean up empty answers and internal IDs
    const cleaned = removeEmptyAnswersFromResponse(questionnaire, response)

    // Ensure metadata
    cleaned.questionnaire = questionnaire.url ?? `Questionnaire/${questionnaire.id}`
    cleaned.status = "completed" satisfies QuestionnaireAnswersStatusCode
    cleaned.subject = { reference: `Patient/${patient.id}` }
    cleaned.authored = new Date().toISOString()

    onComplete(cleaned)
  }, [questionnaire, patient, onComplete])

  if (isBuilding) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner className="size-6" />
          <p className="text-sm text-muted-foreground">Building form...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileQuestion className="size-5" />
          {questionnaire.title ?? "Payer Documentation"}
        </CardTitle>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {questionnaire.publisher ?? questionnaire.name ?? questionnaire.id}
          </Badge>
          {prePopResult.serverPopulated && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="size-3" />
              Pre-populated via $populate
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient context summary */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/30 p-3 rounded-lg">
          <Zap className="size-3.5" />
          SDC-compliant rendering with enableWhen, calculated expressions, and value set lookups
        </div>

        {/* Smart Forms renderer */}
        <RendererThemeProvider>
          <BaseRenderer />
        </RendererThemeProvider>

        <Button onClick={handleSubmit} className="w-full">
          Continue to Review <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
