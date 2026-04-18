import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Card, CardContent, CardHeader, CardTitle, Badge, Button,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@proxy-smart/shared-ui"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { Activity, Plus, Minus } from "lucide-react"
import { format } from "date-fns"
import type { Observation } from "@/lib/fhir-client"
import type { ObservationResultsLaboratoryPathologyUvIps as LabResult } from "hl7.fhir.uv.ips-generated"

// ── Metric definitions ──────────────────────────────────────────────────────

interface MetricDef {
  label: string
  loinc: string[]
  unit?: string
  color: string
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
  if (metric.componentLoinc && "component" in obs && Array.isArray(obs.component)) {
    const comp = obs.component.find(c =>
      c.code?.coding?.some(cd => cd.code === metric.componentLoinc)
    )
    if (comp?.valueQuantity?.value != null) return comp.valueQuantity.value
  }
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

// ── Build merged chart data for one or two metrics ──────────────────────────

interface ChartPoint {
  date: string
  ts: number
  primary?: number
  secondary?: number
}

function buildChartData(
  allObs: (Observation | LabResult)[],
  primaryDef: MetricDef,
  secondaryDef: MetricDef | undefined,
): ChartPoint[] {
  const byTs = new Map<number, ChartPoint>()

  for (const obs of allObs) {
    const dateStr = getEffectiveDate(obs)
    if (!dateStr) continue
    const ts = new Date(dateStr).getTime()
    if (isNaN(ts)) continue

    if (obsMatchesMetric(obs, primaryDef)) {
      const val = extractValue(obs, primaryDef)
      if (val !== null) {
        const existing = byTs.get(ts) ?? { date: format(new Date(ts), "MMM d, yyyy"), ts }
        existing.primary = Math.round(val * 100) / 100
        byTs.set(ts, existing)
      }
    }

    if (secondaryDef && obsMatchesMetric(obs, secondaryDef)) {
      const val = extractValue(obs, secondaryDef)
      if (val !== null) {
        const existing = byTs.get(ts) ?? { date: format(new Date(ts), "MMM d, yyyy"), ts }
        existing.secondary = Math.round(val * 100) / 100
        byTs.set(ts, existing)
      }
    }
  }

  return Array.from(byTs.values()).sort((a, b) => a.ts - b.ts)
}

// ── Component ───────────────────────────────────────────────────────────────

interface HealthChartsCardProps {
  vitals: Observation[]
  labs: LabResult[]
}

export function HealthChartsCard({ vitals, labs }: HealthChartsCardProps) {
  const { t } = useTranslation()
  const allObs = useMemo(() => [...vitals, ...labs], [vitals, labs])

  const availableMetrics = useMemo(() => {
    return METRIC_DEFS.filter(m =>
      allObs.some(o => obsMatchesMetric(o, m) && extractValue(o, m) !== null)
    )
  }, [allObs])

  const [selectedMetric, setSelectedMetric] = useState<string>("")
  const [secondaryMetric, setSecondaryMetric] = useState<string | null>(null)

  const activeMetricKey = selectedMetric || availableMetrics[0]?.label || ""
  const primaryDef = METRIC_DEFS.find(m => m.label === activeMetricKey)
  const secondaryDef = secondaryMetric ? METRIC_DEFS.find(m => m.label === secondaryMetric) : undefined

  // Metrics available for secondary (exclude the primary)
  const secondaryOptions = useMemo(
    () => availableMetrics.filter(m => m.label !== activeMetricKey),
    [availableMetrics, activeMetricKey],
  )

  const chartData = useMemo(() => {
    if (!primaryDef) return []
    return buildChartData(allObs, primaryDef, secondaryDef)
  }, [allObs, primaryDef, secondaryDef])

  const hasPrimaryData = chartData.some(p => p.primary != null)
  const hasSecondaryData = chartData.some(p => p.secondary != null)
  const hasEnoughData = hasPrimaryData && chartData.filter(p => p.primary != null).length >= 2

  const totalObs = vitals.length + labs.length

  // Clear secondary if it matches the newly selected primary
  const handlePrimaryChange = (val: string) => {
    setSelectedMetric(val)
    if (secondaryMetric === val) setSecondaryMetric(null)
  }

  const handleAddSecondary = () => {
    if (secondaryOptions.length > 0) {
      setSecondaryMetric(secondaryOptions[0].label)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-indigo-500" />
            {t("healthCharts.title")}
            {totalObs > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {t("healthCharts.nObservations", { n: totalObs })}
              </Badge>
            )}
          </CardTitle>

          {availableMetrics.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Primary metric selector */}
              <Select value={activeMetricKey} onValueChange={handlePrimaryChange}>
                <SelectTrigger className="w-40 sm:w-48 h-8 text-sm">
                  <SelectValue placeholder={t("healthCharts.chooseMetric")} />
                </SelectTrigger>
                <SelectContent>
                  {availableMetrics.map(m => (
                    <SelectItem key={m.label} value={m.label}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Add / secondary metric */}
              {secondaryMetric == null ? (
                secondaryOptions.length > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={handleAddSecondary}
                    title={t("healthCharts.addMetric", "Compare metric")}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                )
              ) : (
                <>
                  <Select value={secondaryMetric} onValueChange={setSecondaryMetric}>
                    <SelectTrigger className="w-40 sm:w-48 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {secondaryOptions.map(m => (
                        <SelectItem key={m.label} value={m.label}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setSecondaryMetric(null)}
                    title={t("healthCharts.removeMetric", "Remove comparison")}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {allObs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("healthCharts.noData")}</p>
        ) : availableMetrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("healthCharts.noChartable")}</p>
        ) : !hasEnoughData ? (
          <p className="text-sm text-muted-foreground">
            {t("healthCharts.notEnoughData", { metric: activeMetricKey })}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 8, right: secondaryDef ? 16 : 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />

              {/* Left Y-axis — primary metric */}
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                unit={primaryDef?.unit ? ` ${primaryDef.unit}` : ""}
                width={70}
              />

              {/* Right Y-axis — secondary metric (only when active) */}
              {secondaryDef && hasSecondaryData && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  unit={secondaryDef.unit ? ` ${secondaryDef.unit}` : ""}
                  width={70}
                />
              )}

              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
                formatter={(val: number, name: string) => {
                  const def = name === primaryDef?.label ? primaryDef : secondaryDef
                  return [`${val} ${def?.unit ?? ""}`, name]
                }}
              />
              <Legend />

              {/* Primary line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="primary"
                name={primaryDef?.label}
                stroke={primaryDef?.color ?? "#6366f1"}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />

              {/* Secondary line */}
              {secondaryDef && hasSecondaryData && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="secondary"
                  name={secondaryDef.label}
                  stroke={secondaryDef.color}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation()
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
            {t("healthCharts.title")}
            {totalObs > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {t("healthCharts.nObservations", { n: totalObs })}
              </Badge>
            )}
          </CardTitle>
          {availableMetrics.length > 0 && (
            <Select value={activeMetricKey} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-40 sm:w-52 h-8 text-sm">
                <SelectValue placeholder={t("healthCharts.chooseMetric")} />
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
          <p className="text-sm text-muted-foreground">{t("healthCharts.noData")}</p>
        ) : availableMetrics.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("healthCharts.noChartable")}</p>
        ) : chartData.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            {t("healthCharts.notEnoughData", { metric: activeMetricKey })}
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
