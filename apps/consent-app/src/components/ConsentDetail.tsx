import type { Consent } from "fhir/r4"
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@max-health-inc/shared-ui"
import { format } from "date-fns"
import { ArrowLeft, ShieldCheck, ShieldOff, Clock, User, Eye, FileJson } from "lucide-react"
import { useState } from "react"

interface ConsentDetailProps {
  consent: Consent
  onBack: () => void
  onRevoke: (consent: Consent) => void
}

export function ConsentDetail({ consent, onBack, onRevoke }: ConsentDetailProps) {
  const [showJson, setShowJson] = useState(false)

  const actor = consent.provision?.actor?.[0]
  const actorDisplay = actor?.reference?.display ?? actor?.reference?.reference ?? "Unknown"
  const resourceTypes = consent.provision?.class?.map((c) => c.code ?? "").filter(Boolean) ?? []
  const period = consent.provision?.period
  const action = consent.provision?.action?.[0]?.coding?.[0]?.code ?? "access"
  const isActive = consent.status === "active"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-5" />
        </Button>
        <h2 className="text-xl font-semibold">Consent Details</h2>
        {isActive ? (
          <Badge variant="success"><ShieldCheck className="size-3" /> Active</Badge>
        ) : (
          <Badge variant="secondary"><ShieldOff className="size-3" /> Revoked</Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              Practitioner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{actorDisplay}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Action: <span className="capitalize">{action}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" />
              Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-medium">From:</span>{" "}
              {period?.start ? format(new Date(period.start), "MMMM d, yyyy") : "Not set"}
            </p>
            <p className="text-sm mt-1">
              <span className="font-medium">Until:</span>{" "}
              {period?.end ? format(new Date(period.end), "MMMM d, yyyy") : "No expiry"}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="size-4" />
              Accessible Resource Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {resourceTypes.length > 0 ? (
                resourceTypes.map((rt) => (
                  <Badge key={rt} variant="outline">
                    {rt}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">All resource types</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        {isActive && (
          <Button variant="destructive" onClick={() => onRevoke(consent)}>
            Revoke Consent
          </Button>
        )}
        <Button variant="outline" onClick={() => setShowJson((prev) => !prev)}>
          <FileJson className="size-4" />
          {showJson ? "Hide" : "Show"} FHIR JSON
        </Button>
      </div>

      {showJson && (
        <Card>
          <CardContent className="pt-6">
            <pre className="text-xs overflow-auto max-h-96 bg-muted p-4 rounded-lg">
              {JSON.stringify(consent, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
