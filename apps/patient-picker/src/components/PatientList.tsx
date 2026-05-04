import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { searchPatients, listPatients, SessionExpiredError, type Patient } from "@/lib/fhir-client"
import { formatHumanName } from "@proxy-smart/shared-ui"
import { Input, Button, Card, CardContent, Spinner, Badge, ScrollArea } from "@proxy-smart/shared-ui"
import { Search, User, Calendar, Hash, ChevronLeft, ChevronRight } from "lucide-react"

const PAGE_SIZE = 10

interface PatientListProps {
  fhirBaseUrl: string
  onSelect: (patient: Patient) => void
  selected: Patient | null
  onSessionExpired?: () => void
}

export function PatientList({ fhirBaseUrl, onSelect, selected, onSessionExpired }: PatientListProps) {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Paginated browse state
  const [browsePatients, setBrowsePatients] = useState<Patient[]>([])
  const [browseTotal, setBrowseTotal] = useState<number | null>(null)
  const [browseOffset, setBrowseOffset] = useState(0)
  const [browseLoading, setBrowseLoading] = useState(false)

  const loadPage = useCallback(async (offset: number) => {
    setBrowseLoading(true)
    try {
      const bundle = await listPatients(fhirBaseUrl, offset, PAGE_SIZE)
      const patients = (bundle.entry ?? [])
        .map(e => e.resource as Patient | undefined)
        .filter((r): r is Patient => r !== undefined && r !== null)
      setBrowsePatients(patients)
      setBrowseTotal(bundle.total ?? null)
      setBrowseOffset(offset)
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        onSessionExpired?.()
        return
      }
      toast.error("Failed to load patients", {
        description: err instanceof Error ? err.message : "Unknown error"
      })
    } finally {
      setBrowseLoading(false)
    }
  }, [fhirBaseUrl, onSessionExpired])

  // Load initial patient list on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount is valid
    loadPage(0)
  }, [fhirBaseUrl, loadPage])

  const doSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) {
      setSearched(false)
      setSearchResults([])
      return
    }
    setLoading(true)
    try {
      const results = await searchPatients(fhirBaseUrl, q)
      setSearchResults(results)
      setSearched(true)
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        onSessionExpired?.()
        return
      }
      const msg = err instanceof Error ? err.message : "Search failed"
      setSearchResults([])
      toast.error("Patient search failed", { description: msg })
    } finally {
      setLoading(false)
    }
  }, [query, fhirBaseUrl, onSessionExpired])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      doSearch()
    }
  }

  const clearSearch = () => {
    setQuery("")
    setSearched(false)
    setSearchResults([])
  }

  // Determine which list to show
  const showSearchResults = searched || loading
  const displayPatients = showSearchResults ? searchResults : browsePatients
  const isLoading = showSearchResults ? loading : browseLoading

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or MRN..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9"
            autoFocus
          />
        </div>
        <Button onClick={doSearch} disabled={loading || !query.trim()}>
          {loading ? <Spinner size="sm" /> : "Search"}
        </Button>
        {searched && (
          <Button variant="ghost" onClick={clearSearch} size="sm" className="text-xs">
            Clear
          </Button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Spinner size="lg" />
          <p className="text-muted-foreground text-sm">
            {showSearchResults ? "Searching..." : "Loading patients..."}
          </p>
        </div>
      )}

      {/* Empty search result */}
      {!isLoading && searched && searchResults.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No patients found. Try a different search term.
        </div>
      )}

      {/* Patient list */}
      {!isLoading && displayPatients.length > 0 && (
        <>
          {!showSearchResults && (
            <p className="text-xs text-muted-foreground">
              {browseTotal !== null ? `${browseTotal} patients` : "All patients"} — select one or search above
            </p>
          )}
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-1">
              {displayPatients.map((patient) => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  isSelected={selected?.id === patient.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Pagination (browse mode only) */}
          {!showSearchResults && browseTotal !== null && browseTotal > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={browseOffset === 0 || browseLoading}
                onClick={() => loadPage(Math.max(0, browseOffset - PAGE_SIZE))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {browseOffset + 1}–{Math.min(browseOffset + PAGE_SIZE, browseTotal)} of {browseTotal}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={browseOffset + PAGE_SIZE >= browseTotal || browseLoading}
                onClick={() => loadPage(browseOffset + PAGE_SIZE)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PatientRow({
  patient,
  isSelected,
  onSelect,
}: {
  patient: Patient
  isSelected: boolean
  onSelect: (p: Patient) => void
}) {
  const name = formatHumanName(patient.name)
  const mrn = patient.identifier?.find(
    (i) => i.type?.coding?.[0]?.code === "MR",
  )?.value
  const gender = patient.gender
  const dob = patient.birthDate

  return (
    <Card
      data-testid="patient-row"
      data-patient-id={patient.id}
      className={`cursor-pointer transition-colors hover:bg-accent/50 ${
        isSelected ? "border-primary bg-accent/30" : ""
      }`}
      onClick={() => onSelect(patient)}
    >
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <User className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{name}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {mrn ?? patient.id}
            </span>
            {dob && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {dob}
              </span>
            )}
            {gender && <Badge variant="outline" className="text-xs px-1.5 py-0">{gender}</Badge>}
          </div>
        </div>
        {isSelected && (
          <Badge className="shrink-0">Selected</Badge>
        )}
      </CardContent>
    </Card>
  )
}
