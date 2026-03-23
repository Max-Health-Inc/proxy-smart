import { useState, useEffect, useRef, useCallback } from "react"
import type { Consent } from "fhir/r4"
import { getPractitioner, formatHumanName } from "@/lib/fhir-client"

/**
 * Resolves practitioner display names for consent actor references.
 * Caches results to avoid re-fetching. Only fetches when the reference
 * lacks a display name (i.e. it's a bare "Practitioner/<id>").
 */
export function usePractitionerNames(consents: Consent[]) {
  const [names, setNames] = useState<Map<string, string>>(new Map())
  const resolvedRef = useRef<Set<string>>(new Set())

  const resolve = useCallback(async (refs: string[]) => {
    const toResolve = refs.filter((r) => !resolvedRef.current.has(r))
    if (toResolve.length === 0) return

    // Mark as in-flight so we don't re-fetch
    for (const r of toResolve) resolvedRef.current.add(r)

    const results = await Promise.allSettled(
      toResolve.map(async (ref) => {
        const id = ref.replace("Practitioner/", "")
        const practitioner = await getPractitioner(id)
        return { ref, name: formatHumanName(practitioner.name) }
      })
    )

    setNames((prev) => {
      const next = new Map(prev)
      for (const r of results) {
        if (r.status === "fulfilled") {
          next.set(r.value.ref, r.value.name)
        }
      }
      return next
    })
  }, [])

  useEffect(() => {
    const bareRefs: string[] = []
    for (const consent of consents) {
      const actor = consent.provision?.actor?.[0]
      const ref = actor?.reference?.reference
      const display = actor?.reference?.display
      // Only resolve if we have a Practitioner/ reference without a display name
      if (ref?.startsWith("Practitioner/") && !display) {
        bareRefs.push(ref)
      }
    }
    if (bareRefs.length > 0) resolve(bareRefs)
  }, [consents, resolve])

  /** Get display name for a consent's primary actor */
  const getActorName = useCallback(
    (consent: Consent): string => {
      const actor = consent.provision?.actor?.[0]
      const display = actor?.reference?.display
      if (display) return display
      const ref = actor?.reference?.reference
      if (ref && names.has(ref)) return names.get(ref)!
      return ref ?? "Unknown practitioner"
    },
    [names]
  )

  return { getActorName, names }
}
