import { useState, useEffect, useCallback } from "react"
import { getPerson, getPatient, getPractitioner, type Person, type Patient, type Practitioner } from "@/lib/fhir-client"
import { smartAuth } from "@/lib/smart-auth"

export type FhirUserResult = 
  | { resourceType: "Person"; resource: Person }
  | { resourceType: "Patient"; resource: Patient }
  | { resourceType: "Practitioner"; resource: Practitioner }

export function usePerson() {
  const [result, setResult] = useState<FhirUserResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPerson = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = smartAuth.getToken()
      if (!token?.fhirUser) {
        throw new Error("No fhirUser claim in token")
      }
      // fhirUser is a FHIR reference like "Patient/test-patient" or "Person/123" or "Practitioner/456"
      const [resourceType, id] = token.fhirUser.split("/")
      if (!resourceType || !id) {
        throw new Error(`Invalid fhirUser reference: ${token.fhirUser}`)
      }

      if (resourceType === "Patient") {
        const resource = await getPatient(id)
        setResult({ resourceType: "Patient", resource })
      } else if (resourceType === "Practitioner") {
        const resource = await getPractitioner(id)
        setResult({ resourceType: "Practitioner", resource })
      } else {
        const resource = await getPerson(id)
        setResult({ resourceType: "Person", resource })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve()
      .then(() => {
        setLoading(true)
        setError(null)
        const token = smartAuth.getToken()
        if (!token?.fhirUser) throw new Error("No fhirUser claim in token")
        const [resourceType, id] = token.fhirUser.split("/")
        if (!resourceType || !id) throw new Error(`Invalid fhirUser reference: ${token.fhirUser}`)
        if (resourceType === "Patient") {
          return getPatient(id).then((resource) => ({ resourceType: "Patient" as const, resource }))
        } else if (resourceType === "Practitioner") {
          return getPractitioner(id).then((resource) => ({ resourceType: "Practitioner" as const, resource }))
        }
        return getPerson(id).then((resource) => ({ resourceType: "Person" as const, resource }))
      })
      .then((res) => setResult(res as FhirUserResult))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load user"))
      .finally(() => setLoading(false))
  }, [])

  return { result, loading, error, refetch: fetchPerson }
}
