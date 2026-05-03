import { useState, useEffect, useCallback } from "react"
import type { Consent } from "fhir/r4"
import { format } from "date-fns"
import {
  ShieldOff,
  PlusCircle,
  Eye,
  Ban,
  RefreshCw,
} from "lucide-react"
import { Badge, Button, Spinner, ScrollArea } from "@proxy-smart/shared-ui"
import { config } from "@/config"
import { smartAuth } from "@/lib/smart-auth"

// ── Types ────────────────────────────────────────────────────────

interface AuditTimelineProps {
  consents: Consent[]
  patientId?: string
}

/** Consent-derived event (created / revoked) */
interface ConsentEvent {
  id: string
  source: "consent"
  type: "created" | "revoked"
  date: Date
  actor: string
  consentId: string
  resourceTypes: string[]
}

/** Backend access log event */
interface AccessEvent {
  id: string
  source: "access"
  type: "permit" | "deny"
  date: Date
  clientId: string
  userId: string | null
  username: string | null
  resourceType: string | null
  method: string
  reason: string
}

type TimelineEvent = ConsentEvent | AccessEvent

// ── Helpers ──────────────────────────────────────────────────────

function deriveConsentEvents(consents: Consent[]): ConsentEvent[] {
  const events: ConsentEvent[] = []

  for (const c of consents) {
    const actor =
      c.provision?.actor?.[0]?.reference?.display ??
      c.provision?.actor?.[0]?.reference?.reference ??
      "Unknown"
    const resourceTypes =
      c.provision?.class?.map((cl) => cl.code ?? "").filter(Boolean) ?? []
    const startDate = c.provision?.period?.start
      ? new Date(c.provision.period.start)
      : c.meta?.lastUpdated
        ? new Date(c.meta.lastUpdated)
        : new Date()

    events.push({
      id: `${c.id}-created`,
      source: "consent",
      type: "created",
      date: startDate,
      actor,
      consentId: c.id ?? "unknown",
      resourceTypes,
    })

    if (c.status !== "active") {
      events.push({
        id: `${c.id}-revoked`,
        source: "consent",
        type: "revoked",
        date: c.meta?.lastUpdated ? new Date(c.meta.lastUpdated) : new Date(),
        actor,
        consentId: c.id ?? "unknown",
        resourceTypes,
      })
    }
  }

  return events
}

// ── Sub-tab selector ─────────────────────────────────────────────

type AuditTab = "all" | "consent" | "access"

// ── Component ────────────────────────────────────────────────────

