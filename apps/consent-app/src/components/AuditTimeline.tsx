import type { Consent } from "fhir/r4"
import { format } from "date-fns"
import { ShieldCheck, ShieldOff, PlusCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AuditTimelineProps {
  consents: Consent[]
}

interface TimelineEvent {
  id: string
  type: "created" | "revoked" | "active"
  date: Date
  actor: string
  consentId: string
  resourceTypes: string[]
}

function deriveEvents(consents: Consent[]): TimelineEvent[] {
  const events: TimelineEvent[] = []

  for (const c of consents) {
    const actor = c.provision?.actor?.[0]?.reference?.display
      ?? c.provision?.actor?.[0]?.reference?.reference
      ?? "Unknown"
    const resourceTypes = c.provision?.class?.map((cl) => cl.code ?? "").filter(Boolean) ?? []
    const startDate = c.provision?.period?.start
      ? new Date(c.provision.period.start)
      : c.meta?.lastUpdated ? new Date(c.meta.lastUpdated) : new Date()

    if (c.status === "active") {
      events.push({
        id: `${c.id}-created`,
        type: "created",
        date: startDate,
        actor,
        consentId: c.id ?? "unknown",
        resourceTypes,
      })
    } else {
      // Revoked consent — show both creation and revocation
      events.push({
        id: `${c.id}-created`,
        type: "created",
        date: startDate,
        actor,
        consentId: c.id ?? "unknown",
        resourceTypes,
      })
      events.push({
        id: `${c.id}-revoked`,
        type: "revoked",
        date: c.meta?.lastUpdated ? new Date(c.meta.lastUpdated) : new Date(),
        actor,
        consentId: c.id ?? "unknown",
        resourceTypes,
      })
    }
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime())
}

const iconMap = {
  created: { icon: PlusCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950" },
  revoked: { icon: ShieldOff, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" },
  active: { icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
}

export function AuditTimeline({ consents }: AuditTimelineProps) {
  const events = deriveEvents(consents)

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No consent activity yet.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="relative pl-8 space-y-0">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

        {events.map((event) => {
          const { icon: Icon, color, bg } = iconMap[event.type]
          return (
            <div key={event.id} className="relative flex gap-4 pb-6">
              {/* Timeline dot */}
              <div className={`absolute -left-8 mt-0.5 size-7 rounded-full flex items-center justify-center ${bg}`}>
                <Icon className={`size-3.5 ${color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {event.type === "created" && "Consent granted to "}
                  {event.type === "revoked" && "Consent revoked for "}
                  <span className="text-foreground">{event.actor}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(event.date, "MMM d, yyyy 'at' h:mm a")}
                  {event.resourceTypes.length > 0 && (
                    <> &middot; {event.resourceTypes.join(", ")}</>
                  )}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
