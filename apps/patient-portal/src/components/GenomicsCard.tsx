import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@max-health-inc/shared-ui"
import { Dna, ChevronDown, ChevronUp, FileText, AlertTriangle, Pill } from "lucide-react"
import { format } from "date-fns"
import type {
  GenomicReport,
  Variant,
  DiagnosticImplication,
  TherapeuticImplication,
} from "@/lib/fhir-client"
import type { DiagnosticReportStatusUvIpsCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-DiagnosticReportStatusUvIps"
import { RecordName, type AnyResource } from "@/lib/ips-display-helpers"

// ── LOINC component code helpers ────────────────────────────────────────────

/** Extract the display text for a specific LOINC component from an Observation */
function getComponent(obs: { component?: Array<{ code?: { coding?: Array<{ code?: string; system?: string }>; text?: string }; valueCodeableConcept?: { coding?: Array<{ display?: string }>; text?: string }; valueString?: string; valueQuantity?: { value?: number; unit?: string } }> }, loincCode: string) {
  return obs.component?.find((c) =>
    c.code?.coding?.some((cd) => cd.system === "http://loinc.org" && cd.code === loincCode),
  )
}

function componentDisplay(comp: ReturnType<typeof getComponent>): string | undefined {
  if (!comp) return undefined
  if (comp.valueCodeableConcept?.coding?.[0]?.display) return comp.valueCodeableConcept.coding[0].display
  if (comp.valueCodeableConcept?.text) return comp.valueCodeableConcept.text
  if (comp.valueString) return comp.valueString
  if (comp.valueQuantity) return `${comp.valueQuantity.value ?? ""} ${comp.valueQuantity.unit ?? ""}`.trim()
  return undefined
}

// ── Well-known LOINC codes for genomics components ──────────────────────────

const LOINC = {
  GENE_STUDIED: "48018-6",
  HGVS_CODING: "48004-6",
  HGVS_PROTEIN: "48005-3",
  CLINICAL_SIGNIFICANCE: "53037-8",
  ASSOCIATED_DISEASE: "81259-4",
  DRUG_ASSESSED: "51963-7",
  ALLELIC_STATE: "53034-5",
  GENOMIC_REF_SEQ: "48013-7",
  TRANSCRIPT_REF_SEQ: "51958-7",
  AMINO_ACID_CHANGE: "48005-3",
  DNA_CHANGE_TYPE: "48019-4",
} as const

// ── Clinical significance color mapping ─────────────────────────────────────

function significanceBadge(text: string) {
  const lower = text.toLowerCase()
  if (lower.includes("pathogenic") && !lower.includes("benign") && !lower.includes("likely")) {
    return <Badge variant="destructive">{text}</Badge>
  }
  if (lower.includes("likely pathogenic")) {
    return <Badge variant="destructive" className="opacity-80">{text}</Badge>
  }
  if (lower.includes("benign")) {
    return <Badge variant="secondary">{text}</Badge>
  }
  if (lower.includes("uncertain") || lower.includes("vus")) {
    return <Badge variant="outline">{text}</Badge>
  }
  return <Badge variant="secondary">{text}</Badge>
}

// ── Variant row ─────────────────────────────────────────────────────────────

function VariantRow({ variant }: { variant: Variant }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const gene = componentDisplay(getComponent(variant, LOINC.GENE_STUDIED))
  const hgvsCoding = componentDisplay(getComponent(variant, LOINC.HGVS_CODING))
  const hgvsProtein = componentDisplay(getComponent(variant, LOINC.HGVS_PROTEIN))
  const clinSig = componentDisplay(getComponent(variant, LOINC.CLINICAL_SIGNIFICANCE))
  const allelicState = componentDisplay(getComponent(variant, LOINC.ALLELIC_STATE))
  const dnaChangeType = componentDisplay(getComponent(variant, LOINC.DNA_CHANGE_TYPE))
  const refSeq = componentDisplay(getComponent(variant, LOINC.TRANSCRIPT_REF_SEQ))

  const title = gene
    ? `${gene}${hgvsCoding ? ` — ${hgvsCoding}` : ""}`
    : variant.code?.coding?.[0]?.display || t("genomics.variant")

  const hasDetails = hgvsProtein || allelicState || dnaChangeType || refSeq

  return (
    <li className="rounded-md border border-border/50 overflow-hidden">
      <button
        type="button"
        onClick={() => hasDetails && setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{title}</span>
            {clinSig && significanceBadge(clinSig)}
          </div>
          {variant.effectiveDateTime && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(variant.effectiveDateTime), "MMM d, yyyy")}
            </p>
          )}
        </div>
        {hasDetails && (
          expanded ? <ChevronUp className="size-4 mt-1 shrink-0 text-muted-foreground" />
            : <ChevronDown className="size-4 mt-1 shrink-0 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/30 pt-2 space-y-1">
          {hgvsProtein && (
            <Detail label={t("genomics.proteinChange")} value={hgvsProtein} />
          )}
          {allelicState && (
            <Detail label={t("genomics.allelicState")} value={allelicState} />
          )}
          {dnaChangeType && (
            <Detail label={t("genomics.dnaChangeType")} value={dnaChangeType} />
          )}
          {refSeq && (
            <Detail label={t("genomics.transcript")} value={refSeq} />
          )}
        </div>
      )}
    </li>
  )
}

// ── Detail row helper ───────────────────────────────────────────────────────

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs truncate">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-mono">{value}</span>
    </p>
  )
}

// ── Diagnostic implication row ──────────────────────────────────────────────

