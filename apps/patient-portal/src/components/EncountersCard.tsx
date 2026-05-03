import { Card, CardContent, CardHeader, CardTitle, Badge } from "@proxy-smart/shared-ui"
import { CalendarDays } from "lucide-react"
import { format } from "date-fns"
import type { Encounter } from "@/lib/fhir-client"
import { RecordName, type AnyResource } from "@/lib/ips-display-helpers"
import { useTranslation } from "react-i18next"

// ── Helpers ──────────────────────────────────────────────────────────────────

function getEncounterTitle(enc: Encounter): string {
  return enc.type?.[0]?.text ?? enc.type?.[0]?.coding?.[0]?.display ?? "Visit"
}

function getEncounterClass(enc: Encounter): string | undefined {
  return enc.class?.display ?? enc.class?.code
}

function getParticipantName(enc: Encounter): string | undefined {
  return enc.participant?.[0]?.individual?.display
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  finished: "secondary",
  "in-progress": "default",
  planned: "outline",
  arrived: "outline",
  cancelled: "destructive",
  "entered-in-error": "destructive",
}

// ── Component ────────────────────────────────────────────────────────────────

interface EncountersCardProps {
  encounters: Encounter[]
  onOpenDetail: (title: string, resource: AnyResource) => void
}

export function EncountersCard({ encounters, onOpenDetail }: EncountersCardProps) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="size-4 text-blue-500" />
          {t("encounters.title", "Visit History")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {encounters.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("encounters.noEncounters", "No visits on record")}</p>
        ) : (
          <ul className="space-y-2">
            {encounters.map((enc, i) => {
              const title = getEncounterTitle(enc)
              const encClass = getEncounterClass(enc)
              const participant = getParticipantName(enc)
              return (
                <li key={enc.id || i} className="text-sm">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <RecordName resource={enc as AnyResource} onOpen={onOpenDetail}>
                      {title}
                    </RecordName>
                    {enc.status && (
                      <Badge variant={STATUS_VARIANT[enc.status] ?? "outline"} className="text-xs">
                        {enc.status}
                      </Badge>
                    )}
                    {encClass && (
                      <span className="text-xs text-muted-foreground">({encClass})</span>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs ml-2">
                    {enc.period?.start && format(new Date(enc.period.start), "MMM d, yyyy")}
                    {participant && ` \u00b7 ${participant}`}
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
