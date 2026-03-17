import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { searchClaims, searchClaimResponses, type PASClaim, type PASClaimResponse } from "@/lib/fhir-client"
import { format } from "date-fns"
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle, Eye } from "lucide-react"

interface PaRequestListProps {
  patientId: string
}

interface PaDisplayItem {
  claim: PASClaim
  response?: PASClaimResponse
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

    Promise.all([searchClaims(patientId), searchClaimResponses(patientId)])
      .then(([claims, responses]) => {
        if (cancelled) return
        // Match ClaimResponses to Claims
        const responseMap = new Map<string, PASClaimResponse>()
        for (const r of responses) {
          const claimRef = r.request?.reference
          if (claimRef) responseMap.set(claimRef, r)
        }

        const combined: PaDisplayItem[] = claims.map((claim) => ({
          claim,
          response: responseMap.get(`Claim/${claim.id}`),
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
          (d) => (d.diagnosisCodeableConcept?.coding?.[0]?.display ?? d.diagnosisCodeableConcept?.coding?.[0]?.code ?? "")
        ).filter(Boolean) ?? []
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

                {expanded && item.response && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-md">
                    <p className="text-xs font-medium mb-1">Payer Response</p>
                    <pre className="text-xs overflow-auto max-h-48">
                      {JSON.stringify(item.response, null, 2)}
                    </pre>
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
