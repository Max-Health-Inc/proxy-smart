import { Card, CardContent, Badge } from "@proxy-smart/shared-ui"
import { formatHumanName, type Patient } from "@/lib/fhir-client"
import { User } from "lucide-react"
import { format, differenceInYears } from "date-fns"

interface PatientBannerProps {
  patient: Patient
}

export function PatientBanner({ patient }: PatientBannerProps) {
  const name = formatHumanName(patient.name)
  const birthDate = patient.birthDate ? new Date(patient.birthDate) : null
  const age = birthDate ? differenceInYears(new Date(), birthDate) : null

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex items-center justify-center size-12 rounded-full bg-muted">
          <User className="size-6 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{name}</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {birthDate && (
              <span>{format(birthDate, "MMM d, yyyy")}{age !== null && ` (${age} years)`}</span>
            )}
            {patient.gender && <Badge variant="outline">{patient.gender}</Badge>}
            {patient.identifier?.[0]?.value && (
              <span className="font-mono text-xs">MRN: {patient.identifier[0].value}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
