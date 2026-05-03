import { PatientBanner as SharedPatientBanner, Button } from "@max-health-inc/shared-ui"
import type { Patient } from "@/lib/fhir-client"
import { Pencil } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { PatientEditModal } from "@/components/PatientEditModal"

interface PatientBannerProps {
  patient: Patient
  bloodType?: string | null
  onPatientUpdated?: (patient: Patient) => void
}

export function PatientBanner({ patient, bloodType, onPatientUpdated }: PatientBannerProps) {
  const [editOpen, setEditOpen] = useState(false)
  const { t } = useTranslation()

  return (
    <>
      <SharedPatientBanner
        patient={patient}
        bloodType={bloodType}
        formatAge={(age) => t("patientBanner.age", { age })}
        formatDate={(date) => format(date, "MMM d, yyyy")}
        formatMrn={(value) => t("patientBanner.mrn", { value })}
        formatBirthSex={(value) => t("patientBanner.saab", { value })}
        actions={onPatientUpdated ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditOpen(true)}
            title={t("patientBanner.editProfile")}
          >
            <Pencil className="size-4" />
          </Button>
        ) : undefined}
      />

      {editOpen && (
        <PatientEditModal
          key={patient.id}
          open={editOpen}
          onOpenChange={setEditOpen}
          patient={patient}
          onUpdated={(updated) => onPatientUpdated?.(updated)}
        />
      )}
    </>
  )
}
