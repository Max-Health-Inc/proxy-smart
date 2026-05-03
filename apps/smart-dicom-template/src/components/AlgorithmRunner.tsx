import { useCallback, useEffect, useState } from "react"
import type { ImagingStudyUvIps as ImagingStudy } from "hl7.fhir.uv.ips-generated"
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from "@max-health-inc/shared-ui"
import { smartAuth } from "@/lib/smart-auth"
import { fhirBaseUrl } from "@/lib/smart-auth"
import {
  getStudyInstanceUID,
  getPrimaryModality,
  getStudyTitle,
  getModalityInfo,
  getAccessToken,
  getCornerstoneDicomweb,
  getStudyThumbnailUrl,
} from "@/lib/dicomweb"
import { type AlgorithmResult, runAlgorithm } from "@/algorithm"
import { ensureCornerstoneInit } from "@/lib/cornerstone-init"
import { Play, ImageIcon, CheckCircle, AlertTriangle, Info, RefreshCw } from "lucide-react"

type RunState = "idle" | "loading-images" | "running" | "done" | "error"

export function AlgorithmRunner() {
  const [studies, setStudies] = useState<ImagingStudy[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudy, setSelectedStudy] = useState<ImagingStudy | null>(null)
  const [runState, setRunState] = useState<RunState>("idle")
  const [result, setResult] = useState<AlgorithmResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch ImagingStudy resources ──────────────────────────────────

  useEffect(() => {
    const token = smartAuth.getToken()
    if (!token) return

    fetch(`${fhirBaseUrl}/ImagingStudy?patient=${token.patient}&_count=50`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`FHIR search failed: ${res.status}`)
        return res.json()
      })
      .then((bundle) => {
        const entries = (bundle.entry ?? [])
          .map((e: { resource: ImagingStudy }) => e.resource)
          .filter((r: ImagingStudy) => r.resourceType === "ImagingStudy")
        setStudies(entries)
      })
      .catch((err) => {
        console.error("Failed to fetch ImagingStudy resources:", err)
        setError(err instanceof Error ? err.message : "Failed to load studies")
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Run the algorithm on the selected study ───────────────────────

  const handleRun = useCallback(async (study: ImagingStudy) => {
    setSelectedStudy(study)
    setResult(null)
    setError(null)

    try {
      // 1. Collect all series image IDs
      setRunState("loading-images")
      await ensureCornerstoneInit()

      const studyUID = getStudyInstanceUID(study)
      if (!studyUID) throw new Error("Study has no Study Instance UID")

      const allImageIds: string[] = []
      const csDw = getCornerstoneDicomweb()
      for (const series of study.series ?? []) {
        const seriesUID = series.uid
        if (!seriesUID) continue
        const { imageIds, errors } = await csDw.loadSeries(studyUID, seriesUID)
        if (errors.length > 0) console.warn('DICOMweb loadSeries errors:', errors)
        allImageIds.push(...imageIds)
      }

      if (allImageIds.length === 0) {
        throw new Error("No images found in this study")
      }

      // 2. Run the algorithm
      setRunState("running")
      const token = smartAuth.getToken()
      const algorithmResult = await runAlgorithm({
        studyUID,
        imageIds: allImageIds,
        imagingStudy: study,
        patientReference: `Patient/${token?.patient ?? "unknown"}`,
        accessToken: getAccessToken(),
      })

      setResult(algorithmResult)
      setRunState("done")
    } catch (err) {
      console.error("Algorithm run failed:", err)
      setError(err instanceof Error ? err.message : "Algorithm execution failed")
      setRunState("error")
    }
  }, [])

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Loading imaging studies...</p>
      </div>
    )
  }

  if (studies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <ImageIcon className="size-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">No imaging studies found for this patient.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Study Selector ──────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Select a Study</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {studies.map((study) => {
            const studyUID = getStudyInstanceUID(study)
            const modality = getPrimaryModality(study)
            const title = getStudyTitle(study)
            const modalityInfo = modality ? getModalityInfo(modality) : null
            const isSelected = selectedStudy?.id === study.id
            const thumbnailUrl = studyUID ? getStudyThumbnailUrl(studyUID) : null

            return (
              <Card
                key={study.id}
                className={`cursor-pointer transition-colors hover:border-primary/50 ${
                  isSelected ? "border-primary ring-2 ring-primary/20" : ""
                }`}
                onClick={() => setSelectedStudy(study)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium truncate">
                    {title || "Untitled Study"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {modality && (
                      <span className="inline-flex items-center gap-1">
                        {modalityInfo?.emoji} {modalityInfo?.label ?? modality}
                      </span>
                    )}
                    {study.numberOfSeries != null && (
                      <span className="ml-2">{study.numberOfSeries} series</span>
                    )}
                    {study.numberOfInstances != null && (
                      <span className="ml-1">· {study.numberOfInstances} images</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={title || "Study thumbnail"}
                      className="w-full h-24 object-cover rounded bg-muted"
                      crossOrigin="use-credentials"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="w-full h-24 rounded bg-muted flex items-center justify-center">
                      <ImageIcon className="size-8 text-muted-foreground/30" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ── Run Button ──────────────────────────────────────────── */}
      {selectedStudy && (
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={() => handleRun(selectedStudy)}
            disabled={runState === "loading-images" || runState === "running"}
          >
            {runState === "loading-images" ? (
              <>
                <Spinner size="sm" />
                Loading images...
              </>
            ) : runState === "running" ? (
              <>
                <Spinner size="sm" />
                Running algorithm...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Run Algorithm
              </>
            )}
          </Button>
          {runState === "done" && (
            <Button variant="outline" onClick={() => handleRun(selectedStudy)}>
              <RefreshCw className="size-4" />
              Re-run
            </Button>
          )}
        </div>
      )}

      {/* ── Result Display ──────────────────────────────────────── */}
      {runState === "done" && result && <ResultCard result={result} />}

      {runState === "error" && error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Algorithm Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Result Card ──────────────────────────────────────────────────────────

function ResultCard({ result }: { result: AlgorithmResult }) {
  const severityIcon = {
    info: <Info className="size-5 text-blue-500" />,
    warning: <AlertTriangle className="size-5 text-amber-500" />,
    critical: <AlertTriangle className="size-5 text-red-500" />,
  }

  const severityBorder = {
    info: "border-blue-200",
    warning: "border-amber-200",
    critical: "border-red-300",
  }

  const severity = result.severity ?? "info"

  return (
    <Card className={severityBorder[severity]}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {severityIcon[severity]}
          {result.title}
          {result.confidence != null && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {(result.confidence * 100).toFixed(1)}% confidence
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{result.description}</p>
        {result.code && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="size-3" />
            <span>
              {result.code.display} ({result.code.system}#{result.code.code})
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
