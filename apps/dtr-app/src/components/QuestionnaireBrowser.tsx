/**
 * Questionnaire Browser
 *
 * Generalized DTR interface for browsing, rendering, and submitting any
 * FHIR Questionnaire on the server. Supports all DTR use cases:
 * - Claims attachments (CDex)
 * - Medical necessity documentation
 * - Risk adjustment / quality reporting
 * - Any payer-published SDC Questionnaire
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import type { Patient, Questionnaire, QuestionnaireResponse } from "fhir/r4"
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, Spinner } from "@proxy-smart/shared-ui"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@proxy-smart/shared-ui"
import { SmartFormsQuestionnaireRenderer } from "@/components/SmartFormsQuestionnaireRenderer"
import { searchQuestionnaires, createQuestionnaireResponse } from "@/lib/fhir-client"
import type { PublicationStatusCode } from "hl7.fhir.us.davinci-dtr-generated/valuesets/ValueSet-PublicationStatus"
import { toast } from "sonner"
import {
  FileQuestion,
  Search,
  ArrowLeft,
  CheckCircle,
  Calendar,
  Building2,
  Tag,
  Filter,
  PenTool,
  BookOpen,
  Workflow,
} from "lucide-react"
import { getQuestionnaireMetadata } from "@/lib/questionnaire-extensions"

interface QuestionnaireBrowserProps {
  patient: Patient
}

type BrowserView = "list" | "fill" | "done"

export function QuestionnaireBrowser({ patient }: QuestionnaireBrowserProps) {
  const [view, setView] = useState<BrowserView>("list")
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [publisherFilter, setPublisherFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedQ, setSelectedQ] = useState<Questionnaire | null>(null)
  const didFetch = useRef(false)

  // Fetch available questionnaires
  useEffect(() => {
    if (didFetch.current) return
    didFetch.current = true

    async function load() {
      try {
        const results = await searchQuestionnaires()
        setQuestionnaires(results)
      } catch (err) {
        console.error("Failed to load questionnaires:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSelect = useCallback((q: Questionnaire) => {
    setSelectedQ(q)
    setView("fill")
  }, [])

  const handleComplete = useCallback(
    async (qr: QuestionnaireResponse) => {
      try {
        await createQuestionnaireResponse(qr)
        toast.success("Documentation saved", {
          description: `QuestionnaireResponse for "${selectedQ?.title ?? "form"}" recorded.`,
        })
        setView("done")
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed"
        toast.error("Failed to save", { description: msg })
      }
    },
    [selectedQ]
  )

  const handleBack = useCallback(() => {
    setSelectedQ(null)
    setView("list")
  }, [])

  // Extract unique publishers (payers) for filtering
  const publishers = useMemo(() => {
    const names = new Set<string>()
    for (const q of questionnaires) {
      if (q.publisher) names.add(q.publisher)
    }
    return Array.from(names).sort()
  }, [questionnaires])

  // Filter questionnaires by search query, publisher, and status
  const filtered = questionnaires.filter((q) => {
    if (publisherFilter !== "all" && q.publisher !== publisherFilter) return false
    if (statusFilter !== "all" && q.status !== statusFilter) return false
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      q.title?.toLowerCase().includes(query) ||
      q.name?.toLowerCase().includes(query) ||
      q.publisher?.toLowerCase().includes(query) ||
      q.description?.toLowerCase().includes(query) ||
      q.id?.toLowerCase().includes(query)
    )
  })

  // ── Done view ──
  if (view === "done") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <CheckCircle className="size-12 text-emerald-500" />
          <h3 className="text-lg font-semibold">Documentation Saved</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            The completed QuestionnaireResponse has been saved to the FHIR
            server and is available for downstream workflows.
          </p>
          <Button onClick={handleBack} className="mt-2">
            Fill Another Questionnaire
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── Fill view ──
  if (view === "fill" && selectedQ) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="size-4" /> Back to questionnaire list
        </Button>
        <SmartFormsQuestionnaireRenderer
          questionnaire={selectedQ}
          patient={patient}
          service={{
            procedure: { code: "", display: "", system: "", category: "medical" },
            diagnosis: null,
            diagnosisText: "",
            notes: "",
          }}
          onComplete={handleComplete}
        />
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search questionnaires..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {publishers.length > 1 && (
          <Select value={publisherFilter} onValueChange={setPublisherFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="size-3.5 mr-1" />
              <SelectValue placeholder="All payers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payers</SelectItem>
              {publishers.map((pub) => (
                <SelectItem key={pub} value={pub}>{pub}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline">{filtered.length} available</Badge>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Spinner className="size-6" />
            <p className="text-sm text-muted-foreground">
              Loading questionnaires from FHIR server...
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <FileQuestion className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "No questionnaires match your search."
                : "No questionnaires available on this FHIR server."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((q) => (
            <QuestionnaireCard
              key={q.id}
              questionnaire={q}
              onSelect={() => handleSelect(q)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Questionnaire Card ───────────────────────────────────────────────────────

function QuestionnaireCard({
  questionnaire,
  onSelect,
}: {
  questionnaire: Questionnaire
  onSelect: () => void
}) {
  const itemCount = countItems(questionnaire.item ?? [])
  const meta = getQuestionnaireMetadata(questionnaire)
  const statusColor =
    questionnaire.status === ("active" satisfies PublicationStatusCode)
      ? "text-emerald-600"
      : questionnaire.status === ("draft" satisfies PublicationStatusCode)
        ? "text-amber-600"
        : "text-muted-foreground"

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileQuestion className="size-4 shrink-0" />
            {questionnaire.title ?? questionnaire.name ?? questionnaire.id}
          </CardTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            {meta.signatureRequired && (
              <Badge variant="destructive" className="text-xs">
                <PenTool className="size-3 mr-0.5" />
                Signature
              </Badge>
            )}
            {meta.hasCql && (
              <Badge variant="secondary" className="text-xs">
                <BookOpen className="size-3 mr-0.5" />
                CQL
              </Badge>
            )}
            {meta.modular && (
              <Badge variant="secondary" className="text-xs">
                <Workflow className="size-3 mr-0.5" />
                Modular
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs ${statusColor}`}>
              {questionnaire.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {questionnaire.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {questionnaire.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {questionnaire.publisher && (
            <span className="flex items-center gap-1">
              <Building2 className="size-3" />
              {questionnaire.publisher}
            </span>
          )}
          {questionnaire.date && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {new Date(questionnaire.date).toLocaleDateString()}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Tag className="size-3" />
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </span>
          {meta.launchContextNames.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Context: {meta.launchContextNames.join(", ")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function countItems(items: Questionnaire["item"]): number {
  if (!items) return 0
  let count = 0
  for (const item of items) {
    count += 1
    if (item.item) count += countItems(item.item)
  }
  return count
}
