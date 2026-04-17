import type { AllergyIntoleranceCriticalityCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-AllergyIntoleranceCriticality"
import type { AllergyIntoleranceCategoryCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-AllergyIntoleranceCategory"
import type { ReactionEventSeverityCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ReactionEventSeverity"
import type { EventStatusCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-EventStatus"
import type { ObservationInterpretationCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ObservationInterpretation"
import type { DeviceStatementStatusCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-DeviceStatementStatus"
import type { ConditionSeverityCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ConditionSeverity"

// Re-export types used in consumers
export type { AllergyIntoleranceCriticalityCode, AllergyIntoleranceCategoryCode, ReactionEventSeverityCode, EventStatusCode, ObservationInterpretationCode, DeviceStatementStatusCode, ConditionSeverityCode }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyResource = Record<string, any>

// ── Clickable record name ────────────────────────────────────────────────────

export function RecordName({
  children,
  resource,
  onOpen,
}: {
  children: React.ReactNode
  resource: AnyResource
  onOpen: (title: string, resource: AnyResource) => void
}) {
  const label = typeof children === "string" ? children : ""
  return (
    <button
      type="button"
      className="font-medium text-left hover:underline hover:text-primary cursor-pointer transition-colors"
      onClick={() => onOpen(label, resource)}
    >
      {children}
    </button>
  )
}

// ── Allergy criticality ──────────────────────────────────────────────────────

export const criticalityStyles: Record<AllergyIntoleranceCriticalityCode, { label: string; variant: "destructive" | "secondary" | "outline" }> = {
  high: { label: "High", variant: "destructive" },
  low: { label: "Low", variant: "secondary" },
  "unable-to-assess": { label: "Unknown", variant: "outline" },
}

// ── Allergy category emoji ───────────────────────────────────────────────────

export const categoryEmoji: Record<AllergyIntoleranceCategoryCode, string> = {
  food: "🍽️",
  medication: "💊",
  environment: "🌿",
  biologic: "🧬",
}

// ── Reaction severity ────────────────────────────────────────────────────────

export const severityStyles: Record<ReactionEventSeverityCode, { label: string; className: string }> = {
  severe: { label: "Severe", className: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/20" },
  moderate: { label: "Moderate", className: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/20" },
  mild: { label: "Mild", className: "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/20" },
}

// ── Observation interpretation flags ─────────────────────────────────────────

const interpretationFlags: Record<string, { label: string; className: string }> = {
  H: { label: "High", className: "text-red-600" },
  HH: { label: "Critical High", className: "text-red-700 font-bold" },
  L: { label: "Low", className: "text-blue-600" },
  LL: { label: "Critical Low", className: "text-blue-700 font-bold" },
  A: { label: "Abnormal", className: "text-amber-600" },
  AA: { label: "Critical", className: "text-red-700 font-bold" },
  N: { label: "Normal", className: "text-green-600" },
}

export function getInterpretationFlag(obs: AnyResource): { label: string; className: string } | undefined {
  const code = obs.interpretation?.[0]?.coding?.[0]?.code as ObservationInterpretationCode | undefined
  return code ? interpretationFlags[code] : undefined
}

// ── Procedure status ─────────────────────────────────────────────────────────

export function getProcedureStatusStyle(status: EventStatusCode): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed": return "default"
    case "in-progress": return "secondary"
    case "not-done": case "entered-in-error": return "destructive"
    default: return "outline"
  }
}

// ── Device use status ────────────────────────────────────────────────────────

export function getDeviceStatusStyle(status: DeviceStatementStatusCode): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default"
    case "completed": return "secondary"
    case "entered-in-error": return "destructive"
    case "intended": case "stopped": case "on-hold": return "outline"
    default: return "outline"
  }
}

// ── Condition severity ───────────────────────────────────────────────────────

export const conditionSeverityStyles: Record<ConditionSeverityCode, { label: string; variant: "destructive" | "secondary" | "outline" }> = {
  24484000: { label: "Severe", variant: "destructive" },
  6736007: { label: "Moderate", variant: "secondary" },
  255604002: { label: "Mild", variant: "outline" },
}
