import { useEffect, useState } from "react"
import { AppHeader, Spinner, PatientBanner, Card, CardContent, CardHeader, CardTitle, Badge } from "@proxy-smart/shared-ui"
import { Heart, Shield, AlertTriangle, Activity, FlaskConical, Pill, ShieldAlert, Syringe, Clock } from "lucide-react"
import {
  parseShlPayload, isShlExpired, resolveShl,
  type ShlResult,
} from "@/lib/shl-client"
import {
  createFhirClient,
  getPatient, searchConditions, searchAllergies, searchMedications,
  searchImmunizations, searchVitals, searchLabs,
  type Patient, type Condition, type AllergyIntolerance,
  type MedicationStatement, type Immunization, type Observation,
  type LabResult,
} from "@/lib/fhir-client"
import "@/index.css"

// ── State types ──────────────────────────────────────────────────────────────

type ViewState =
  | { phase: "loading" }
  | { phase: "expired" }
  | { phase: "error"; message: string }
  | { phase: "ready"; shl: ShlResult; data: PatientData }

interface PatientData {
  patient: Patient
  conditions: Condition[]
  allergies: AllergyIntolerance[]
  medications: MedicationStatement[]
  immunizations: Immunization[]
  vitals: Observation[]
  labs: LabResult[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getResourceName(resource: { code?: { coding?: Array<{ display?: string }>; text?: string }; medicationCodeableConcept?: { coding?: Array<{ display?: string }>; text?: string }; vaccineCode?: { coding?: Array<{ display?: string }>; text?: string } }): string {
  const cc = resource.code ?? resource.medicationCodeableConcept ?? resource.vaccineCode
  return cc?.coding?.[0]?.display ?? cc?.text ?? "Unknown"
}

function isVerified(resource: { verificationStatus?: { coding?: Array<{ code?: string }> } }): boolean {
  const code = resource.verificationStatus?.coding?.[0]?.code
  return !code || code === "confirmed"
}

function formatDate(d?: string): string {
  if (!d) return ""
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
  catch { return d }
}

// ── Main component ───────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<ViewState>({ phase: "loading" })

  useEffect(() => {
    resolve()
    async function resolve() {
      try {
        // Extract SHL payload from hash: #<base64url>
        const hash = window.location.hash.slice(1)
        if (!hash) {
          setState({ phase: "error", message: "No share link payload found in URL." })
          return
        }

        const payload = parseShlPayload(hash)

        if (isShlExpired(payload)) {
          setState({ phase: "expired" })
          return
        }

        // Fetch & decrypt manifest
        const shl = await resolveShl(payload)

        // Create typed FHIR client using the scoped token
        const client = createFhirClient({
          baseUrl: shl.access.fhirBaseUrl,
          accessToken: shl.access.access_token,
        })
        const patientId = shl.access.patient

        const [patient, conditions, allergies, medications, immunizations, vitals, labs] =
          await Promise.all([
            getPatient(client, patientId),
            searchConditions(client, patientId),
            searchAllergies(client, patientId),
            searchMedications(client, patientId),
            searchImmunizations(client, patientId),
            searchVitals(client, patientId),
            searchLabs(client, patientId),
          ])

        setState({
          phase: "ready",
          shl,
          data: { patient, conditions, allergies, medications, immunizations, vitals, labs },
        })
      } catch (err) {
        setState({ phase: "error", message: err instanceof Error ? err.message : "Failed to load shared data" })
      }
    }
  }, [])

  const title = (state.phase === "ready" ? state.shl.label : null) || "Shared Health Summary"

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title={title} icon={Heart} maxWidth="max-w-5xl" />
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {state.phase === "loading" && <LoadingView />}
        {state.phase === "expired" && <ExpiredView />}
        {state.phase === "error" && <ErrorView message={state.message} />}
        {state.phase === "ready" && <ReadOnlyDashboard shl={state.shl} data={state.data} />}
      </main>
    </div>
  )
}

// ── Sub-views ────────────────────────────────────────────────────────────────

function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Spinner size="lg" />
      <p className="text-muted-foreground">Decrypting shared health summary…</p>
    </div>
  )
}

function ExpiredView() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Shield className="size-12 text-muted-foreground/50" />
      <h2 className="text-lg font-semibold">Link Expired</h2>
      <p className="text-muted-foreground text-sm text-center max-w-sm">
        This shared health summary link has expired. Ask the sender to generate a new one.
      </p>
    </div>
  )
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <AlertTriangle className="size-12 text-destructive/50" />
      <h2 className="text-lg font-semibold">Unable to Load</h2>
      <p className="text-destructive text-sm text-center max-w-sm">{message}</p>
    </div>
  )
}

