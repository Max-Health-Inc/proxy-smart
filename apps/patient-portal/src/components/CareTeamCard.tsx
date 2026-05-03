import { Card, CardContent, CardHeader, CardTitle } from "@max-health-inc/shared-ui"
import { Users } from "lucide-react"
import type { Organization, Practitioner } from "@/lib/fhir-client"
import { formatHumanName } from "@/lib/fhir-client"
import { RecordName, type AnyResource } from "@/lib/ips-display-helpers"
import { useTranslation } from "react-i18next"

// ── Component ────────────────────────────────────────────────────────────────

interface CareTeamCardProps {
  practitioners: Practitioner[]
  organizations: Organization[]
  onOpenDetail: (title: string, resource: AnyResource) => void
}

export function CareTeamCard({ practitioners, organizations, onOpenDetail }: CareTeamCardProps) {
  const { t } = useTranslation()
  const hasPractitioners = practitioners.length > 0
  const hasOrgs = organizations.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-indigo-500" />
          {t("careTeam.title", "Care Team")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasPractitioners && !hasOrgs ? (
          <p className="text-sm text-muted-foreground">{t("careTeam.noCareTeam", "No care team information")}</p>
        ) : (
          <div className="space-y-3">
            {hasPractitioners && (
              <ul className="space-y-1.5">
                {practitioners.map((pr, i) => {
                  const name = pr.name?.length ? formatHumanName(pr.name) : "Unknown Practitioner"
                  const qualification = pr.qualification?.[0]?.code?.coding?.[0]?.display
                  return (
                    <li key={pr.id || i} className="text-sm">
                      <RecordName resource={pr as AnyResource} onOpen={onOpenDetail}>
                        {name}
                      </RecordName>
                      {qualification && (
                        <span className="text-muted-foreground text-xs ml-2">{qualification}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {hasOrgs && (
              <>
                {hasPractitioners && <div className="border-t border-border" />}
                <ul className="space-y-1.5">
                  {organizations.map((org, i) => (
                    <li key={org.id || i} className="text-sm">
                      <RecordName resource={org as AnyResource} onOpen={onOpenDetail}>
                        {org.name ?? "Unknown Organization"}
                      </RecordName>
                      {org.type?.[0]?.coding?.[0]?.display && (
                        <span className="text-muted-foreground text-xs ml-2">
                          ({org.type[0].coding[0].display})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
