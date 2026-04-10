import { Card, CardContent } from "@proxy-smart/shared-ui"
import { ShieldCheck, ShieldOff, AlertTriangle, FileStack } from "lucide-react"

interface ConsentStatsProps {
  total: number
  active: number
  revoked: number
  expiringSoon: number
}

export function ConsentStats({ total, active, revoked, expiringSoon }: ConsentStatsProps) {
  const cards = [
    { label: "Total Consents", value: total, icon: FileStack, color: "text-foreground" },
    { label: "Active", value: active, icon: ShieldCheck, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Revoked", value: revoked, icon: ShieldOff, color: "text-muted-foreground" },
    { label: "Expiring Soon", value: expiringSoon, icon: AlertTriangle, color: expiringSoon > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`size-4 ${color}`} />
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
