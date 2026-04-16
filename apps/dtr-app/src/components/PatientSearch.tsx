import { useState, useCallback, useRef } from "react"
import type { Patient } from "fhir/r4"
import { searchPatients, searchPatientByIdentifier, formatHumanName } from "@/lib/fhir-client"
import { getUSCoreDemographics } from "@/lib/patient-extensions"
import { Input, Card, CardContent, Badge, Spinner } from "@proxy-smart/shared-ui"
import { Search, User, Calendar, Hash, ChevronRight } from "lucide-react"

interface PatientSearchProps {
  onSelect: (patient: Patient) => void
}

export function PatientSearch({ onSelect }: PatientSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      // Search by name first, fall back to identifier
      let patients = await searchPatients(q)
      if (patients.length === 0 && /^\d/.test(q)) {
        patients = await searchPatientByIdentifier(q)
      }
      setResults(patients)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (value: string) => {
    setQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 400)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Select Patient</h2>
        <p className="text-sm text-muted-foreground">
          Search by patient name or MRN to begin a prior authorization request.
        </p>
      </div>

      <div className="relative max-w-lg mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or MRN..."
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No patients found for &ldquo;{query}&rdquo;
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="grid gap-2 max-w-lg mx-auto">
          {results.map((patient) => {
            const name = formatHumanName(patient.name)
            const mrn = patient.identifier?.[0]?.value
            const { race, ethnicity, birthSexDisplay } = getUSCoreDemographics(patient)
            return (
              <Card key={patient.id} className="cursor-pointer hover:bg-accent/30 transition-colors">
                <button className="w-full text-left" onClick={() => onSelect(patient)}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="size-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{name}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          {patient.birthDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {patient.birthDate}
                            </span>
                          )}
                          {mrn && (
                            <span className="flex items-center gap-1">
                              <Hash className="size-3" />
                              {mrn}
                            </span>
                          )}
                          {patient.gender && (
                            <span className="capitalize">{patient.gender}</span>
                          )}
                        </div>
                        {(race?.text || ethnicity?.text || birthSexDisplay) && (
                          <div className="flex gap-1.5 mt-1">
                            {race?.text && <Badge variant="secondary" className="text-[10px]">{race.text}</Badge>}
                            {ethnicity?.text && <Badge variant="secondary" className="text-[10px]">{ethnicity.text}</Badge>}
                            {birthSexDisplay && birthSexDisplay !== patient.gender && (
                              <Badge variant="outline" className="text-[10px]">Birth Sex: {birthSexDisplay}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </CardContent>
                </button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
