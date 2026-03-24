import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import {
  searchConsents,
  createConsent as apiCreateConsent,
  revokeConsent as apiRevokeConsent,
  type Consent,
} from "@/lib/fhir-client"

export type ConsentStatusFilter = "all" | "active" | "inactive"
export type ConsentSortKey = "date-desc" | "date-asc" | "status"

export function useConsents(patientId: string | null) {
  const [consents, setConsents] = useState<Consent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ConsentStatusFilter>("all")
  const [sortKey, setSortKey] = useState<ConsentSortKey>("date-desc")
  const [searchTerm, setSearchTerm] = useState("")

  const fetchConsents = useCallback(async () => {
    if (!patientId) return

    setLoading(true)
    setError(null)

    try {
      const results = await searchConsents(patientId)
      setConsents(results)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load consents"
      setError(msg)
      toast.error("Failed to load consents", { description: msg })
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchConsents()
  }, [fetchConsents])

  // Derived: filtered and sorted consents
  const filtered = useMemo(() => {
    let result = consents

    // Status filter
    if (statusFilter === "active") result = result.filter((c) => c.status === "active")
    else if (statusFilter === "inactive") result = result.filter((c) => c.status !== "active")

    // Text search (practitioner name or resource types)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter((c) => {
        const actor = c.provision?.actor?.[0]?.reference?.display ?? c.provision?.actor?.[0]?.reference?.reference ?? ""
        const types = c.provision?.class?.map((cl) => cl.code ?? "").join(" ") ?? ""
        return actor.toLowerCase().includes(q) || types.toLowerCase().includes(q)
      })
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortKey === "status") {
        const sa = a.status === "active" ? 0 : 1
        const sb = b.status === "active" ? 0 : 1
        return sa - sb
      }
      const da = new Date(a.provision?.period?.start ?? 0).getTime()
      const db = new Date(b.provision?.period?.start ?? 0).getTime()
      return sortKey === "date-asc" ? da - db : db - da
    })

    return result
  }, [consents, statusFilter, sortKey, searchTerm])

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    return {
      total: consents.length,
      active: consents.filter((c) => c.status === "active").length,
      revoked: consents.filter((c) => c.status !== "active").length,
      expiringSoon: consents.filter((c) => {
        if (c.status !== "active") return false
        const end = c.provision?.period?.end
        if (!end) return false
        const endDate = new Date(end).getTime()
        return endDate > now.getTime() && endDate - now.getTime() < sevenDays
      }).length,
    }
  }, [consents])

  const createNewConsent = useCallback(async (consent: Consent) => {
    try {
      const created = await apiCreateConsent(consent)
      setConsents((prev) => [created, ...prev])
      toast.success("Consent created", { description: "New consent has been recorded." })
      return created
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create consent"
      toast.error("Failed to create consent", { description: msg })
      throw err
    }
  }, [])

  const revoke = useCallback(async (consent: Consent) => {
    const id = consent.id
    if (!id) throw new Error("Consent has no id")

    try {
      await apiRevokeConsent(id, consent)
      setConsents((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "inactive" as const } : c))
      )
      toast.success("Consent revoked", { description: "Access has been revoked." })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to revoke consent"
      toast.error("Failed to revoke consent", { description: msg })
      throw err
    }
  }, [])

  return {
    consents: filtered,
    allConsents: consents,
    loading,
    error,
    stats,
    statusFilter,
    setStatusFilter,
    sortKey,
    setSortKey,
    searchTerm,
    setSearchTerm,
    refetch: fetchConsents,
    createNewConsent,
    revoke,
  }
}