export function AuditTimeline({ consents, patientId }: AuditTimelineProps) {
  const [tab, setTab] = useState<AuditTab>("all")
  const [accessEvents, setAccessEvents] = useState<AccessEvent[]>([])
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)

  const consentEvents = deriveConsentEvents(consents)

  const fetchAccessLog = useCallback(async () => {
    if (!patientId) return
    setAccessLoading(true)
    setAccessError(null)
    try {
      const authFetch = smartAuth.createAuthenticatedFetch()
      const base = config.proxyBase || window.location.origin
      const url = `${base}/monitoring/consent/patients/${encodeURIComponent(patientId)}/access-log?limit=200`
      const resp = await authFetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      const mapped: AccessEvent[] = (data.events ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => ({
          id: e.id,
          source: "access" as const,
          type: e.decision as "permit" | "deny",
          date: new Date(e.timestamp),
          clientId: e.clientId,
          userId: e.userId ?? null,
          username: e.username ?? null,
          resourceType: e.resourceType ?? null,
          method: e.method,
          reason: e.reason,
        }),
      )
      setAccessEvents(mapped)
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : "Failed to load access log")
    } finally {
      setAccessLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    if (!patientId) return
    Promise.resolve()
      .then(() => {
        setAccessLoading(true)
        setAccessError(null)
        const authFetch = smartAuth.createAuthenticatedFetch()
        const base = config.proxyBase || window.location.origin
        const url = `${base}/monitoring/consent/patients/${encodeURIComponent(patientId)}/access-log?limit=200`
        return authFetch(url)
      })
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        return resp.json()
      })
      .then((data: { events?: Array<Record<string, unknown>> }) => {
        const mapped: AccessEvent[] = (data.events ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (e: any) => ({
            id: e.id,
            source: "access" as const,
            type: e.decision as "permit" | "deny",
            date: new Date(e.timestamp),
            clientId: e.clientId,
            userId: e.userId ?? null,
            username: e.username ?? null,
            resourceType: e.resourceType ?? null,
            method: e.method,
            reason: e.reason,
          }),
        )
        setAccessEvents(mapped)
      })
      .catch((err) => {
        setAccessError(err instanceof Error ? err.message : "Failed to load access log")
      })
      .finally(() => {
        setAccessLoading(false)
      })
  }, [patientId])

  // ── Merge & filter ───────────────────────────────────────────

  const filteredEvents: TimelineEvent[] = (() => {
    const events: TimelineEvent[] = []
    if (tab === "all" || tab === "consent") events.push(...consentEvents)
    if (tab === "all" || tab === "access") events.push(...accessEvents)
    return events.sort((a, b) => b.date.getTime() - a.date.getTime())
  })()

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-2">
        {(["all", "consent", "access"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
          >
            {t === "all" && "All Activity"}
            {t === "consent" && "Consent Changes"}
            {t === "access" && "Data Access"}
          </Button>
        ))}

        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={fetchAccessLog}
          disabled={accessLoading}
        >
          <RefreshCw className={`size-3.5 mr-1 ${accessLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {accessError && (
        <div className="text-sm text-destructive px-2">
          Failed to load access log: {accessError}
        </div>
      )}

      {/* Loading */}
      {accessLoading && accessEvents.length === 0 && (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!accessLoading && filteredEvents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No {tab === "all" ? "audit" : tab} activity yet.</p>
        </div>
      )}

      {/* Timeline */}
      {filteredEvents.length > 0 && (
        <ScrollArea className="h-[500px]">
          <div className="relative pl-8 space-y-0">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

            {filteredEvents.map((event) => (
              <div key={event.id} className="relative flex gap-4 pb-6">
                <TimelineDot event={event} />
                <div className="flex-1 min-w-0">
                  <EventContent event={event} />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

// ── Timeline dot ─────────────────────────────────────────────────

function TimelineDot({ event }: { event: TimelineEvent }) {
  const styles = {
    created: { icon: PlusCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950" },
    revoked: { icon: ShieldOff, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" },
    permit: { icon: Eye, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
    deny: { icon: Ban, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950" },
  }
  const s = styles[event.type] ?? styles.permit
  const Icon = s.icon

  return (
    <div className={`absolute -left-8 mt-0.5 size-7 rounded-full flex items-center justify-center ${s.bg}`}>
      <Icon className={`size-3.5 ${s.color}`} />
    </div>
  )
}

// ── Event content ────────────────────────────────────────────────

function EventContent({ event }: { event: TimelineEvent }) {
  if (event.source === "consent") {
    return (
      <>
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
      </>
    )
  }

  // Access event
  const who = event.username || event.clientId
  return (
    <>
      <p className="text-sm font-medium">
        {event.type === "permit" ? (
          <>
            <span className="text-foreground">{who}</span>
            {" accessed "}
            <Badge variant="outline" className="text-xs ml-1">{event.method}</Badge>
            {event.resourceType && (
              <Badge variant="secondary" className="text-xs ml-1">{event.resourceType}</Badge>
            )}
          </>
        ) : (
          <>
            <span className="text-foreground">{who}</span>
            {" was denied "}
            <Badge variant="outline" className="text-xs ml-1">{event.method}</Badge>
            {event.resourceType && (
              <Badge variant="secondary" className="text-xs ml-1">{event.resourceType}</Badge>
            )}
          </>
        )}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {format(event.date, "MMM d, yyyy 'at' h:mm a")}
        <> &middot; {event.reason}</>
      </p>
    </>
  )
}
