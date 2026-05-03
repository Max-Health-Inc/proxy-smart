import { useState, useCallback } from "react"
import { searchPatients, type Patient } from "@/lib/fhir-client"
import { formatHumanName } from "@proxy-smart/shared-ui"
import { Input, Button, Card, CardContent, Spinner, Badge } from "@proxy-smart/shared-ui"
import { Search, User, Calendar, Hash, AlertCircle } from "lucide-react"

interface PatientListProps {
  onSelect: (patient: Patient) => void
  selected: Patient | null
}

export function PatientList({ onSelect, selected }: PatientListProps) {
  const [query, setQuery] = useState("")
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    try {
      const results = await searchPatients(q)
      setPatients(results)
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      doSearch()
    }
  }

  return (
    <div className="space-y-4">
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
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm p-3 rounded-lg bg-destructive/10">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner size="lg" />
          <p className="text-muted-foreground text-sm">Searching patients...</p>
        </div>
      )}

      {!loading && searched && patients.length === 0 && !error && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No patients found. Try a different search term.
        </div>
      )}

      {!loading && !searched && !error && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Enter a name or MRN to search for patients.
        </div>
      )}

      {!loading && patients.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {patients.map((patient) => (
            <PatientRow
              key={patient.id}
              patient={patient}
              isSelected={selected?.id === patient.id}
              onSelect={onSelect}
            />
          ))}
        </div>
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
