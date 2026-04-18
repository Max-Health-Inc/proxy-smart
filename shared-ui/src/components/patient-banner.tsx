import type { ReactNode } from "react"
import { Card, CardContent } from "./card"
import { Badge } from "./badge"
import { User, Droplets } from "lucide-react"
import { formatHumanName } from "../lib/fhir-helpers"

// ── Generic FHIR Patient shape (works with R4, IPS, or any conformant type) ─

export interface BannerPatient {
  name?: Array<{ use?: string; text?: string; family?: string; given?: string[]; prefix?: string[]; suffix?: string[] }>
  birthDate?: string
  gender?: string
  identifier?: Array<{ value?: string; system?: string }>
  extension?: Array<{ url: string; valueCodeableConcept?: { coding?: Array<{ display?: string }> }; valueCode?: string }>
}

export interface PatientBannerProps {
  patient: BannerPatient
  bloodType?: string | null
  /** Optional actions rendered on the right side (e.g. edit button) */
  actions?: ReactNode
  /** Format age string — defaults to "${age} yo" */
  formatAge?: (age: number) => string
  /** Format birth date — defaults to "MMM d, yyyy" style */
  formatDate?: (date: Date) => string
  /** Label for MRN — defaults to "MRN: ${value}" */
  formatMrn?: (value: string) => string
  /** Label prefix for sex assigned at birth — defaults to "SAAB: ${value}" */
  formatBirthSex?: (value: string) => string
}

function defaultFormatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function differenceInYears(a: Date, b: Date): number {
  let years = a.getFullYear() - b.getFullYear()
  const m = a.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && a.getDate() < b.getDate())) years--
  return years
}

export function PatientBanner({
  patient,
  bloodType,
  actions,
  formatAge = (age) => `${age} yo`,
  formatDate = defaultFormatDate,
  formatMrn = (v) => `MRN: ${v}`,
  formatBirthSex = (v) => `SAAB: ${v}`,
}: PatientBannerProps) {
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
    <Card>
      <CardContent className="flex items-start sm:items-center gap-4 sm:gap-5 py-5 sm:py-6">
        <div className="flex items-center justify-center size-12 sm:size-14 rounded-full bg-muted shrink-0">
          <User className="size-6 sm:size-7 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold truncate">{name}</h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-muted-foreground">
            {birthDate && (
              <span>{formatDate(birthDate)}{age !== null && ` (${formatAge(age)})`}</span>
            )}
            {patient.gender && <Badge variant="outline">{patient.gender}</Badge>}
            {genderIdentity && genderIdentity.toLowerCase() !== patient.gender?.toLowerCase() && (
              <Badge variant="outline">{genderIdentity}</Badge>
            )}
            {birthSex && <Badge variant="secondary" title="Sex assigned at birth">{formatBirthSex(birthSex)}</Badge>}
            {pronouns && <Badge variant="secondary">{pronouns}</Badge>}
            {bloodType && (
              <Badge variant="outline" className="gap-1"><Droplets className="size-3" />{bloodType}</Badge>
            )}
          </div>
          {patient.identifier?.[0]?.value && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-mono">{formatMrn(patient.identifier[0].value)}</span>
            </div>
          )}
        </div>
        {actions}
      </CardContent>
    </Card>
  )
}
