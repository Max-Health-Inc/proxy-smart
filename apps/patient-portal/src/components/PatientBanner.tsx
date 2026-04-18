import { Card, CardContent, Badge, Button } from "@proxy-smart/shared-ui"
import { formatHumanName, type Patient } from "@/lib/fhir-client"
import type { AdministrativeGenderCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-AdministrativeGender"
import { User, Pencil, Droplets } from "lucide-react"
import { format, differenceInYears } from "date-fns"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { PatientEditModal } from "@/components/PatientEditModal"

interface PatientBannerProps {
  patient: Patient
  bloodType?: string | null
  onPatientUpdated?: (patient: Patient) => void
}

export function PatientBanner({ patient, bloodType, onPatientUpdated }: PatientBannerProps) {
  const [editOpen, setEditOpen] = useState(false)
  const { t } = useTranslation()
  const name = formatHumanName(patient.name)
  const birthDate = patient.birthDate ? new Date(patient.birthDate) : null
  const age = birthDate ? differenceInYears(new Date(), birthDate) : null

  // IPS extensions: gender identity, pronouns, and birth sex
  const genderIdentity = patient.extension?.find(
    e => e.url === "http://hl7.org/fhir/StructureDefinition/individual-genderIdentity"
  )?.valueCodeableConcept?.coding?.[0]?.display
  const pronouns = patient.extension?.find(
    e => e.url === "http://hl7.org/fhir/StructureDefinition/individual-pronouns"
  )?.valueCodeableConcept?.coding?.[0]?.display
  const birthSex = patient.extension?.find(
    e => e.url === "http://hl7.org/fhir/StructureDefinition/patient-birthsex"
      || e.url === "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex"
  )?.valueCode

  return (
    <>
    <Card>
      <CardContent className="flex items-start sm:items-center gap-4 sm:gap-5 py-5 sm:py-6">
        <div className="flex items-center justify-center size-12 sm:size-14 rounded-full bg-muted shrink-0">
          <User className="size-6 sm:size-7 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold truncate">{name}</h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-muted-foreground">
            {birthDate && (
              <span>{format(birthDate, "MMM d, yyyy")}{age !== null && ` (${t("patientBanner.age", { age })})`}</span>
            )}
            {patient.gender && <Badge variant="outline">{(patient.gender as AdministrativeGenderCode)}</Badge>}
            {genderIdentity && genderIdentity.toLowerCase() !== patient.gender?.toLowerCase() && (
              <Badge variant="outline">{genderIdentity}</Badge>
            )}
            {birthSex && <Badge variant="secondary" title="Sex assigned at birth">{t("patientBanner.saab", { value: birthSex })}</Badge>}
            {pronouns && <Badge variant="secondary">{pronouns}</Badge>}
            {bloodType && (
              <Badge variant="outline" className="gap-1"><Droplets className="size-3" />{bloodType}</Badge>
            )}
          </div>
          {patient.identifier?.[0]?.value && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-mono">{t("patientBanner.mrn", { value: patient.identifier[0].value })}</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditOpen(true)}
          title={t("patientBanner.editProfile")}
        >
          <Pencil className="size-4" />
        </Button>
      </CardContent>
    </Card>

    {editOpen && (
      <PatientEditModal
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
        onUpdated={(updated) => onPatientUpdated?.(updated)}
      />
    )}
    </>
  )
}
