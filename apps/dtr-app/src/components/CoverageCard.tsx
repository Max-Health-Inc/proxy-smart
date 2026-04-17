/**
 * CoverageCard — Displays the patient's insurance coverage(s)
 *
 * Uses PASCoverage typed fields: payor reference, relationship code,
 * plan class, period, and identifier (member ID).
 */
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner } from "@proxy-smart/shared-ui"
import { searchCoverage, type PASCoverage } from "@/lib/fhir-client"
import type { SubscriberRelationshipCode } from "hl7.fhir.us.davinci-dtr-generated/valuesets/ValueSet-SubscriberRelationship"
import { Shield, Building2, Calendar, CreditCard, Users } from "lucide-react"

interface CoverageCardProps {
  patientId: string
}

export function CoverageCard({ patientId }: CoverageCardProps) {
  const [coverages, setCoverages] = useState<PASCoverage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    searchCoverage(patientId)
      .then(setCoverages)
      .catch(() => setCoverages([]))
      .finally(() => setLoading(false))
  }, [patientId])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6 gap-2">
          <Spinner size="sm" />
          <span className="text-sm text-muted-foreground">Loading coverage...</span>
        </CardContent>
      </Card>
    )
  }

  if (coverages.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6 gap-2">
          <Shield className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No active coverage found</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {coverages.map((cov) => (
        <CoverageItem key={cov.id} coverage={cov} />
      ))}
    </div>
  )
}

function CoverageItem({ coverage }: { coverage: PASCoverage }) {
  const payorName = coverage.payor?.[0]?.display ?? "Unknown Payer"
  const memberId = coverage.identifier?.[0]?.value
  const relationship = coverage.relationship?.coding?.[0]?.code ?? "self"
  const planClass = coverage.class?.find(c => c.type?.coding?.[0]?.code === "plan")
  const groupClass = coverage.class?.find(c => c.type?.coding?.[0]?.code === "group")
  const periodStart = coverage.period?.start
  const periodEnd = coverage.period?.end

  const relationLabel: Record<SubscriberRelationshipCode, string> = {
    self: "Self",
    spouse: "Spouse",
    child: "Child",
    parent: "Parent",
    common: "Common Law",
    other: "Other",
    injured: "Injured Party",
  }

  return (
    <Card className="border-l-4 border-l-primary/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="size-4 text-primary shrink-0" />
            {planClass?.name ?? coverage.type?.text ?? "Health Insurance"}
          </CardTitle>
          <Badge variant="success" className="text-xs">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="size-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium">{payorName}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {memberId && (
            <div className="flex items-center gap-1.5">
              <CreditCard className="size-3 shrink-0" />
              <span>ID: <span className="font-mono font-medium text-foreground">{memberId}</span></span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users className="size-3 shrink-0" />
            <span>{relationLabel[relationship] ?? relationship}</span>
          </div>
          {groupClass && (
            <div className="col-span-2 flex items-center gap-1.5">
              <span>Group: <span className="font-medium text-foreground">{groupClass.name ?? groupClass.value}</span></span>
            </div>
          )}
          {(periodStart || periodEnd) && (
            <div className="col-span-2 flex items-center gap-1.5">
              <Calendar className="size-3 shrink-0" />
              <span>
                {periodStart && new Date(periodStart).toLocaleDateString()}
                {periodStart && periodEnd && " – "}
                {periodEnd && new Date(periodEnd).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
