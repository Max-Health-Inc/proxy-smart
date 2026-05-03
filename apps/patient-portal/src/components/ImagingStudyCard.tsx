import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@proxy-smart/shared-ui"
import { ScanLine, ChevronDown, ChevronUp, ImageIcon, Eye, Search, X, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import type { ImagingStudy, RadiologyResult } from "@/lib/fhir-client"
import type { ImagingStudyStatusUvIpsCode } from "hl7.fhir.uv.ips-generated/valuesets/ValueSet-ImagingStudyStatusUvIps"
import { RecordName, type AnyResource } from "@/lib/ips-display-helpers"
import {
  getStudyInstanceUID,
  getStudyThumbnailUrl,
  getSeriesThumbnailUrl,
  getStudyTitle,
  getPrimaryModality,
  getModalityInfo,
  getDicomwebAuthHeaders,
  extractServerIdFromEndpoint,
} from "@/lib/dicomweb"
import { DicomViewerDialog, type ViewerTarget, type ViewerAppInfo } from "./DicomViewer"

// ── Thumbnail with auth + graceful fallback ────────────────────────────────

function DicomThumbnail({
  src,
  alt,
  className = "",
}: {
  src: string
  alt: string
  className?: string
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  if (!imgSrc && !failed) {
    fetch(src, { headers: getDicomwebAuthHeaders() })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        setImgSrc(URL.createObjectURL(blob))
      })
      .catch(() => setFailed(true))
  }

  if (failed || !imgSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/30 text-muted-foreground ${className}`}
      >
        <ImageIcon className="size-6 opacity-40" />
      </div>
    )
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  )
}

// ── Study row (expandable to show series) ──────────────────────────────────

function StudyRow({
  study,
  onViewSeries,
  readOnly: _readOnly = false,
  serverId,
}: {
  study: ImagingStudy
  onViewSeries: (target: ViewerTarget) => void
  readOnly?: boolean
  serverId?: string
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const studyUID = getStudyInstanceUID(study)
  const modality = getPrimaryModality(study)
  const modalityInfo = modality ? getModalityInfo(modality) : null
  const title = getStudyTitle(study)
  const hasSeries = (study.series?.length ?? 0) > 0

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!studyUID || !study.series?.length) return
    const first = study.series[0]
    onViewSeries({
      studyUID,
      seriesUID: first.uid,
      seriesDescription: first.description || title,
      modality: first.modality?.code || modality || undefined,
      serverId,
    })
  }

  return (
    <li className="rounded-md border border-border/50 overflow-hidden">
      <button
        type="button"
        onClick={() => hasSeries && setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
      >
        {studyUID ? (
          <DicomThumbnail
            src={getStudyThumbnailUrl(studyUID, serverId)}
            alt={title}
            className="size-12 shrink-0 rounded"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted/30 text-muted-foreground">
            <ImageIcon className="size-5 opacity-40" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{title}</span>
            {modalityInfo && (
              <Badge variant="secondary" className="shrink-0">
                {modalityInfo.emoji} {modalityInfo.label}
              </Badge>
            )}
            {study.status && (study.status as ImagingStudyStatusUvIpsCode) !== ("available" satisfies ImagingStudyStatusUvIpsCode) && (
              <Badge
                variant={(study.status as ImagingStudyStatusUvIpsCode) === ("cancelled" satisfies ImagingStudyStatusUvIpsCode) ? "destructive" : "outline"}
                className="shrink-0"
              >
                {study.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            {study.started && <span>{format(new Date(study.started), "MMM d, yyyy")}</span>}
            {study.numberOfSeries != null && <span>{t("imagingStudy.nSeries", { n: study.numberOfSeries })}</span>}
            {study.numberOfInstances != null && <span>{t("imagingStudy.nImages", { n: study.numberOfInstances })}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 mt-1">
          {studyUID && hasSeries && (
            <button
              type="button"
              onClick={handleQuickView}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title={t("imagingStudy.viewImages")}
            >
              <Eye className="size-4" />
            </button>
          )}
          {hasSeries && (
            <span className="text-muted-foreground">
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </span>
          )}
        </div>
      </button>

      {expanded && hasSeries && studyUID && (
        <div className="border-t border-border/50 bg-muted/10 p-3 pt-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            {t("imagingStudy.series")}
          </p>
          <ul className="space-y-2">
            {study.series!.map((series, si) => {
              const seriesModality = series.modality?.code
              const seriesInfo = seriesModality ? getModalityInfo(seriesModality) : null
              return (
                <li key={series.uid || `s-${si}`} className="flex items-start gap-2">
                  <DicomThumbnail
                    src={getSeriesThumbnailUrl(studyUID, series.uid, serverId)}
                    alt={series.description || `Series ${si + 1}`}
                    className="size-10 shrink-0 rounded"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">
                        {series.description || `Series ${(series.number ?? si) + 1}`}
                      </span>
                      {seriesInfo && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          {seriesInfo.emoji} {seriesModality}
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      {series.numberOfInstances != null && (
                        <span>{t("imagingStudy.nImages", { n: series.numberOfInstances })}</span>
                      )}
                      {series.bodySite?.display && (
                        <span className="ml-2">{series.bodySite.display}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onViewSeries({
                        studyUID,
                        seriesUID: series.uid,
                        seriesDescription:
                          series.description || `Series ${(series.number ?? si) + 1}`,
                        modality: seriesModality || modality || undefined,
                        serverId,
                      })
                    }
                    className="shrink-0 mt-0.5 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    title={t("imagingStudy.viewSeries")}
                  >
                    <Eye className="size-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </li>
  )
}

// ── Main card component ────────────────────────────────────────────────────

export function ImagingStudyCard({
  imagingStudies,
  radiologyResults,
  readOnly = false,
  onOpenDetail,
  defaultCollapsed = false,
}: {
  imagingStudies: ImagingStudy[]
  radiologyResults: RadiologyResult[]
  readOnly?: boolean
  onOpenDetail?: (title: string, resource: AnyResource) => void
  defaultCollapsed?: boolean
}) {
  const { t } = useTranslation()
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [viewerApp, setViewerApp] = useState<ViewerAppInfo | null>(null)
  const [viewerAppFetched, setViewerAppFetched] = useState(false)

  // Lazy-fetch the configured viewer app only when expanded
  useEffect(() => {
    if (collapsed || viewerAppFetched) return
    setViewerAppFetched(true)
    fetch('/dicomweb/viewer-app')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setViewerApp(data) })
      .catch(() => {})
  }, [collapsed, viewerAppFetched])

  const handleViewSeries = (target: ViewerTarget) => {
    setViewerTarget(target)
    setViewerOpen(true)
  }

  const filteredStudies = useMemo(() => {
    if (!search.trim()) return imagingStudies
    const q = search.toLowerCase()
    return imagingStudies.filter((study) => {
      const title = getStudyTitle(study).toLowerCase()
      const modality = getPrimaryModality(study)?.toLowerCase() ?? ""
      const modalityInfo = modality ? getModalityInfo(modality)?.label.toLowerCase() ?? "" : ""
      const dateStr = study.started
        ? format(new Date(study.started), "MMM d, yyyy").toLowerCase()
        : ""
      const seriesText = study.series
        ?.map((s) => (s.description ?? "").toLowerCase())
        .join(" ") ?? ""
      return (
        title.includes(q) ||
        modality.includes(q) ||
        modalityInfo.includes(q) ||
        dateStr.includes(q) ||
        seriesText.includes(q)
      )
    })
  }, [imagingStudies, search])

  const filteredRadiology = useMemo(() => {
    if (!search.trim()) return radiologyResults
    const q = search.toLowerCase()
    return radiologyResults.filter((obs) => {
      const display =
        obs.code?.coding?.[0]?.display?.toLowerCase() ?? obs.code?.text?.toLowerCase() ?? ""
      const dateStr = obs.effectiveDateTime
        ? format(new Date(obs.effectiveDateTime), "MMM d, yyyy").toLowerCase()
        : ""
      return display.includes(q) || dateStr.includes(q)
    })
  }, [radiologyResults, search])

  const hasData = imagingStudies.length > 0 || radiologyResults.length > 0
  const hasResults = filteredStudies.length > 0 || filteredRadiology.length > 0

  return (
    <>
      <Card>
        <CardHeader className="cursor-pointer select-none" onClick={() => setCollapsed(!collapsed)}>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="size-4 text-violet-500" />
            {t("imagingStudy.title")}
            {hasData && (
              <span className="text-xs font-normal text-muted-foreground ml-auto mr-1">
                {t("imagingStudy.nStudies", { count: imagingStudies.length })}
                {radiologyResults.length > 0 && ` · ${t("imagingStudy.nReports", { n: radiologyResults.length })}`}
              </span>
            )}
            {collapsed ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronUp className="size-4 text-muted-foreground shrink-0" />}
          </CardTitle>
          {!collapsed && hasData && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1">
              <AlertTriangle className="size-3 shrink-0" />
              {t("imagingStudy.dataWarning")}
            </p>
          )}
        </CardHeader>
        {!collapsed && (
        <CardContent>
          {!hasData ? (
            <p className="text-sm text-muted-foreground">{t("imagingStudy.noImagingRecords")}</p>
          ) : (
            <div className="space-y-3">
              {/* Search filter */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("imagingStudy.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {!hasResults ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("imagingStudy.noMatchingStudies", { query: search })}
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Imaging studies with thumbnails — 2-col grid */}
                  {filteredStudies.length > 0 && (
                    <ul className="grid gap-2 md:grid-cols-2">
                      {filteredStudies.map((study, i) => (
                        <StudyRow
                          key={study.id || `img-${i}`}
                          study={study}
                          onViewSeries={handleViewSeries}
                          readOnly={readOnly}
                          serverId={extractServerIdFromEndpoint(study.endpoint)}
                        />
                      ))}
                    </ul>
                  )}

                  {/* Radiology observation results */}
                  {filteredRadiology.length > 0 && (
                    <>
                      {filteredStudies.length > 0 && (
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium pt-1">
                          {t("imagingStudy.radiologyReports")}
                        </p>
                      )}
                      <ul className="grid gap-1.5 md:grid-cols-2">
                        {filteredRadiology.map((obs, i) => (
                          <li
                            key={obs.id || `rad-${i}`}
                            className="text-sm flex justify-between gap-2"
                          >
                            {onOpenDetail ? (
                              <RecordName resource={obs as AnyResource} onOpen={onOpenDetail}>
                                {obs.code?.coding?.[0]?.display ||
                                  obs.code?.text ||
                                  "Radiology result"}
                              </RecordName>
                            ) : (
                              <span className="font-medium truncate min-w-0">
                                {obs.code?.coding?.[0]?.display ||
                                  obs.code?.text ||
                                  "Radiology result"}
                              </span>
                            )}
                            {obs.effectiveDateTime && (
                              <span className="text-muted-foreground whitespace-nowrap">
                                {format(new Date(obs.effectiveDateTime), "MMM d, yyyy")}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
        )}
      </Card>

      <DicomViewerDialog
        target={viewerTarget}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        viewerApp={viewerApp}
      />
    </>
  )
}
