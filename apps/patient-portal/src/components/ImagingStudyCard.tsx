import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@proxy-smart/shared-ui"
import { ScanLine, ChevronDown, ChevronUp, ImageIcon, Eye } from "lucide-react"
import { format } from "date-fns"
import type { ImagingStudy, RadiologyResult } from "@/lib/fhir-client"
import {
  getStudyInstanceUID,
  getStudyThumbnailUrl,
  getSeriesThumbnailUrl,
  getStudyTitle,
  getPrimaryModality,
  getModalityInfo,
  getDicomwebAuthHeaders,
} from "@/lib/dicomweb"
import { DicomViewerDialog, type ViewerTarget } from "./DicomViewer"

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

  // Fetch the thumbnail with auth headers, then display via object URL
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

function StudyRow({ study, onViewSeries }: { study: ImagingStudy; onViewSeries: (target: ViewerTarget) => void }) {
  const [expanded, setExpanded] = useState(false)
  const studyUID = getStudyInstanceUID(study)
  const modality = getPrimaryModality(study)
  const modalityInfo = modality ? getModalityInfo(modality) : null
  const title = getStudyTitle(study)
  const hasSeries = (study.series?.length ?? 0) > 0

  /** Open the viewer for the first series (quick-view from header) */
  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!studyUID || !study.series?.length) return
    const first = study.series[0]
    onViewSeries({
      studyUID,
      seriesUID: first.uid,
      seriesDescription: first.description || title,
      modality: first.modality?.code || modality || undefined,
    })
  }

  return (
    <li className="rounded-md border border-border/50 overflow-hidden">
      {/* Study header row */}
      <button
        type="button"
        onClick={() => hasSeries && setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
      >
        {/* Thumbnail */}
        {studyUID ? (
          <DicomThumbnail
            src={getStudyThumbnailUrl(studyUID)}
            alt={title}
            className="size-12 shrink-0 rounded"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted/30 text-muted-foreground">
            <ImageIcon className="size-5 opacity-40" />
          </div>
        )}

        {/* Study info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{title}</span>
            {modalityInfo && (
              <Badge variant="secondary" className="shrink-0">
                {modalityInfo.emoji} {modalityInfo.label}
              </Badge>
            )}
            {study.status && study.status !== "available" && (
              <Badge variant={study.status === "cancelled" ? "destructive" : "outline"} className="shrink-0">
                {study.status}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            {study.started && (
              <span>{format(new Date(study.started), "MMM d, yyyy")}</span>
            )}
            {study.numberOfSeries != null && (
              <span>{study.numberOfSeries} series</span>
            )}
            {study.numberOfInstances != null && (
              <span>{study.numberOfInstances} images</span>
            )}
          </div>
        </div>

        {/* View + Expand toggles */}
        <div className="flex items-center gap-1 shrink-0 mt-1">
          {studyUID && hasSeries && (
            <button
              type="button"
              onClick={handleQuickView}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="View images"
            >
              <Eye className="size-4" />
            </button>
          )}
          {hasSeries && (
            <span className="text-muted-foreground">
              {expanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </span>
          )}
        </div>
      </button>

      {/* Expanded series list */}
      {expanded && hasSeries && studyUID && (
        <div className="border-t border-border/50 bg-muted/10 p-3 pt-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Series
          </p>
          <ul className="space-y-2">
            {study.series!.map((series, si) => {
              const seriesModality = series.modality?.code
              const seriesInfo = seriesModality ? getModalityInfo(seriesModality) : null
              return (
                <li key={series.uid || `s-${si}`} className="flex items-start gap-2">
                  {/* Series thumbnail */}
                  <DicomThumbnail
                    src={getSeriesThumbnailUrl(studyUID, series.uid)}
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
                        <span>{series.numberOfInstances} images</span>
                      )}
                      {series.bodySite?.display && (
                        <span className="ml-2">{series.bodySite.display}</span>
                      )}
                    </div>
                  </div>
                  {/* View series button */}
                  <button
                    type="button"
                    onClick={() =>
                      onViewSeries({
                        studyUID,
                        seriesUID: series.uid,
                        seriesDescription: series.description || `Series ${(series.number ?? si) + 1}`,
                        modality: seriesModality || modality || undefined,
                      })
                    }
                    className="shrink-0 mt-0.5 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    title="View series"
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
}: {
  imagingStudies: ImagingStudy[]
  radiologyResults: RadiologyResult[]
}) {
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  const handleViewSeries = (target: ViewerTarget) => {
    setViewerTarget(target)
    setViewerOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="size-4 text-violet-500" />
            Imaging Studies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {imagingStudies.length === 0 && radiologyResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imaging records</p>
          ) : (
            <div className="space-y-3">
              {/* Imaging studies with thumbnails */}
              {imagingStudies.length > 0 && (
                <ul className="space-y-2">
                  {imagingStudies.map((study, i) => (
                    <StudyRow
                      key={study.id || `img-${i}`}
                      study={study}
                      onViewSeries={handleViewSeries}
                    />
                  ))}
                </ul>
              )}

              {/* Radiology observation results */}
              {radiologyResults.length > 0 && (
                <>
                  {imagingStudies.length > 0 && (
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium pt-1">
                      Radiology Reports
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {radiologyResults.map((obs, i) => (
                      <li
                        key={obs.id || `rad-${i}`}
                        className="text-sm flex justify-between"
                      >
                        <span className="font-medium truncate mr-2">
                          {obs.code?.coding?.[0]?.display ||
                            obs.code?.text ||
                            "Radiology result"}
                        </span>
                        {obs.effectiveDateTime && (
                          <span className="text-muted-foreground whitespace-nowrap">
                            {format(
                              new Date(obs.effectiveDateTime),
                              "MMM d, yyyy",
                            )}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DICOM Viewer modal */}
      <DicomViewerDialog
        target={viewerTarget}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </>
  )
}
