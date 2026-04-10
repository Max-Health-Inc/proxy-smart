import { useState, useEffect, useCallback } from "react"
import type { Patient } from "fhir/r4"
import { getPatient } from "@/lib/fhir-client"

const PATIENT_KEY = "dtr_app_selected_patient"

/** Manages patient context — either from EHR launch or manual selection.
 *  Persists the selected patient in sessionStorage so it survives a refresh. */
export function usePatientContext(ehrPatientId: string | null) {
  const [patient, setPatientState] = useState<Patient | null>(() => {
    try {
      const raw = sessionStorage.getItem(PATIENT_KEY)
      return raw ? (JSON.parse(raw) as Patient) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ehrPatientId) return
    // If we already have this patient cached, skip the fetch
    if (patient?.id === ehrPatientId) return

    setLoading(true)
    setError(null)
    getPatient(ehrPatientId)
      .then((p) => {
        setPatientState(p)
        sessionStorage.setItem(PATIENT_KEY, JSON.stringify(p))
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load patient"))
      .finally(() => setLoading(false))
  }, [ehrPatientId])

  const setPatient = useCallback((p: Patient | null) => {
    setPatientState(p)
    setError(null)
    if (p) {
      sessionStorage.setItem(PATIENT_KEY, JSON.stringify(p))
    } else {
      sessionStorage.removeItem(PATIENT_KEY)
    }
  }, [])

  return { patient, loading, error, setPatient }
}
