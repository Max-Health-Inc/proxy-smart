import { formatHumanName, type Person } from "@/lib/fhir-client"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@max-health-inc/shared-ui"
import { User, Mail, Phone, Calendar } from "lucide-react"

export function PersonCard({ person }: { person: Person }) {
  const name = formatHumanName(person.name)
  const email = person.telecom?.find((t) => t.system === "email")?.value
  const phone = person.telecom?.find((t) => t.system === "phone")?.value
  const patientCount = person.link?.filter((l) => l.target?.reference?.startsWith("Patient/")).length ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-5" />
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {email && (
            <span className="flex items-center gap-1.5">
              <Mail className="size-3.5" />
              {email}
            </span>
          )}
          {phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {phone}
            </span>
          )}
          {person.birthDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {person.birthDate}
            </span>
          )}
          <Badge variant="secondary">{patientCount} linked patient{patientCount !== 1 ? "s" : ""}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
