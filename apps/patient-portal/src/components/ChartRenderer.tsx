import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import type { ChartPoint, MetricDef } from "@/components/HealthChartsCard"

interface ChartRendererProps {
  data: ChartPoint[]
  primaryDef: MetricDef
  secondaryDef?: MetricDef
  hasSecondaryData: boolean
}

export function ChartRenderer({ data, primaryDef, secondaryDef, hasSecondaryData }: ChartRendererProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
          unit={primaryDef.unit ? ` ${primaryDef.unit}` : ""}
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
          formatter={(val, name) => {
            const def = name === primaryDef.label ? primaryDef : secondaryDef
            return [`${val ?? ""} ${def?.unit ?? ""}`, name]
          }}
        />
        <Legend />

        {/* Primary line */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="primary"
          name={primaryDef.label}
          stroke={primaryDef.color}
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
  )
}
