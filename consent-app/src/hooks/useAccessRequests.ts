import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import {
  searchTasksByPatient,
  searchTasksByRequester,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  createConsent as apiCreateConsent,
  type Task,
} from "@/lib/fhir-client"
import { buildR4Consent, type ConsentDraft } from "@/lib/consent-builder"
import {
  getRequestResourceTypes,
  getRequestAction,
  getRequestPeriodStart,
  getRequestPeriodEnd,
} from "@/lib/task-builder"

type SearchMode =
  | { by: "patient"; patientId: string }
  | { by: "requester"; practitionerRef: string }

export function useAccessRequests(mode: SearchMode | null) {
  const [requests, setRequests] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    if (!mode) return

    setLoading(true)
    setError(null)
    try {
      const results =
        mode.by === "patient"
          ? await searchTasksByPatient(mode.patientId)
          : await searchTasksByRequester(mode.practitionerRef)
      setRequests(results)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load access requests"
      setError(msg)
      toast.error("Failed to load access requests", { description: msg })
    } finally {
      setLoading(false)
    }
  }, [mode])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // ── Create (practitioner) ──────────────────────────────────────────────────

  const createRequest = useCallback(async (task: Task) => {
    try {
      const created = await apiCreateTask(task)
      setRequests((prev) => [created, ...prev])
      toast.success("Access request sent", { description: "The patient will be notified." })
      return created
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send request"
      toast.error("Failed to send request", { description: msg })
      throw err
    }
  }, [])

  // ── Approve (patient) — creates Consent, updates Task to accepted ─────────

  const approveRequest = useCallback(async (task: Task, personReference: string) => {
    const id = task.id
    if (!id) throw new Error("Task has no id")

    const patientRef = task.for?.reference
    const patientId = patientRef?.replace("Patient/", "")
    const practitionerRef = task.requester?.reference
    const practitionerId = practitionerRef?.replace("Practitioner/", "")
    if (!patientId || !practitionerId) throw new Error("Task missing patient or requester")

    try {
      // 1. Build and create Consent from the Task data
      const draft: ConsentDraft = {
        patientId,
        practitionerId,
        practitionerDisplay: task.requester?.display,
        resourceTypes: getRequestResourceTypes(task),
        action: (getRequestAction(task) as "access" | "disclose") ?? "access",
        periodStart: getRequestPeriodStart(task) ?? new Date().toISOString().split("T")[0],
        periodEnd: getRequestPeriodEnd(task),
      }
      const consent = buildR4Consent(draft, personReference)
      const createdConsent = await apiCreateConsent(consent)

      // 2. Update Task to accepted with consent reference in output
      const updated: Task = {
        ...task,
        status: "accepted",
        output: [
          ...(task.output ?? []),
          {
            type: {
              coding: [{ system: "http://proxy-smart.dev/task-output", code: "consent-reference" }],
            },
            valueReference: { reference: `Consent/${createdConsent.id}` },
          },
        ],
      }
      await apiUpdateTask(id, updated)

      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "accepted" as const, output: updated.output } : r)),
      )
      toast.success("Request approved", { description: "Consent has been created and access granted." })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to approve request"
      toast.error("Failed to approve request", { description: msg })
      throw err
    }
  }, [])

  // ── Reject (patient) ──────────────────────────────────────────────────────

  const rejectRequest = useCallback(async (task: Task) => {
    const id = task.id
    if (!id) throw new Error("Task has no id")

    try {
      const updated: Task = { ...task, status: "rejected" }
      await apiUpdateTask(id, updated)
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "rejected" as const } : r)),
      )
      toast.success("Request rejected")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reject request"
      toast.error("Failed to reject request", { description: msg })
      throw err
    }
  }, [])

  // ── Cancel (practitioner) ─────────────────────────────────────────────────

  const cancelRequest = useCallback(async (task: Task) => {
    const id = task.id
    if (!id) throw new Error("Task has no id")

    try {
      const updated: Task = { ...task, status: "cancelled" }
      await apiUpdateTask(id, updated)
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "cancelled" as const } : r)),
      )
      toast.success("Request cancelled")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to cancel request"
      toast.error("Failed to cancel request", { description: msg })
      throw err
    }
  }, [])

  // ── Derived stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === "requested").length,
    approved: requests.filter((r) => r.status === "accepted").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }), [requests])

  return {
    requests,
    loading,
    error,
    stats,
    refetch: fetchRequests,
    createRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
  }
}
