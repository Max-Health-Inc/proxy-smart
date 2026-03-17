import { useState, useCallback } from "react"
import { searchPractitioners as apiSearch, type Practitioner } from "@/lib/fhir-client"

export function usePractitioners() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPractitioners([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const results = await apiSearch(query)
      setPractitioners(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }, [])

  return { practitioners, loading, error, search }
}