function DiagnosticImplicationRow({ impl, onOpenDetail }: { impl: DiagnosticImplication; onOpenDetail?: (title: string, resource: AnyResource) => void }) {
  const { t } = useTranslation()
  const disease = componentDisplay(getComponent(impl, LOINC.ASSOCIATED_DISEASE))
  const clinSig = componentDisplay(getComponent(impl, LOINC.CLINICAL_SIGNIFICANCE))
  const label = disease || impl.code?.coding?.[0]?.display || t("genomics.diagnosticImplication")

  return (
    <li className="flex items-center gap-2 text-sm">
      <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
      {onOpenDetail ? (
        <RecordName resource={impl as AnyResource} onOpen={onOpenDetail}>
          {label}
        </RecordName>
      ) : (
        <span className="font-medium">{label}</span>
      )}
      {clinSig && significanceBadge(clinSig)}
    </li>
  )
}

// ── Therapeutic implication row ─────────────────────────────────────────────

function TherapeuticImplicationRow({ impl, onOpenDetail }: { impl: TherapeuticImplication; onOpenDetail?: (title: string, resource: AnyResource) => void }) {
  const { t } = useTranslation()
  const drug = componentDisplay(getComponent(impl, LOINC.DRUG_ASSESSED))
  const clinSig = componentDisplay(getComponent(impl, LOINC.CLINICAL_SIGNIFICANCE))
  const label = drug || impl.code?.coding?.[0]?.display || t("genomics.therapeuticImplication")

  return (
    <li className="flex items-center gap-2 text-sm">
      <Pill className="size-3.5 text-blue-500 shrink-0" />
      {onOpenDetail ? (
        <RecordName resource={impl as AnyResource} onOpen={onOpenDetail}>
          {label}
        </RecordName>
      ) : (
        <span className="font-medium">{label}</span>
      )}
      {clinSig && significanceBadge(clinSig)}
    </li>
  )
}

// ── Main GenomicsCard ───────────────────────────────────────────────────────

export function GenomicsCard({
  reports,
  variants,
  diagnosticImplications,
  therapeuticImplications,
  onOpenDetail,
  defaultCollapsed = false,
}: {
  reports: GenomicReport[]
  variants: Variant[]
  diagnosticImplications: DiagnosticImplication[]
  therapeuticImplications: TherapeuticImplication[]
  onOpenDetail?: (title: string, resource: AnyResource) => void
  defaultCollapsed?: boolean
}) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const isEmpty =
    reports.length === 0 &&
    variants.length === 0 &&
    diagnosticImplications.length === 0 &&
    therapeuticImplications.length === 0

  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={() => setCollapsed(!collapsed)}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Dna className="size-4 text-violet-500" />
          {t("genomics.title")}
          {!isEmpty && (
            <span className="text-xs font-normal text-muted-foreground ml-auto mr-1">
              {variants.length > 0 && t("genomics.variants", { n: variants.length })}
              {reports.length > 0 && ` · ${reports.length} ${t("genomics.reports").toLowerCase()}`}
            </span>
          )}
          {collapsed ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronUp className="size-4 text-muted-foreground shrink-0" />}
        </CardTitle>
      </CardHeader>
      {!collapsed && (
      <CardContent>
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">{t("genomics.noRecords")}</p>
        ) : (
          <div className="space-y-4">
            {/* Genomic Reports */}
            {reports.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <FileText className="size-3" />
                  {t("genomics.reports")}
                </h4>
                <ul className="space-y-1.5">
                  {reports.map((r, i) => (
                    <li key={r.id || i} className="text-sm flex justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {onOpenDetail ? (
                          <RecordName resource={r as AnyResource} onOpen={onOpenDetail}>
                            {r.code?.coding?.[0]?.display || t("genomics.genomicReport")}
                          </RecordName>
                        ) : (
                          <span className="font-medium truncate">
                            {r.code?.coding?.[0]?.display || t("genomics.genomicReport")}
                          </span>
                        )}
                        {r.status && (r.status as DiagnosticReportStatusUvIpsCode) !== ("final" satisfies DiagnosticReportStatusUvIpsCode) && (
                          <Badge variant={(r.status as DiagnosticReportStatusUvIpsCode) === ("cancelled" satisfies DiagnosticReportStatusUvIpsCode) ? "destructive" : "outline"} className="text-xs">
                            {r.status}
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {r.effectiveDateTime
                          ? format(new Date(r.effectiveDateTime), "MMM d, yyyy")
                          : r.issued
                            ? format(new Date(r.issued), "MMM d, yyyy")
                            : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Variants */}
            {variants.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Dna className="size-3" />
                  {t("genomics.variants", { n: variants.length })}
                </h4>
                <ul className="grid gap-1.5 md:grid-cols-2">
                  {variants.map((v, i) => (
                    <VariantRow key={v.id || i} variant={v} />
                  ))}
                </ul>
              </div>
            )}

            {/* Diagnostic Implications + Pharmacogenomics side by side on desktop */}
            {(diagnosticImplications.length > 0 || therapeuticImplications.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Diagnostic Implications */}
                {diagnosticImplications.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="size-3" />
                      {t("genomics.diagnosticImplications")}
                    </h4>
                    <ul className="space-y-1.5">
                      {diagnosticImplications.map((di, i) => (
                        <DiagnosticImplicationRow key={di.id || i} impl={di} onOpenDetail={onOpenDetail} />
                      ))}
                    </ul>
                  </div>
                )}

                {/* Therapeutic Implications (Pharmacogenomics) */}
                {therapeuticImplications.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Pill className="size-3" />
                      {t("genomics.pharmacogenomics")}
                    </h4>
                    <ul className="space-y-1.5">
                      {therapeuticImplications.map((ti, i) => (
                        <TherapeuticImplicationRow key={ti.id || i} impl={ti} onOpenDetail={onOpenDetail} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
      )}
    </Card>
  )
}
