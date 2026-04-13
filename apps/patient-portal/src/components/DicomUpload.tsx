import { useState, useCallback, useRef } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
} from "@proxy-smart/shared-ui"
import {
  Upload,
  FileImage,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react"
import { storeInstances, type StowResult } from "@/lib/dicomweb"

type UploadStep = "select" | "uploading" | "done"

export function DicomUpload({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<UploadStep>("select")
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<StowResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const dcmFiles = Array.from(incoming).filter(f =>
      f.name.endsWith(".dcm") || f.name.endsWith(".DCM") || f.type === "application/dicom"
    )
    if (dcmFiles.length === 0 && incoming.length > 0) {
      setError("Only .dcm (DICOM) files are supported.")
      return
    }
    setError(null)
    setFiles(prev => [...prev, ...dcmFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return
    setStep("uploading")
    setError(null)

    try {
      const res = await storeInstances(files)
      setResult(res)
      if (!res.ok) {
        setError(`PACS returned status ${res.status}`)
      }
      setStep("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setStep("select")
    }
  }, [files])

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ── Select files step ──────────────────────────────────────────────────

  if (step === "select") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileImage className="size-4" />
            Upload DICOM Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">Drop .dcm files here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              Select one or multiple DICOM files from a study
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".dcm,.DCM,application/dicom"
              multiple
              className="hidden"
              onChange={e => { if (e.target.files) addFiles(e.target.files) }}
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {files.length} file{files.length !== 1 ? "s" : ""} ({formatSize(totalSize)})
                </span>
                <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                  Clear all
                </Button>
              </div>
              <ul className="max-h-40 overflow-y-auto space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted">
                    <span className="truncate">{f.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">{formatSize(f.size)}</Badge>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(i) }} className="text-muted-foreground hover:text-destructive">
                        <X className="size-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" disabled={files.length === 0} onClick={handleUpload}>
              <Upload className="size-4" />
              Upload {files.length > 0 ? `${files.length} File${files.length !== 1 ? "s" : ""}` : ""}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Uploading step ─────────────────────────────────────────────────────

  if (step === "uploading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Spinner size="sm" />
            Uploading to PACS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sending {files.length} DICOM file{files.length !== 1 ? "s" : ""} ({formatSize(totalSize)})...
          </p>
        </CardContent>
      </Card>
    )
  }

  // ── Done step ──────────────────────────────────────────────────────────

  if (step === "done" && result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {result.ok ? (
              <CheckCircle2 className="size-4 text-green-500" />
            ) : (
              <AlertTriangle className="size-4 text-amber-500" />
            )}
            {result.ok ? "Upload Complete" : "Upload Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {result.ok
              ? `${result.instanceCount} DICOM instance${result.instanceCount !== 1 ? "s" : ""} stored successfully. They will appear in your imaging studies shortly.`
              : error || "The PACS server rejected the upload."}
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
