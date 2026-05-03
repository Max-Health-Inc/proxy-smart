import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardAction, Badge, Button, Spinner } from "@max-health-inc/shared-ui"
import { searchClaims, searchClaimResponses, searchTasks, type PASClaim, type PASClaimResponse, type PASTask } from "@/lib/fhir-client"
import type { ReviewAction } from "hl7.fhir.us.davinci-pas-generated"
import { getX12278DiagnosisTypeConcept } from "hl7.fhir.us.davinci-pas-generated/valuesets/ValueSet-X12278DiagnosisType"
import { getPASTaskCodesConcept } from "hl7.fhir.us.davinci-pas-generated/valuesets/ValueSet-PASTaskCodes"
import { getPASSupportingInfoTypeConcept } from "hl7.fhir.us.davinci-pas-generated/valuesets/ValueSet-PASSupportingInfoType"
import { type RemittanceOutcomeCode } from "hl7.fhir.us.davinci-pas-generated/valuesets/ValueSet-RemittanceOutcome"
import { type HrexTaskStatusCode } from "hl7.fhir.us.davinci-pas-generated/valuesets/ValueSet-HrexTaskStatus"
import { format } from "date-fns"
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, Eye, Paperclip, Info } from "lucide-react"

interface PaRequestListProps {
  patientId: string
}

interface PaDisplayItem {
  claim: PASClaim
  response?: PASClaimResponse
  tasks: PASTask[]
}

/** Maps RemittanceOutcome codes to UI status display */
const OUTCOME_STATUS_MAP: Record<RemittanceOutcomeCode, { label: string; variant: "success" | "destructive" | "warning" | "secondary"; icon: typeof CheckCircle }> = {
  complete: { label: "Approved", variant: "success", icon: CheckCircle },
  error: { label: "Denied", variant: "destructive", icon: XCircle },
  partial: { label: "Partial", variant: "warning", icon: AlertTriangle },
  queued: { label: "Pended", variant: "secondary", icon: Clock },
}

/** Maps HRex Task status codes to display labels */
const TASK_STATUS_LABELS: Partial<Record<HrexTaskStatusCode, string>> = {
  requested: "Requested",
  accepted: "Accepted",
  rejected: "Rejected",
  "in-progress": "In Progress",
  failed: "Failed",
  completed: "Completed",
  "on-hold": "On Hold",
}

/** Maps PAS task codes to human-readable labels */
const TASK_CODE_LABELS: Record<string, string> = {
  "attachment-request-questionnaire": "Questionnaire Request",
  "attachment-request-code": "Coded Attachment Request",
}

function getStatusInfo(item: PaDisplayItem) {
  const outcome = item.response?.outcome as RemittanceOutcomeCode | undefined
  if (outcome && outcome in OUTCOME_STATUS_MAP) {
    return OUTCOME_STATUS_MAP[outcome]
  }
  return item.response
    ? { label: "Responded", variant: "outline" as const, icon: FileText }
    : { label: "Submitted", variant: "secondary" as const, icon: Clock }
}

function getTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status as HrexTaskStatusCode] ?? status
}

function getTaskCodeLabel(code: string | undefined): string {
  if (!code) return "Attachment Request"
  const pasLabel = getPASTaskCodesConcept(code)?.code
  return TASK_CODE_LABELS[pasLabel ?? code] ?? pasLabel ?? code
}

