import { useState, useEffect } from "react"
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
  type UserProfileData,
} from "@proxy-smart/shared-ui"
import { updatePatient, type Patient } from "@/lib/fhir-client"
import { Loader2, Phone, MapPin } from "lucide-react"

interface PatientEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: Patient
  onUpdated: (patient: Patient) => void
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

/** Apply profile edits back onto the original Patient resource (immutable) */
function applyEdits(
  original: Patient,
  profile: UserProfileData,
  phone: string,
  address: ReturnType<typeof extractAddress>
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

  return updated
}

export function PatientEditModal({
  open,
  onOpenChange,
  patient,
  onUpdated,
}: PatientEditModalProps) {
  const [profile, setProfile] = useState<UserProfileData>(() => extractProfileData(patient))
  const [phone, setPhone] = useState(() => extractPhone(patient))
  const [address, setAddress] = useState(() => extractAddress(patient))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when patient changes
  useEffect(() => {
    setProfile(extractProfileData(patient))
    setPhone(extractPhone(patient))
    setAddress(extractAddress(patient))
    setError(null)
  }, [patient])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = applyEdits(patient, profile, phone, address)
      const result = await updatePatient(patient.id!, updated)
      onUpdated(result)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update patient")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your personal information. Changes will be saved to your health record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Shared profile fields (first name, last name, email) */}
          <UserProfileFormFields
            values={profile}
            onChange={(field, value) => setProfile((p) => ({ ...p, [field]: value }))}
          />

          {/* Patient-specific: phone */}
          <div className="space-y-2">
            <Label htmlFor="patient-phone" className="flex items-center gap-1.5">
              <Phone className="size-3.5" />
              Phone
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
              Address
            </legend>
            <Input
              placeholder="Street address"
              value={address.line}
              onChange={(e) => setAddress((a) => ({ ...a, line: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="City"
                value={address.city}
                onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
              />
              <Input
                placeholder="State / Province"
                value={address.state}
                onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Postal code"
                value={address.postalCode}
                onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
              />
              <Input
                placeholder="Country"
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
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
