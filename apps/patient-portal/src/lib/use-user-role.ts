import { useMemo } from "react"
import { smartAuth } from "@/lib/smart-auth"

export type FhirUserType = "Patient" | "Practitioner" | "RelatedPerson" | "Person" | null

export interface UserRole {
  /** The full fhirUser reference (e.g. "Practitioner/abc-123") */
  fhirUser: string | null
  /** Extracted resource type from fhirUser */
  userType: FhirUserType
  /** Whether the current user is a Practitioner */
  isPractitioner: boolean
  /** Whether the current user is a Patient */
  isPatient: boolean
  /** The resource ID portion of the fhirUser reference */
  userId: string | null
}

const FHIR_USER_TYPES = ["Patient", "Practitioner", "RelatedPerson", "Person"] as const

function parseFhirUser(fhirUser: string | undefined | null): { type: FhirUserType; id: string | null } {
  if (!fhirUser) return { type: null, id: null }

  // Absolute URL: https://fhir.example.com/Patient/123
  const absMatch = fhirUser.match(/\/(Patient|Practitioner|RelatedPerson|Person)\/([^/]+)$/)
  if (absMatch) return { type: absMatch[1] as FhirUserType, id: absMatch[2] }

  // Relative reference: Practitioner/123
  for (const t of FHIR_USER_TYPES) {
    if (fhirUser.startsWith(`${t}/`)) {
      return { type: t as FhirUserType, id: fhirUser.slice(t.length + 1) }
    }
  }

  return { type: null, id: null }
}

/**
 * Hook that derives the user's role from the SMART token's fhirUser claim.
 * Re-evaluates only when the token changes (memoized).
 */
export function useUserRole(): UserRole {
  const token = smartAuth.getToken()
  return useMemo(() => {
    const { type, id } = parseFhirUser(token?.fhirUser)
    return {
      fhirUser: token?.fhirUser ?? null,
      userType: type,
      isPractitioner: type === "Practitioner",
      isPatient: type === "Patient" || type === null, // default to patient if unknown
      userId: id,
    }
  }, [token?.fhirUser])
}
