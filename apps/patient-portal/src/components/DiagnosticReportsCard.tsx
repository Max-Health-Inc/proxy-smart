import { Card, CardContent, CardHeader, CardTitle, Badge } from "@proxy-smart/shared-ui"
import { ClipboardList } from "lucide-react"
import { format } from "date-fns"
import type { DiagnosticReport } from "@/lib/fhir-client"
import { RecordName, type AnyResource } from "@/lib/ips-display-helpers"
import { useTranslation } from "react-i18next"

// ── Helpers ──────────────────────────────────────────────────────────────────

function getReportTitle(report: DiagnosticReport): string {
  return (
    report.code?.coding?.[0]?.display ??
    report.code?.text ??
    report.category?.[0]?.coding?.[0]?.display ??
    "Diagnostic Report"
  )
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  final: "default",
  preliminary: "outline",
  registered: "secondary",
  amended: "outline",
  cancelled: "destructive",
  "entered-in-error": "destructive",
}

// ── Component ────────────────────────────────────────────────────────────────

interface DiagnosticReportsCardProps {
  reports: DiagnosticReport[]
  onOpenDetail: (title: string, resource: AnyResource) => void
}

export function DiagnosticReportsCard({ reports, onOpenDetail }: DiagnosticReportsCardProps) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-4 text-violet-500" />
          {t("diagnosticReports.title", "Diagnostic Reports")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("diagnosticReports.noReports", "No diagnostic reports")}</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((report, i) => {
              const title = getReportTitle(report)
              const performer = report.performer?.[0]?.display
              const date = report.effectiveDateTime ?? report.issued
              return (
                <li key={report.id || i} className="text-sm min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <RecordName resource={report as AnyResource} onOpen={onOpenDetail}>
                      {title}
                    </RecordName>
                    {report.status && (
                      <Badge variant={STATUS_VARIANT[report.status] ?? "outline"} className="text-xs">
                        {report.status}
                      </Badge>
                    )}
                    {report.category?.[0]?.coding?.[0]?.display && (
                      <span className="text-xs text-muted-foreground">
                        ({report.category[0].coding[0].display})
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs ml-2">
                    {date && format(new Date(date), "MMM d, yyyy")}
                    {performer && ` \u00b7 ${performer}`}
                  </div>
                  {report.conclusion && (
                    <p className="text-muted-foreground text-xs ml-2 mt-0.5 line-clamp-2">
                      {report.conclusion}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
