import { useMemo, useState } from "react"
import { Badge } from "@proxy-smart/shared-ui"
import { RecordName, type AnyResource } from "@/lib/ips-display-helpers"
import { useFhirTranslation } from "@/lib/fhir-translations"
import {
  Heart, Pill, ShieldAlert, Syringe, Activity, FlaskConical, Scissors,
  Flag, Baby, CalendarDays, ScanLine, FileText, Stethoscope,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { useTranslation } from "react-i18next"
import type {
  Condition, AllergyIntolerance, MedicationStatement, MedicationRequest,
  Immunization, Observation, LabResult, Procedure, FlagAlert,
  PregnancyStatus, PregnancyEdd, ImagingStudy, Encounter,
  DiagnosticReport, DocumentReference, DeviceUseStatement,
} from "@/lib/fhir-client"

// ── Timeline event model ────────────────────────────────────────────────────

type TimelineCategory =
  | "condition" | "allergy" | "medication" | "immunization"
  | "vital" | "lab" | "procedure" | "flag" | "pregnancy"
  | "encounter" | "imaging" | "document" | "diagnostic" | "device"

interface TimelineEvent {
  id: string
  date: Date
  title: string
  subtitle?: string
  category: TimelineCategory
  resource: AnyResource
  badge?: { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
}

// ── Category config ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<TimelineCategory, {
  icon: typeof Heart
  color: string
  dotColor: string
  label: string
}> = {
  condition:    { icon: Heart,         color: "text-rose-500",    dotColor: "bg-rose-500",    label: "Condition" },
  allergy:      { icon: ShieldAlert,   color: "text-amber-500",   dotColor: "bg-amber-500",   label: "Allergy" },
  medication:   { icon: Pill,          color: "text-blue-500",    dotColor: "bg-blue-500",    label: "Medication" },
  immunization: { icon: Syringe,       color: "text-green-500",   dotColor: "bg-green-500",   label: "Immunization" },
  vital:        { icon: Activity,      color: "text-purple-500",  dotColor: "bg-purple-500",  label: "Vital Sign" },
  lab:          { icon: FlaskConical,  color: "text-teal-500",    dotColor: "bg-teal-500",    label: "Lab Result" },
  procedure:    { icon: Scissors,      color: "text-indigo-500",  dotColor: "bg-indigo-500",  label: "Procedure" },
  flag:         { icon: Flag,          color: "text-red-500",     dotColor: "bg-red-500",     label: "Alert" },
  pregnancy:    { icon: Baby,          color: "text-pink-500",    dotColor: "bg-pink-500",    label: "Pregnancy" },
  encounter:    { icon: CalendarDays,  color: "text-sky-500",     dotColor: "bg-sky-500",     label: "Visit" },
  imaging:      { icon: ScanLine,      color: "text-violet-500",  dotColor: "bg-violet-500",  label: "Imaging" },
  document:     { icon: FileText,      color: "text-slate-500",   dotColor: "bg-slate-500",   label: "Document" },
  diagnostic:   { icon: Stethoscope,   color: "text-emerald-500", dotColor: "bg-emerald-500", label: "Report" },
  device:       { icon: Activity,      color: "text-orange-500",  dotColor: "bg-orange-500",  label: "Device" },
}

// ── Event extraction ────────────────────────────────────────────────────────

function extractDate(
  ...candidates: (string | undefined)[]
): Date | null {
  for (const c of candidates) {
    if (c) {
      const d = new Date(c)
      if (!isNaN(d.getTime())) return d
    }
  }
  return null
}

function extractEvents(data: MedicalTimelineProps): TimelineEvent[] {
  const events: TimelineEvent[] = []
  let idx = 0

  for (const c of data.conditions) {
    const date = extractDate(c.onsetDateTime, c.recordedDate)
    if (!date) continue
    events.push({
      id: c.id || `cond-${idx++}`,
      date,
      title: c.code?.coding?.[0]?.display || c.code?.text || "Condition",
      subtitle: c.clinicalStatus?.coding?.[0]?.code,
      category: "condition",
      resource: c as AnyResource,
      badge: c.severity?.coding?.[0]?.display
        ? { label: c.severity.coding[0].display, variant: "secondary" }
        : undefined,
    })
  }

  for (const a of data.allergies) {
    const date = extractDate(a.onsetDateTime as string | undefined, a.recordedDate)
    if (!date) continue
    events.push({
      id: a.id || `allergy-${idx++}`,
      date,
      title: a.code?.coding?.[0]?.display || a.code?.text || "Allergy",
      subtitle: a.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display,
      category: "allergy",
      resource: a as AnyResource,
      badge: a.criticality
        ? { label: a.criticality, variant: a.criticality === "high" ? "destructive" : "outline" }
        : undefined,
    })
  }

  for (const m of data.medications) {
    const date = extractDate(m.effectiveDateTime as string | undefined, m.dateAsserted)
    if (!date) continue
    events.push({
      id: m.id || `med-${idx++}`,
      date,
      title: m.medicationCodeableConcept?.coding?.[0]?.display
        || m.medicationCodeableConcept?.text || "Medication",
      subtitle: m.dosage?.[0]?.text,
      category: "medication",
      resource: m as AnyResource,
    })
  }

  for (const rx of data.medicationRequests) {
    const date = extractDate(rx.authoredOn)
    if (!date) continue
    events.push({
      id: rx.id || `rx-${idx++}`,
      date,
      title: rx.medicationCodeableConcept?.coding?.[0]?.display
        || rx.medicationCodeableConcept?.text || "Prescription",
      subtitle: rx.dosageInstruction?.[0]?.text,
      category: "medication",
      resource: rx as AnyResource,
      badge: rx.status ? { label: rx.status, variant: "outline" } : undefined,
    })
  }

  for (const imm of data.immunizations) {
    const date = extractDate(imm.occurrenceDateTime as string | undefined)
    if (!date) continue
    events.push({
      id: imm.id || `imm-${idx++}`,
      date,
      title: imm.vaccineCode?.coding?.[0]?.display || imm.vaccineCode?.text || "Vaccine",
      category: "immunization",
      resource: imm as AnyResource,
    })
  }

  for (const v of data.vitals) {
    const date = extractDate(v.effectiveDateTime as string | undefined)
    if (!date) continue
    const value = v.valueQuantity
      ? `${v.valueQuantity.value} ${v.valueQuantity.unit || ""}`
      : v.component?.length
        ? v.component.map(c => c.valueQuantity?.value).filter(Boolean).join("/")
          + ` ${v.component[0]?.valueQuantity?.unit || ""}`
        : v.valueString
    events.push({
      id: v.id || `vital-${idx++}`,
      date,
      title: v.code?.coding?.[0]?.display || v.code?.text || "Vital",
      subtitle: value || undefined,
      category: "vital",
      resource: v as AnyResource,
    })
  }

  for (const l of data.labs) {
    const date = extractDate(l.effectiveDateTime as string | undefined)
    if (!date) continue
    const value = l.valueQuantity
      ? `${l.valueQuantity.value} ${l.valueQuantity.unit || ""}`
      : l.valueString
    events.push({
      id: l.id || `lab-${idx++}`,
      date,
      title: l.code?.coding?.[0]?.display || l.code?.text || "Lab",
      subtitle: value || undefined,
      category: "lab",
      resource: l as AnyResource,
    })
  }

  for (const p of data.procedures) {
    const date = extractDate(p.performedDateTime as string | undefined)
    if (!date) continue
    events.push({
      id: p.id || `proc-${idx++}`,
      date,
      title: p.code?.coding?.[0]?.display || p.code?.text || "Procedure",
      category: "procedure",
      resource: p as AnyResource,
      badge: p.status ? { label: p.status, variant: "outline" } : undefined,
    })
  }

  for (const f of data.flags) {
    const date = extractDate(f.period?.start)
    if (!date) continue
    events.push({
      id: f.id || `flag-${idx++}`,
      date,
      title: f.code?.coding?.[0]?.display || f.code?.text || "Alert",
      category: "flag",
      resource: f as AnyResource,
      badge: f.status
        ? { label: f.status, variant: f.status === "active" ? "destructive" : "outline" }
        : undefined,
    })
  }

  for (const ps of data.pregnancyStatus) {
    const date = extractDate(ps.effectiveDateTime as string | undefined)
    if (!date) continue
    events.push({
      id: ps.id || `preg-${idx++}`,
      date,
      title: ps.valueCodeableConcept?.coding?.[0]?.display
        || ps.valueCodeableConcept?.text || "Pregnancy Status",
      category: "pregnancy",
      resource: ps as AnyResource,
    })
  }

  for (const pe of data.pregnancyEdd) {
    const date = extractDate(pe.valueDateTime as string | undefined, pe.effectiveDateTime as string | undefined)
    if (!date) continue
    events.push({
      id: pe.id || `edd-${idx++}`,
      date,
      title: `EDD: ${format(date, "MMM d, yyyy")}`,
      category: "pregnancy",
      resource: pe as AnyResource,
    })
  }

  for (const enc of data.encounters) {
    const date = extractDate(enc.period?.start)
    if (!date) continue
    const encTitle = enc.type?.[0]?.text ?? enc.type?.[0]?.coding?.[0]?.display ?? "Visit"
    events.push({
      id: enc.id || `enc-${idx++}`,
      date,
      title: encTitle,
      subtitle: enc.participant?.[0]?.individual?.display,
      category: "encounter",
      resource: enc as AnyResource,
      badge: enc.status ? { label: enc.status, variant: "outline" } : undefined,
    })
  }

  for (const img of data.imagingStudies) {
    const date = extractDate(img.started)
    if (!date) continue
    const title = img.description || img.modality?.[0]?.display || img.modality?.[0]?.code || "Imaging Study"
    events.push({
      id: img.id || `img-${idx++}`,
      date,
      title,
      subtitle: img.numberOfSeries != null ? `${img.numberOfSeries} series, ${img.numberOfInstances ?? "?"} images` : undefined,
      category: "imaging",
      resource: img as AnyResource,
    })
  }

  for (const dr of data.diagnosticReports) {
    const date = extractDate(dr.effectiveDateTime as string | undefined, dr.issued)
    if (!date) continue
    events.push({
      id: dr.id || `diag-${idx++}`,
      date,
      title: dr.code?.coding?.[0]?.display || dr.code?.text || "Report",
      category: "diagnostic",
      resource: dr as AnyResource,
      badge: dr.status ? { label: dr.status, variant: "outline" } : undefined,
    })
  }

  for (const doc of data.documents) {
    const date = extractDate(doc.date, doc.content?.[0]?.attachment?.creation)
    if (!date) continue
    events.push({
      id: doc.id || `doc-${idx++}`,
      date,
      title: doc.description || doc.type?.text || doc.type?.coding?.[0]?.display || "Document",
      category: "document",
      resource: doc as AnyResource,
      badge: doc.status ? { label: doc.status, variant: "outline" } : undefined,
    })
  }

  for (const d of data.devices) {
    const date = extractDate(
      (d.timingDateTime as string | undefined),
      (d.timingPeriod as { start?: string } | undefined)?.start,
    )
    if (!date) continue
    events.push({
      id: d.id || `dev-${idx++}`,
      date,
      title: d.device?.display || "Medical Device",
      category: "device",
      resource: d as AnyResource,
    })
  }

  return events
}

// ── Group by year-month ─────────────────────────────────────────────────────

interface MonthGroup {
  key: string
  label: string
  events: TimelineEvent[]
}

function groupByMonth(events: TimelineEvent[]): MonthGroup[] {
  const map = new Map<string, TimelineEvent[]>()
  for (const e of events) {
    const key = format(e.date, "yyyy-MM")
    const group = map.get(key) ?? []
    group.push(e)
    map.set(key, group)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, evts]) => ({
      key,
      label: format(new Date(key + "-01"), "MMMM yyyy"),
      events: evts.sort((a, b) => b.date.getTime() - a.date.getTime()),
    }))
}