// ── Read-only dashboard ──────────────────────────────────────────────────────

function ReadOnlyDashboard({ shl, data }: { shl: ShlResult; data: PatientData }) {
  const expiresIn = Math.max(0, Math.round((shl.expiresAt.getTime() - Date.now()) / 60000))

  return (
    <div className="space-y-6">
      {/* Expiry banner */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
        <Clock className="size-4 shrink-0" />
        <span>Read-only view · Expires in {expiresIn} min</span>
        {shl.verifiedOnly && <Badge variant="secondary" className="ml-auto">Verified only</Badge>}
      </div>

      <PatientBanner patient={data.patient} />

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard
          title="Active Conditions"
          icon={<Activity className="size-4 text-red-500" />}
          items={data.conditions}
          verifiedOnly={shl.verifiedOnly}
          renderItem={(c) => (
            <div key={c.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{getResourceName(c)}</span>
              {c.onsetDateTime && <span className="text-xs text-muted-foreground">{formatDate(c.onsetDateTime)}</span>}
            </div>
          )}
        />

        <SectionCard
          title="Allergies"
          icon={<ShieldAlert className="size-4 text-amber-500" />}
          items={data.allergies}
          verifiedOnly={shl.verifiedOnly}
          renderItem={(a) => (
            <div key={a.id} className="flex items-center gap-2">
              <span className="text-sm">{getResourceName(a)}</span>
              {a.criticality && (
                <Badge variant={a.criticality === "high" ? "destructive" : "secondary"} className="text-[10px]">
                  {a.criticality}
                </Badge>
              )}
            </div>
          )}
        />

        <SectionCard
          title="Medications"
          icon={<Pill className="size-4 text-blue-500" />}
          items={data.medications}
          verifiedOnly={false}
          renderItem={(m) => (
            <div key={m.id}>
              <span className="text-sm">{getResourceName(m)}</span>
              {m.dosage?.[0]?.text && <p className="text-xs text-muted-foreground">{m.dosage[0].text}</p>}
            </div>
          )}
        />

        <SectionCard
          title="Immunizations"
          icon={<Syringe className="size-4 text-green-500" />}
          items={data.immunizations}
          verifiedOnly={false}
          renderItem={(i) => (
            <div key={i.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{getResourceName(i)}</span>
              {i.occurrenceDateTime && <span className="text-xs text-muted-foreground">{formatDate(i.occurrenceDateTime)}</span>}
            </div>
          )}
        />

        <SectionCard
          title="Vitals"
          icon={<Activity className="size-4 text-pink-500" />}
          items={data.vitals}
          verifiedOnly={false}
          renderItem={(v) => (
            <div key={v.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{v.code?.coding?.[0]?.display ?? v.code?.text ?? "Observation"}</span>
              <span className="text-sm font-mono">
                {v.valueQuantity ? `${v.valueQuantity.value} ${v.valueQuantity.unit ?? ""}` : v.valueString ?? "—"}
              </span>
            </div>
          )}
        />

        <SectionCard
          title="Lab Results"
          icon={<FlaskConical className="size-4 text-purple-500" />}
          items={data.labs}
          verifiedOnly={false}
          renderItem={(l) => {
            const interp = l.interpretation?.[0]?.coding?.[0]?.code
            return (
              <div key={l.id} className="flex items-center justify-between gap-2">
                <span className="text-sm">{l.code?.coding?.[0]?.display ?? l.code?.text ?? "Lab"}</span>
                <span className={`text-sm font-mono ${interp === "H" || interp === "HH" ? "text-red-600" : interp === "L" || interp === "LL" ? "text-blue-600" : ""}`}>
                  {l.valueQuantity ? `${l.valueQuantity.value} ${l.valueQuantity.unit ?? ""}` : l.valueString ?? "—"}
                </span>
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}

// ── Generic section card ─────────────────────────────────────────────────────

function SectionCard<T extends { id?: string; verificationStatus?: { coding?: Array<{ code?: string }> } }>({
  title, icon, items, verifiedOnly, renderItem,
}: {
  title: string
  icon: React.ReactNode
  items: T[]
  verifiedOnly: boolean
  renderItem: (item: T) => React.ReactNode
}) {
  const filtered = verifiedOnly ? items.filter(isVerified) : items

  if (filtered.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">{icon}{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">No records</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}{title}
          <Badge variant="secondary" className="ml-auto text-[10px]">{filtered.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.map(renderItem)}
      </CardContent>
    </Card>
  )
}
