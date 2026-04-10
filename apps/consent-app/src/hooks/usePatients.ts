import { useState, useEffect, useCallback } from "react"
import { getPatient, extractPatientLinks, type Patient, type Person } from "@/lib/fhir-client"

export function usePatients(person: Person | null) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPatients = useCallback(async () => {
    if (!person) return

    setLoading(true)
    setError(null)

    try {
      const links = extractPatientLinks(person)
      const results = await Promise.allSettled(
        links.map((l) => {
          const id = l.reference.replace("Patient/", "")
          return getPatient(id)
        })
      )
      const loaded = results
        .filter((r): r is PromiseFulfilledResult<Patient> => r.status === "fulfilled")
        .map((r) => r.value)
      setPatients(loaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patients")
    } finally {
      setLoading(false)
    }
  }, [person])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  return { patients, loading, error, refetch: fetchPatients }
}