// ── Props ───────────────────────────────────────────────────────────────────

export interface MedicalTimelineProps {
  conditions: Condition[]
  allergies: AllergyIntolerance[]
  medications: MedicationStatement[]
  medicationRequests: MedicationRequest[]
  immunizations: Immunization[]
  vitals: Observation[]
  labs: LabResult[]
  procedures: Procedure[]
  flags: FlagAlert[]
  pregnancyStatus: PregnancyStatus[]
  pregnancyEdd: PregnancyEdd[]
  encounters: Encounter[]
  imagingStudies: ImagingStudy[]
  diagnosticReports: DiagnosticReport[]
  documents: DocumentReference[]
  devices: DeviceUseStatement[]
  /** Search query from the Dashboard (filters events by title/subtitle/date) */
  search?: string
  onOpenDetail: (title: string, resource: AnyResource) => void
}

// ── Category filter pills ───────────────────────────────────────────────────

const ALL_CATEGORIES: TimelineCategory[] = [
  "encounter", "condition", "procedure", "medication", "immunization",
  "lab", "vital", "imaging", "diagnostic", "document", "allergy",
  "flag", "pregnancy", "device",
]

// ── Category side assignment (desktop alternating) ──────────────────────────

const CATEGORY_SIDE: Record<TimelineCategory, "left" | "right"> = {
  encounter:    "left",
  condition:    "left",
  procedure:    "left",
  medication:   "left",
  immunization: "left",
  flag:         "left",
  pregnancy:    "left",
  lab:          "right",
  vital:        "right",
  imaging:      "right",
  diagnostic:   "right",
  document:     "right",
  allergy:      "right",
  device:       "right",
}

