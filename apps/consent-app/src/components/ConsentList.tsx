import type { Consent } from "fhir/r4"
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, CardAction } from "@max-health-inc/shared-ui"
import { format } from "date-fns"
import { ShieldCheck, ShieldOff, User, Clock, Eye } from "lucide-react"

interface ConsentListProps {
  consents: Consent[]
  onRevoke: (consent: Consent) => void
  onView: (consent: Consent) => void
  /** Optional resolver for practitioner display names */
  getActorName?: (consent: Consent) => string
}

function getStatusBadge(status?: string) {
  switch (status) {
    case "active":
      return <Badge variant="success"><ShieldCheck className="size-3" /> Active</Badge>
    case "inactive":
      return <Badge variant="secondary"><ShieldOff className="size-3" /> Revoked</Badge>
    case "proposed":
      return <Badge variant="warning">Proposed</Badge>
    default:
      return <Badge variant="outline">{status ?? "unknown"}</Badge>
  }
}

function getActorDisplay(consent: Consent): string {
  const actor = consent.provision?.actor?.[0]
  return actor?.reference?.display ?? actor?.reference?.reference ?? "Unknown practitioner"
}

function getResourceTypes(consent: Consent): string[] {
  return consent.provision?.class?.map((c) => c.code ?? "").filter(Boolean) ?? []
}

function getPeriod(consent: Consent): string {
  const period = consent.provision?.period
  if (!period) return "No period set"
  const start = period.start ? format(new Date(period.start), "MMM d, yyyy") : "?"
  const end = period.end ? format(new Date(period.end), "MMM d, yyyy") : "No expiry"
  return `${start} — ${end}`
}

export function ConsentList({ consents, onRevoke, onView, getActorName }: ConsentListProps) {
  if (consents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ShieldCheck className="size-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">No consents found</p>
        <p className="text-sm">Create a new consent to grant a practitioner access to your data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {consents.map((consent) => (
        <Card key={consent.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              {getActorName ? getActorName(consent) : getActorDisplay(consent)}
            </CardTitle>
            <CardAction>
              {getStatusBadge(consent.status)}
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {getPeriod(consent)}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Eye className="size-3.5 shrink-0" />
                {getResourceTypes(consent).map((rt) => (
                  <Badge key={rt} variant="outline" className="text-xs">
                    {rt}
                  </Badge>
                ))}
                {getResourceTypes(consent).length === 0 && <span>All resource types</span>}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => onView(consent)}>
                View Details
              </Button>
              {consent.status === "active" && (
                <Button variant="destructive" size="sm" onClick={() => onRevoke(consent)}>
                  Revoke
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
