import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  UserProfileFormFields,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type UserProfileData,
} from "@max-health-inc/shared-ui"
import { updatePatient, type Patient } from "@/lib/fhir-client"
import { Loader2, Phone, MapPin, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { AdministrativeGenderCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-AdministrativeGender"

interface PatientEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: Patient
  onUpdated: (patient: Patient) => void
}

// ── FHIR extension URLs ──────────────────────────────────────────────────────

const GENDER_IDENTITY_URL = "http://hl7.org/fhir/StructureDefinition/individual-genderIdentity"
const PRONOUNS_URL = "http://hl7.org/fhir/StructureDefinition/individual-pronouns"

const GENDER_OPTIONS: { value: AdministrativeGenderCode; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
]

const GENDER_IDENTITY_OPTIONS = [
  { value: "male", label: "Male", system: "http://hl7.org/fhir/gender-identity", code: "male" },
  { value: "female", label: "Female", system: "http://hl7.org/fhir/gender-identity", code: "female" },
  { value: "non-binary", label: "Non-binary", system: "http://hl7.org/fhir/gender-identity", code: "non-binary" },
  { value: "transgender-male", label: "Transgender male", system: "http://hl7.org/fhir/gender-identity", code: "transgender-male" },
  { value: "transgender-female", label: "Transgender female", system: "http://hl7.org/fhir/gender-identity", code: "transgender-female" },
  { value: "other", label: "Other", system: "http://hl7.org/fhir/gender-identity", code: "other" },
  { value: "non-disclose", label: "Prefer not to disclose", system: "http://hl7.org/fhir/gender-identity", code: "non-disclose" },
]

const PRONOUN_OPTIONS = [
  { value: "he-him", label: "he/him/his", system: "http://loinc.org", code: "LA29518-0", display: "he/him/his" },
  { value: "she-her", label: "she/her/hers", system: "http://loinc.org", code: "LA29519-8", display: "she/her/hers" },
  { value: "they-them", label: "they/them/theirs", system: "http://loinc.org", code: "LA29520-6", display: "they/them/theirs" },
  { value: "other", label: "Other", system: "http://loinc.org", code: "other", display: "Other" },
]

interface DemographicsData {
  gender: AdministrativeGenderCode | ""
  genderIdentity: string  // value key from GENDER_IDENTITY_OPTIONS
  pronouns: string        // value key from PRONOUN_OPTIONS
}

/** Extract profile fields from a FHIR Patient resource */
function extractProfileData(patient: Patient): UserProfileData {
  const name = patient.name?.[0]
  return {
    firstName: name?.given?.join(" ") ?? "",
    lastName: name?.family ?? "",
    email:
      patient.telecom?.find((t) => t.system === "email")?.value ?? "",
  }
}

/** Extract phone from Patient telecom */
function extractPhone(patient: Patient): string {
  return patient.telecom?.find((t) => t.system === "phone")?.value ?? ""
}

/** Extract first address line from Patient */
function extractAddress(patient: Patient) {
  const addr = patient.address?.[0]
  return {
    line: addr?.line?.join(", ") ?? "",
    city: addr?.city ?? "",
    state: addr?.state ?? "",
    postalCode: addr?.postalCode ?? "",
    country: addr?.country ?? "",
  }
}

/** Extract gender, gender identity, and pronouns from Patient */
function extractDemographics(patient: Patient): DemographicsData {
  const giCode = patient.extension?.find(e => e.url === GENDER_IDENTITY_URL)
    ?.valueCodeableConcept?.coding?.[0]?.code ?? ""
  const pCode = patient.extension?.find(e => e.url === PRONOUNS_URL)
    ?.valueCodeableConcept?.coding?.[0]?.code ?? ""
  return {
    gender: (patient.gender as AdministrativeGenderCode) ?? "",
    genderIdentity: GENDER_IDENTITY_OPTIONS.find(o => o.code === giCode)?.value ?? "",
    pronouns: PRONOUN_OPTIONS.find(o => o.code === pCode)?.value ?? "",
  }
}

/** Apply profile edits back onto the original Patient resource (immutable) */
function applyEdits(
  original: Patient,
  profile: UserProfileData,
  phone: string,
  address: ReturnType<typeof extractAddress>,
  demographics: DemographicsData,
): Patient {
  const updated = structuredClone(original)

  // ── Name ───────────────────────────────────
  if (!updated.name?.length) updated.name = [{}]
  updated.name[0].given = profile.firstName.split(" ").filter(Boolean)
  updated.name[0].family = profile.lastName

  // ── Telecom (email + phone) ────────────────
  const telecom = [...(updated.telecom ?? [])]
  const emailIdx = telecom.findIndex((t) => t.system === "email")
  if (profile.email) {
    if (emailIdx >= 0) telecom[emailIdx] = { ...telecom[emailIdx], value: profile.email }
    else telecom.push({ system: "email", value: profile.email })
  }
  const phoneIdx = telecom.findIndex((t) => t.system === "phone")
  if (phone) {
    if (phoneIdx >= 0) telecom[phoneIdx] = { ...telecom[phoneIdx], value: phone }
    else telecom.push({ system: "phone", value: phone })
  }
  updated.telecom = telecom

  // ── Address ────────────────────────────────
  const hasAddress = address.line || address.city || address.state || address.postalCode || address.country
  if (hasAddress) {
    if (!updated.address?.length) updated.address = [{}]
    updated.address[0].line = address.line ? address.line.split(",").map((s) => s.trim()) : []
    updated.address[0].city = address.city || undefined
    updated.address[0].state = address.state || undefined
    updated.address[0].postalCode = address.postalCode || undefined
    updated.address[0].country = address.country || undefined
  }

  // ── Gender (administrative gender is read-only — not modified) ──

  // ── Extensions (gender identity + pronouns) ─
  const extensions = [...(updated.extension ?? [])]

  // Gender identity
  const giIdx = extensions.findIndex(e => e.url === GENDER_IDENTITY_URL)
  const giOption = GENDER_IDENTITY_OPTIONS.find(o => o.value === demographics.genderIdentity)
  if (giOption) {
    const ext = {
      url: GENDER_IDENTITY_URL,
      valueCodeableConcept: {
        coding: [{ system: giOption.system, code: giOption.code, display: giOption.label }],
      },
    }
    if (giIdx >= 0) extensions[giIdx] = ext
    else extensions.push(ext)
  } else if (giIdx >= 0) {
    extensions.splice(giIdx, 1) // remove if cleared
  }

  // Pronouns
  const pIdx = extensions.findIndex(e => e.url === PRONOUNS_URL)
  const pOption = PRONOUN_OPTIONS.find(o => o.value === demographics.pronouns)
  if (pOption) {
    const ext = {
      url: PRONOUNS_URL,
      valueCodeableConcept: {
        coding: [{ system: pOption.system, code: pOption.code, display: pOption.display }],
      },
    }
    if (pIdx >= 0) extensions[pIdx] = ext
    else extensions.push(ext)
  } else if (pIdx >= 0) {
    extensions.splice(pIdx, 1) // remove if cleared
  }

  updated.extension = extensions.length > 0 ? extensions : undefined

  return updated
}

export function PatientEditModal({
  open,
  onOpenChange,
  patient,
  onUpdated,
}: PatientEditModalProps) {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<UserProfileData>(() => extractProfileData(patient))
  const [phone, setPhone] = useState(() => extractPhone(patient))
  const [address, setAddress] = useState(() => extractAddress(patient))
  const [demographics, setDemographics] = useState(() => extractDemographics(patient))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = applyEdits(patient, profile, phone, address, demographics)
      const result = await updatePatient(patient.id!, updated)
      onUpdated(result)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("patientEdit.failedToUpdate"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("patientEdit.title")}</DialogTitle>
          <DialogDescription>
            {t("patientEdit.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Shared profile fields (first name, last name, email) */}
          <UserProfileFormFields
            values={profile}
            onChange={(field, value) => setProfile((p) => ({ ...p, [field]: value }))}
          />

          {/* Gender, Gender Identity, Pronouns */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium flex items-center gap-1.5">
              <User className="size-3.5" />
              {t("patientEdit.genderAndIdentity")}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="patient-gender" className="text-xs text-muted-foreground">{t("patientEdit.adminGender")}</Label>
                <Input
                  id="patient-gender"
                  value={GENDER_OPTIONS.find(o => o.value === demographics.gender)?.label ?? demographics.gender ?? "—"}
                  disabled
                  className="text-sm bg-muted cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="patient-gi" className="text-xs text-muted-foreground">{t("patientEdit.genderIdentity")}</Label>
                <Select
                  value={demographics.genderIdentity}
                  onValueChange={(v) => setDemographics((d) => ({ ...d, genderIdentity: v }))}
                >
                  <SelectTrigger id="patient-gi"><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {GENDER_IDENTITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="patient-pronouns" className="text-xs text-muted-foreground">{t("patientEdit.pronouns")}</Label>
                <Select
                  value={demographics.pronouns}
                  onValueChange={(v) => setDemographics((d) => ({ ...d, pronouns: v }))}
                >
                  <SelectTrigger id="patient-pronouns"><SelectValue placeholder={t("common.selectPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {PRONOUN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          {/* Patient-specific: phone */}
          <div className="space-y-2">
            <Label htmlFor="patient-phone" className="flex items-center gap-1.5">
              <Phone className="size-3.5" />
              {t("patientEdit.phone")}
            </Label>
            <Input
              id="patient-phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Patient-specific: address */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {t("patientEdit.address")}
            </legend>
            <Input
              placeholder={t("patientEdit.streetAddress")}
              value={address.line}
              onChange={(e) => setAddress((a) => ({ ...a, line: e.target.value }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder={t("patientEdit.city")}
                value={address.city}
                onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
              />
              <Input
                placeholder={t("patientEdit.stateProvince")}
                value={address.state}
                onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder={t("patientEdit.postalCode")}
                value={address.postalCode}
                onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
              />
              <Input
                placeholder={t("patientEdit.country")}
                value={address.country}
                onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
              />
            </div>
          </fieldset>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("common.saving")}
              </>
            ) : (
              t("patientEdit.saveChanges")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
