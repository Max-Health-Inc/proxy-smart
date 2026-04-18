import { Card, CardContent, CardHeader, CardTitle, Badge } from "@proxy-smart/shared-ui"
import { ShieldCheck } from "lucide-react"
import { format } from "date-fns"
import type { Coverage } from "@/lib/fhir-client"
import { RecordName, type AnyResource } from "@/lib/ips-display-helpers"
import { useTranslation } from "react-i18next"

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCoverageTitle(cov: Coverage): string {
  // Try plan class first, then type display, then status
  const planClass = cov.class?.find(c => c.type?.coding?.some(cd => cd.code === "plan"))
  if (planClass?.name) return planClass.name
  return cov.type?.coding?.[0]?.display ?? cov.type?.text ?? "Health Insurance"
}

function getMemberId(cov: Coverage): string | undefined {
  return cov.identifier?.[0]?.value
}

function getGroupName(cov: Coverage): string | undefined {
  const group = cov.class?.find(c => c.type?.coding?.some(cd => cd.code === "group"))
  return group?.name
}

function getPayerName(cov: Coverage): string | undefined {
  return cov.payor?.[0]?.display
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  cancelled: "destructive",
  "entered-in-error": "destructive",
  draft: "secondary",
}

// ── Component ────────────────────────────────────────────────────────────────

interface CoverageCardProps {
  coverages: Coverage[]
  onOpenDetail: (title: string, resource: AnyResource) => void
}

export function CoverageCard({ coverages, onOpenDetail }: CoverageCardProps) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-emerald-500" />
          {t("coverage.title", "Insurance")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {coverages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("coverage.noCoverage", "No insurance on file")}</p>
        ) : (
          <ul className="space-y-3">
            {coverages.map((cov, i) => {
              const title = getCoverageTitle(cov)
              const memberId = getMemberId(cov)
              const group = getGroupName(cov)
              const payer = getPayerName(cov)
              return (
                <li key={cov.id || i} className="text-sm space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <RecordName resource={cov as AnyResource} onOpen={onOpenDetail}>
                      {title}
                    </RecordName>
                    {cov.status && (
                      <Badge variant={STATUS_VARIANT[cov.status] ?? "outline"} className="text-xs">
                        {cov.status}
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs space-y-0.5 ml-2">
                    {payer && <div>{payer}</div>}
                    {memberId && <div>Member ID: {memberId}</div>}
                    {group && <div>Group: {group}</div>}
                    {cov.period?.start && (
                      <div>
                        {format(new Date(cov.period.start), "MMM d, yyyy")}
                        {cov.period.end && ` \u2013 ${format(new Date(cov.period.end), "MMM d, yyyy")}`}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
