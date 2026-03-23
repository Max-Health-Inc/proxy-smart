import type { Patient } from "fhir/r4"
import type { LaunchMode } from "hl7.fhir.us.davinci-pas-generated/fhir-client"
import { Card, CardContent, Button, Badge } from "@proxy-smart/shared-ui"
import { formatHumanName } from "@/lib/fhir-client"
import { User, Calendar, Hash, X } from "lucide-react"

interface PatientBannerProps {
  patient: Patient
  launchMode: LaunchMode
  onClear?: () => void
}

export function PatientBanner({ patient, launchMode, onClear }: PatientBannerProps) {
  const name = formatHumanName(patient.name)
  const mrn = patient.identifier?.[0]?.value

  return (
    <Card className="bg-accent/30">
      <CardContent className="py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{name}</span>
              <Badge variant="outline" className="text-xs">
                {launchMode === "ehr" ? "EHR Context" : "Selected"}
              </Badge>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              {patient.birthDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {patient.birthDate}
                </span>
              )}
              {mrn && (
                <span className="flex items-center gap-1">
                  <Hash className="size-3" />
                  MRN: {mrn}
                </span>
              )}
              {patient.gender && <span className="capitalize">{patient.gender}</span>}
            </div>
          </div>
        </div>
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="size-4" />
            Change Patient
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