// ── Component ───────────────────────────────────────────────────────────────

export function MedicalTimeline(props: MedicalTimelineProps) {
  const { t } = useTranslation()
  const { translateCoding } = useFhirTranslation()
  const [activeCategories, setActiveCategories] = useState<Set<TimelineCategory> | null>(null) // null = all
  const search = props.search ?? ""

  const allEvents = useMemo(() => extractEvents(props), [
    props.conditions, props.allergies, props.medications, props.medicationRequests,
    props.immunizations, props.vitals, props.labs, props.procedures,
    props.flags, props.pregnancyStatus, props.pregnancyEdd, props.encounters,
    props.imagingStudies, props.diagnosticReports, props.documents, props.devices,
  ])

  const filteredEvents = useMemo(() => {
    let evts = allEvents
    if (activeCategories) {
      evts = evts.filter(e => activeCategories.has(e.category))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      evts = evts.filter(e =>
        e.title.toLowerCase().includes(q)
        || e.subtitle?.toLowerCase().includes(q)
        || CATEGORY_CONFIG[e.category].label.toLowerCase().includes(q)
        || format(e.date, "MMM d, yyyy").toLowerCase().includes(q)
      )
    }
    return evts
  }, [allEvents, activeCategories, search])

  const monthGroups = useMemo(() => groupByMonth(filteredEvents), [filteredEvents])

  // Category counts for filter pills
  const categoryCounts = useMemo(() => {
    const counts = new Map<TimelineCategory, number>()
    for (const e of allEvents) counts.set(e.category, (counts.get(e.category) ?? 0) + 1)
    return counts
  }, [allEvents])

  const toggleCategory = (cat: TimelineCategory) => {
    setActiveCategories(prev => {
      if (!prev) {
        // From "all" → select just this one
        return new Set([cat])
      }
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
        return next.size === 0 ? null : next
      }
      next.add(cat)
      // If all categories are selected, go back to null (= show all)
      if (next.size === ALL_CATEGORIES.filter(c => categoryCounts.has(c)).length) return null
      return next
    })
  }

  if (allEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <CalendarDays className="size-10 opacity-40" />
        <p className="text-sm">{t("timeline.noEvents", "No dated medical events to display")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_CATEGORIES.filter(c => categoryCounts.has(c)).map(cat => {
          const cfg = CATEGORY_CONFIG[cat]
          const count = categoryCounts.get(cat) ?? 0
          const active = !activeCategories || activeCategories.has(cat)
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${
                active
                  ? "bg-primary/10 border-primary/30 text-foreground"
                  : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <cfg.icon className={`size-3 ${active ? cfg.color : "opacity-40"}`} />
              {cfg.label}
              <span className="text-[10px] opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      {filteredEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t("timeline.noMatches", "No events match your filters")}
        </p>
      ) : (
        <div className="relative">
          {monthGroups.map((group, gi) => (
            <div key={group.key} className={gi > 0 ? "mt-8" : ""}>
              {/* Month header — centered on desktop */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground md:text-center">
                  {group.label}
                </h3>
              </div>

              {/* Mobile: left-aligned single column */}
              <div className="relative md:hidden ml-3 border-l-2 border-border pl-6 space-y-4">
                {group.events.map((event) => (
                  <TimelineEventCard
                    key={event.id}
                    event={event}
                    translateCoding={translateCoding}
                    onOpenDetail={props.onOpenDetail}
                    layout="mobile"
                  />
                ))}
              </div>

              {/* Desktop: centered line, alternating left/right by category */}
              <div className="relative hidden md:block">
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-px bg-border" />

                <div className="space-y-4">
                  {group.events.map((event) => {
                    const side = CATEGORY_SIDE[event.category]
                    return (
                      <TimelineEventCard
                        key={event.id}
                        event={event}
                        translateCoding={translateCoding}
                        onOpenDetail={props.onOpenDetail}
                        layout={side}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        {t("timeline.summary", "{{count}} events across {{months}} months", {
          count: filteredEvents.length,
          months: monthGroups.length,
        })}
      </p>
    </div>
  )
}

// ── Timeline event card ─────────────────────────────────────────────────────

function TimelineEventCard({
  event,
  translateCoding,
  onOpenDetail,
  layout,
}: {
  event: TimelineEvent
  translateCoding: (coding: { display?: string; code?: string; system?: string } | undefined) => string | undefined
  onOpenDetail: (title: string, resource: AnyResource) => void
  layout: "mobile" | "left" | "right"
}) {
  const cfg = CATEGORY_CONFIG[event.category]
  const Icon = cfg.icon

  // Mobile layout — simple left-aligned
  if (layout === "mobile") {
    return (
      <div className="relative">
        <div className={`absolute -left-[31px] top-1 size-4 rounded-full border-2 border-background ${cfg.dotColor} flex items-center justify-center`}>
          <div className="size-1.5 rounded-full bg-white/80" />
        </div>
        <EventCardContent event={event} cfg={cfg} Icon={Icon} translateCoding={translateCoding} onOpenDetail={onOpenDetail} />
      </div>
    )
  }

  // Desktop layout — left or right of center line
  const isLeft = layout === "left"

  return (
    <div className="relative flex items-start">
      {/* Left content area */}
      <div className={`w-[calc(50%-20px)] ${isLeft ? "" : "order-1"}`}>
        {isLeft && (
          <EventCardContent event={event} cfg={cfg} Icon={Icon} translateCoding={translateCoding} onOpenDetail={onOpenDetail} />
        )}
      </div>

      {/* Center dot */}
      <div className="relative z-10 flex items-center justify-center w-10 shrink-0">
        <div className={`size-4 rounded-full border-2 border-background ${cfg.dotColor} flex items-center justify-center`}>
          <div className="size-1.5 rounded-full bg-white/80" />
        </div>
      </div>

      {/* Right content area */}
      <div className={`w-[calc(50%-20px)] ${isLeft ? "order-1" : ""}`}>
        {!isLeft && (
          <EventCardContent event={event} cfg={cfg} Icon={Icon} translateCoding={translateCoding} onOpenDetail={onOpenDetail} />
        )}
      </div>
    </div>
  )
}

// ── Shared event card content ───────────────────────────────────────────────

function EventCardContent({
  event,
  cfg,
  Icon,
  translateCoding,
  onOpenDetail,
}: {
  event: TimelineEvent
  cfg: typeof CATEGORY_CONFIG[TimelineCategory]
  Icon: typeof Heart
  translateCoding: (coding: { display?: string; code?: string; system?: string } | undefined) => string | undefined
  onOpenDetail: (title: string, resource: AnyResource) => void
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 hover:border-border hover:shadow-sm transition-all">
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 ${cfg.color}`}>
          <Icon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <RecordName resource={event.resource} onOpen={onOpenDetail}>
              <span className="font-medium text-sm">
                {translateCoding(
                  (event.resource as { code?: { coding?: { display?: string; code?: string; system?: string }[] } }).code?.coding?.[0]
                ) || event.title}
              </span>
            </RecordName>
            <span className={`text-[10px] font-medium uppercase tracking-wide ${cfg.color}`}>
              {cfg.label}
            </span>
            {event.badge && (
              <Badge variant={event.badge.variant} className="text-[10px] px-1.5 py-0">
                {event.badge.label}
              </Badge>
            )}
          </div>
          {event.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {event.subtitle}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            {format(event.date, "MMM d, yyyy")}
            <span className="ml-1.5 opacity-70">
              ({formatDistanceToNow(event.date, { addSuffix: true })})
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
