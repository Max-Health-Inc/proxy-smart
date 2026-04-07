import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardAction, Badge, Button, Spinner } from "@proxy-smart/shared-ui"
import { searchClaims, searchClaimResponses, searchTasks, type PASClaim, type PASClaimResponse, type PASTask } from "@/lib/fhir-client"
import type { ReviewAction } from "hl7.fhir.us.davinci-pas-generated"
import { getX12278DiagnosisTypeConcept } from "hl7.fhir.us.davinci-pas-generated/valuesets/ValueSet-X12278DiagnosisType.js"
import { getPASTaskCodesConcept } from "hl7.fhir.us.davinci-pas-generated/valuesets/ValueSet-PASTaskCodes.js"
import { getPASSupportingInfoTypeConcept } from "hl7.fhir.us.davinci-pas-generated/valuesets/ValueSet-PASSupportingInfoType.js"
import { format } from "date-fns"
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, Eye, Paperclip } from "lucide-react"

interface PaRequestListProps {
  patientId: string
}

interface PaDisplayItem {
  claim: PASClaim
  response?: PASClaimResponse
  tasks: PASTask[]
}

function getStatusInfo(item: PaDisplayItem) {
  const outcome = item.response?.outcome
  switch (outcome) {
    case "complete":
      return { label: "Approved", variant: "success" as const, icon: CheckCircle }
    case "error":
      return { label: "Denied", variant: "destructive" as const, icon: XCircle }
    case "partial":
      return { label: "Partial", variant: "warning" as const, icon: AlertTriangle }
    case "queued":
      return { label: "Pended", variant: "secondary" as const, icon: Clock }
    default:
      return item.response
        ? { label: "Responded", variant: "outline" as const, icon: FileText }
        : { label: "Submitted", variant: "secondary" as const, icon: Clock }
  }
}

export function PaRequestList({ patientId }: PaRequestListProps) {
  const [items, setItems] = useState<PaDisplayItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

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
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          Payer requests additional information ({item.response.communicationRequest.length} item{item.response.communicationRequest.length !== 1 ? "s" : ""})
                        </p>
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
                      const taskLabel = taskCode ? getPASTaskCodesConcept(taskCode)?.code : undefined
                      return (
                        <div key={task.id || idx} className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                              {taskLabel === "attachment-request-questionnaire"
                                ? "Questionnaire Request"
                                : taskLabel === "attachment-request-code"
                                  ? "Coded Attachment Request"
                                  : taskCode ?? "Attachment Request"}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {task.status}
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
