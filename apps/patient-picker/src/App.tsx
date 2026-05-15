import { useState, useMemo, useCallback } from "react"
import { getPickerParams } from "@/lib/picker-params"
import { PatientList } from "@/components/PatientList"
import { formatHumanName, AppHeader, Button } from "@proxy-smart/shared-ui"
import { UserSearch, AlertTriangle, CheckCircle2, LogIn } from "lucide-react"
import type { Patient } from "@/lib/fhir-client"
import "./index.css"

export default function App() {
  const params = useMemo(() => getPickerParams(), [])
  const [selected, setSelected] = useState<Patient | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  const handleSessionExpired = useCallback(() => {
    setSessionExpired(true)
    // Auto-redirect after a short delay so user sees the message
    setTimeout(() => {
      window.location.href = window.location.origin
    }, 3000)
  }, [])

  if (!params) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Patient Picker" icon={UserSearch} authenticated={false} maxWidth="max-w-2xl" />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">Invalid Request</h2>
            <p className="text-muted-foreground">
              Missing session, code, or aud parameter. This page should only be accessed during a SMART authorization flow.
            </p>
          </div>
        </main>
      </div>
    )
  }

  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Session Expired" icon={UserSearch} authenticated={false} maxWidth="max-w-2xl" />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-12 w-12 text-warning" />
            <h2 className="text-xl font-semibold">Session Expired</h2>
            <p className="text-muted-foreground">
              Your authorization session has expired. Redirecting you to restart the login flow...
            </p>
            <Button
              variant="default"
              size="lg"
              onClick={() => { window.location.href = window.location.origin }}
              className="mt-2"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Return to Login
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!selected?.id) return
    setSubmitting(true)
    // POST to the backend patient-select endpoint via form submission
    const form = document.createElement("form")
    form.method = "POST"
    form.action = "/auth/patient-select"
    const fields = { session: params.session, code: params.code, patient: selected.id }
    for (const [key, value] of Object.entries(fields)) {
      const input = document.createElement("input")
      input.type = "hidden"
      input.name = key
      input.value = value
      form.appendChild(input)
    }
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Select Patient" icon={UserSearch} authenticated={false} maxWidth="max-w-2xl" />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <p className="text-muted-foreground text-sm">
            This application is requesting patient context. Search and select the patient whose data you want to access.
          </p>
        </div>

        <PatientList fhirBaseUrl={params.aud} onSelect={setSelected} selected={selected} onSessionExpired={handleSessionExpired} />

        {selected && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/30 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>
                Selected: <strong className="text-foreground">{formatHumanName(selected.name)}</strong>
                {" "}({selected.id})
              </span>
            </div>
            <Button
              data-testid="patient-picker-submit"
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Continuing..." : "Continue with selected patient"}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
