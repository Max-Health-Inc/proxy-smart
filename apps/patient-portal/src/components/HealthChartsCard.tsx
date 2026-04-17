import { useMemo, useState } from "react"
import {
  Card, CardContent, CardHeader, CardTitle, Badge,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@proxy-smart/shared-ui"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { Activity } from "lucide-react"
import { format } from "date-fns"
import type { Observation } from "@/lib/fhir-client"
import type { ObservationResultsLaboratoryPathologyUvIps as LabResult } from "hl7.fhir.uv.ips-generated"

// ── Metric definitions ──────────────────────────────────────────────────────

interface MetricDef {
  label: string
  loinc: string[]          // LOINC codes that map to this metric
  unit?: string
  color: string
  /** For panel observations, extract from component by LOINC */
  componentLoinc?: string
}

const METRIC_DEFS: MetricDef[] = [
  { label: "Systolic BP",      loinc: ["8480-6", "85354-9"], unit: "mmHg",   color: "#ef4444", componentLoinc: "8480-6" },
  { label: "Diastolic BP",     loinc: ["8462-4", "85354-9"], unit: "mmHg",   color: "#f97316", componentLoinc: "8462-4" },
  { label: "Heart Rate",       loinc: ["8867-4"],            unit: "bpm",    color: "#ec4899" },
  { label: "Body Weight",      loinc: ["29463-7"],           unit: "kg",     color: "#8b5cf6" },
  { label: "BMI",              loinc: ["39156-5"],           unit: "kg/m²",  color: "#6366f1" },
  { label: "SpO₂",             loinc: ["2708-6", "59408-5"], unit: "%",      color: "#06b6d4" },
  { label: "Body Temperature", loinc: ["8310-5"],            unit: "°C",     color: "#f59e0b" },
  { label: "Respiratory Rate", loinc: ["9279-1"],            unit: "/min",   color: "#10b981" },
  { label: "Hours of Sleep",   loinc: ["93832-4"],           unit: "h",      color: "#64748b" },
]

// ── Value extraction ────────────────────────────────────────────────────────

function extractValue(obs: Observation | LabResult, metric: MetricDef): number | null {
  // If a component LOINC is specified, try extracting from component array first
  if (metric.componentLoinc && "component" in obs && Array.isArray(obs.component)) {
    const comp = obs.component.find(c =>
      c.code?.coding?.some(cd => cd.code === metric.componentLoinc)
    )
    if (comp?.valueQuantity?.value != null) return comp.valueQuantity.value
  }

  // Direct valueQuantity
  if ("valueQuantity" in obs && obs.valueQuantity?.value != null) {
    return obs.valueQuantity.value
  }

  return null
}

function getEffectiveDate(obs: Observation | LabResult): string | null {
  if ("effectiveDateTime" in obs && obs.effectiveDateTime) return obs.effectiveDateTime
  if ("effectivePeriod" in obs && obs.effectivePeriod?.start) return obs.effectivePeriod.start
  if ("issued" in obs && obs.issued) return obs.issued
  return null
}

function obsMatchesMetric(obs: Observation | LabResult, metric: MetricDef): boolean {
  const codes = obs.code?.coding?.map(c => c.code) ?? []
  return metric.loinc.some(l => codes.includes(l))
}

// ── Component ───────────────────────────────────────────────────────────────

interface HealthChartsCardProps {
  vitals: Observation[]
  labs: LabResult[]
}

export function HealthChartsCard({ vitals, labs }: HealthChartsCardProps) {
  const allObs = useMemo(() => [...vitals, ...labs], [vitals, labs])

  // Detect which metrics have at least 1 data point
  const availableMetrics = useMemo(() => {
    return METRIC_DEFS.filter(m =>
      allObs.some(o => obsMatchesMetric(o, m) && extractValue(o, m) !== null)
    )
  }, [allObs])

  const [selectedMetric, setSelectedMetric] = useState<string>("")

  // Auto-select first available metric when data loads
  const activeMetricKey = selectedMetric || availableMetrics[0]?.label || ""
  const activeDef = METRIC_DEFS.find(m => m.label === activeMetricKey)

  // Build chart data for selected metric
  const chartData = useMemo(() => {
    if (!activeDef) return []

    const points: { date: string; ts: number; value: number }[] = []

    for (const obs of allObs) {
      if (!obsMatchesMetric(obs, activeDef)) continue
      const val = extractValue(obs, activeDef)
      if (val === null) continue
      const dateStr = getEffectiveDate(obs)
      if (!dateStr) continue

      const ts = new Date(dateStr).getTime()
      if (isNaN(ts)) continue

      points.push({
        date: format(new Date(ts), "MMM d, yyyy"),
        ts,
        value: Math.round(val * 100) / 100,
      })
    }

    // Sort oldest → newest
    points.sort((a, b) => a.ts - b.ts)
    return points
  }, [allObs, activeDef])

  const totalObs = vitals.length + labs.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-indigo-500" />
            Health Charts
            {totalObs > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {totalObs} observations
              </Badge>
            )}
          </CardTitle>
          {availableMetrics.length > 0 && (
            <Select value={activeMetricKey} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-52 h-8 text-sm">
                <SelectValue placeholder="Choose metric…" />
              </SelectTrigger>
              <SelectContent>
                {availableMetrics.map(m => (
                  <SelectItem key={m.label} value={m.label}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {allObs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vitals or lab data available to chart.</p>
        ) : availableMetrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chartable numeric observations found.</p>
        ) : chartData.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Not enough data points for "{activeMetricKey}" to draw a chart (need at least 2).
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                unit={activeDef?.unit ? ` ${activeDef.unit}` : ""}
                width={70}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(val: any) =>
                  [`${val} ${activeDef?.unit ?? ""}`, activeDef?.label ?? "Value"]
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name={activeDef?.label}
                stroke={activeDef?.color ?? "#6366f1"}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
