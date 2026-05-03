import { Card, CardContent, CardHeader, CardTitle, Badge } from "@max-health-inc/shared-ui"
import { Stethoscope, Laptop } from "lucide-react"
import { format } from "date-fns"
import type { MedicationRequest, DeviceUseStatement } from "@/lib/fhir-client"
import { RecordName, getDeviceStatusStyle, type AnyResource, type DeviceStatementStatusCode } from "@/lib/ips-display-helpers"
import { useTranslation } from "react-i18next"

// ── Prescriptions ────────────────────────────────────────────────────────────

interface PrescriptionsCardProps {
  prescriptions: MedicationRequest[]
  onOpenDetail: (title: string, resource: AnyResource) => void
}

export function PrescriptionsCard({ prescriptions, onOpenDetail }: PrescriptionsCardProps) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Stethoscope className="size-4 text-cyan-500" />
          {t("dashboard.prescribedMedications")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {prescriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.noActivePrescriptions")}</p>
        ) : (
          <ul className="space-y-2">
            {prescriptions.map((rx, i) => (
              <li key={rx.id || i} className="text-sm min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <RecordName resource={rx} onOpen={onOpenDetail}>
                    {rx.medicationCodeableConcept?.coding?.[0]?.display ||
                      rx.medicationCodeableConcept?.text || t("dashboard.unknownMedication")}
                  </RecordName>
                  {rx.authoredOn && (
                    <span className="text-muted-foreground text-xs">
                      {format(new Date(rx.authoredOn), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                {rx.dosageInstruction?.[0]?.text && (
                  <p className="text-muted-foreground text-xs truncate">— {rx.dosageInstruction[0].text}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ── Medical Devices ──────────────────────────────────────────────────────────

interface DevicesCardProps {
  devices: DeviceUseStatement[]
  onOpenDetail: (title: string, resource: AnyResource) => void
}

export function DevicesCard({ devices, onOpenDetail }: DevicesCardProps) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Laptop className="size-4 text-slate-500" />
          {t("dashboard.medicalDevices")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.noDeviceRecords")}</p>
        ) : (
          <ul className="space-y-2">
            {devices.map((du, i) => (
              <li key={du.id || i} className="text-sm flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0">
                <RecordName resource={du} onOpen={onOpenDetail}>
                  {du.device?.display || du.device?.reference || t("dashboard.unknownDevice")}
                </RecordName>
                {du.timingPeriod?.start && (
                  <span className="text-muted-foreground text-xs">
                    {t("common.since", { date: format(new Date(du.timingPeriod.start), "MMM d, yyyy") })}
                  </span>
                )}
                {du.status && (
                  <Badge variant={getDeviceStatusStyle(du.status as DeviceStatementStatusCode)} className="text-xs">{du.status}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