export function PaRequestList({ patientId }: PaRequestListProps) {
  const [items, setItems] = useState<PaDisplayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([searchClaims(patientId), searchClaimResponses(patientId), searchTasks(patientId)])
      .then(([claims, responses, tasks]) => {
        if (cancelled) return
        // Match ClaimResponses to Claims
        const responseMap = new Map<string, PASClaimResponse>()
        for (const r of responses) {
          const claimRef = r.request?.reference
          if (claimRef) responseMap.set(claimRef, r)
        }

        // Match Tasks to Claims via focus reference
        const taskMap = new Map<string, PASTask[]>()
        for (const t of tasks) {
          const focusRef = t.focus?.reference
          if (focusRef) {
            const existing = taskMap.get(focusRef) ?? []
            existing.push(t)
            taskMap.set(focusRef, existing)
          }
        }

        const combined: PaDisplayItem[] = claims.map((claim) => ({
          claim,
          response: responseMap.get(`Claim/${claim.id}`),
          tasks: taskMap.get(`Claim/${claim.id}`) ?? [],
        }))
        setItems(combined)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load PA requests")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [patientId])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">{error}</CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="size-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">No prior authorization requests</p>
        <p className="text-sm">Start a new PA request from the &ldquo;New Request&rdquo; tab.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const status = getStatusInfo(item)
        const StatusIcon = status.icon
        const created = item.claim.created
          ? format(new Date(item.claim.created), "MMM d, yyyy")
          : "Unknown date"
        const procedureCodes = item.claim.procedure?.map(
          (p) => (p.procedureCodeableConcept?.coding?.[0]?.display ?? p.procedureCodeableConcept?.coding?.[0]?.code ?? "")
        ).filter(Boolean) ?? []
        const diagnosisCodes = item.claim.diagnosis?.map(
          (d) => {
            const display = d.diagnosisCodeableConcept?.coding?.[0]?.display ?? d.diagnosisCodeableConcept?.coding?.[0]?.code ?? ""
            const typeCode = d.type?.[0]?.coding?.[0]?.code
            const typeLabel = typeCode ? getX12278DiagnosisTypeConcept(typeCode)?.code : undefined
            return typeLabel ? `${display} (${typeLabel})` : display
          }
        ).filter(Boolean) ?? []
        const supportingInfoItems = item.claim.supportingInfo?.map((si) => {
          const categoryCode = si.category?.coding?.[0]?.code
          const categoryLabel = categoryCode ? getPASSupportingInfoTypeConcept(categoryCode)?.code : undefined
          return categoryLabel ?? categoryCode ?? ""
        }).filter(Boolean) ?? []
        const expanded = expandedId === item.claim.id

        return (
          <Card key={item.claim.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" />
                PA Request — {created}
              </CardTitle>
              <CardAction>
                <Badge variant={status.variant}>
                  <StatusIcon className="size-3" /> {status.label}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {procedureCodes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">Procedures:</span>
                    {procedureCodes.map((code, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{code}</Badge>
                    ))}
                  </div>
                )}
                {diagnosisCodes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">Diagnoses:</span>
                    {diagnosisCodes.map((code, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{code}</Badge>
                    ))}
                  </div>
                )}
                {supportingInfoItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">Supporting Info:</span>
                    {supportingInfoItems.map((cat, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{cat}</Badge>
                    ))}
                  </div>
                )}

                {expanded && item.response && (
                  <div className="mt-3 space-y-3">
                    {/* Item-level adjudication details */}
                    {item.response.item?.map((ri, idx) => {
                      const reviewAction = ri.adjudication?.[0]?.extension?.find(
                        (e): e is ReviewAction => e.url === "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-reviewAction"
                      )
                      const reviewCode = reviewAction?.extension?.find(e => e.url === "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-reviewActionCode")
                      return (
                        <div key={idx} className="p-3 bg-muted/50 rounded-md">
                          <p className="text-xs font-medium mb-1">Item {ri.itemSequence}</p>
                          {reviewCode?.valueCodeableConcept && (
                            <p className="text-xs text-muted-foreground">
                              Review Action: {reviewCode.valueCodeableConcept.coding?.[0]?.display ?? reviewCode.valueCodeableConcept.coding?.[0]?.code}
                            </p>
                          )}
                          {ri.extension?.filter(e => e.url === "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-itemPreAuthPeriod").map((ext, i) => (
                            <p key={i} className="text-xs text-muted-foreground">
                              Auth Period: {ext.valuePeriod?.start && format(new Date(ext.valuePeriod.start), "MMM d, yyyy")}
                              {ext.valuePeriod?.end && ` — ${format(new Date(ext.valuePeriod.end), "MMM d, yyyy")}`}
                            </p>
                          ))}
                          {ri.extension?.filter(e => e.url === "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-authorizationNumber").map((ext, i) => (
                            <p key={i} className="text-xs text-muted-foreground font-mono">
                              Auth #: {ext.valueString}
                            </p>
                          ))}
                        </div>
                      )
                    })}
                    {/* Errors */}
                    {item.response.error?.map((err, idx) => (
                      <div key={idx} className="p-3 bg-destructive/10 rounded-md">
                        <p className="text-xs font-medium text-destructive">
                          Error: {err.code?.coding?.[0]?.display ?? err.code?.coding?.[0]?.code ?? "Unknown"}
                        </p>
                      </div>
                    ))}
                    {/* Communication requests */}
                    {item.response.communicationRequest && item.response.communicationRequest.length > 0 && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md space-y-1">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Info className="size-3" />
                          Payer requests additional information ({item.response.communicationRequest.length} item{item.response.communicationRequest.length !== 1 ? "s" : ""})
                        </p>
                        {item.response.communicationRequest.map((cr, i) => (
                          <p key={i} className="text-xs text-blue-600 dark:text-blue-400 pl-4">
                            {cr.display ?? cr.reference ?? "Communication request"}
                          </p>
                        ))}
                      </div>
                    )}
                    {/* Raw response fallback */}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw FHIR Response</summary>
                      <pre className="mt-1 overflow-auto max-h-48 p-2 bg-muted/50 rounded text-xs">
                        {JSON.stringify(item.response, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}

                {/* Attachment request tasks */}
                {expanded && item.tasks.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium flex items-center gap-1">
                      <Paperclip className="size-3" /> Attachment Requests
                    </p>
                    {item.tasks.map((task, idx) => {
                      const taskCode = task.code?.coding?.[0]?.code
                      return (
                        <div key={task.id || idx} className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                              {getTaskCodeLabel(taskCode)}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {getTaskStatusLabel(task.status ?? "")}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                          )}
                          {task.lastModified && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Updated: {format(new Date(task.lastModified), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedId(expanded ? null : item.claim.id ?? null)}
                  >
                    <Eye className="size-3.5" />
                    {expanded ? "Hide Details" : "View Details"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
