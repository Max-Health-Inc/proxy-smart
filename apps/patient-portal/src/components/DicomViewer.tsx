import { useEffect, useRef, useCallback, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, ZoomIn, ZoomOut, RotateCcw, Loader2 } from "lucide-react"
import { Badge } from "@proxy-smart/shared-ui"
import {
  fetchSeriesImageIds,
  getAccessToken,
  getModalityInfo,
} from "@/lib/dicomweb"

// ── Types ──────────────────────────────────────────────────────────────────

export interface ViewerTarget {
  studyUID: string
  seriesUID: string
  seriesDescription?: string
  modality?: string
}

// ── Cornerstone lazy init ──────────────────────────────────────────────────

let csInitialized = false
let csCore: typeof import("@cornerstonejs/core") | null = null
let csTools: typeof import("@cornerstonejs/tools") | null = null

async function ensureCornerstoneInit() {
  if (csInitialized) return

  // Dynamic import to avoid loading 2MB+ at page load
  const [core, tools, loader] = await Promise.all([
    import("@cornerstonejs/core"),
    import("@cornerstonejs/tools"),
    import("@cornerstonejs/dicom-image-loader"),
  ])

  csCore = core
  csTools = tools

  await core.init()
  await loader.init({ maxWebWorkers: Math.min(navigator.hardwareConcurrency || 1, 4) })
  await tools.init()

  // Configure WADO-RS loader to inject auth headers
  loader.internal.setOptions({
    beforeSend: async (xhr: XMLHttpRequest) => {
      const token = getAccessToken()
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      }
    },
  })

  // Register tools
  tools.addTool(tools.StackScrollTool)
  tools.addTool(tools.WindowLevelTool)
  tools.addTool(tools.PanTool)
  tools.addTool(tools.ZoomTool)

  csInitialized = true
}

// ── Viewport component ─────────────────────────────────────────────────────

function CornerstoneViewport({
  target,
  onImageChange,
}: {
  target: ViewerTarget
  onImageChange?: (current: number, total: number) => void
}) {
  const elementRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<InstanceType<typeof import("@cornerstonejs/core").RenderingEngine> | null>(null)
  const toolGroupRef = useRef<ReturnType<typeof import("@cornerstonejs/tools").ToolGroupManager.createToolGroup> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const viewportId = "dicom-stack-viewport"
  const renderingEngineId = "dicom-rendering-engine"
  const toolGroupId = "dicom-tool-group"

  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      try {
        setLoading(true)
        setError(null)

        await ensureCornerstoneInit()
        if (cancelled || !csCore || !csTools || !elementRef.current) return

        // Fetch imageIds for this series
        const imageIds = await fetchSeriesImageIds(target.studyUID, target.seriesUID)
        if (cancelled) return

        if (imageIds.length === 0) {
          setError("No images found in this series")
          setLoading(false)
          return
        }

        // Clean up previous engine
        if (engineRef.current) {
          engineRef.current.destroy()
        }

        // Create rendering engine
        const engine = new csCore.RenderingEngine(renderingEngineId)
        engineRef.current = engine

        engine.enableElement({
          viewportId,
          element: elementRef.current,
          type: csCore.Enums.ViewportType.STACK,
        })

        // Set up tool group
        let toolGroup = csTools.ToolGroupManager.getToolGroup(toolGroupId)
        if (toolGroup) {
          csTools.ToolGroupManager.destroyToolGroup(toolGroupId)
        }
        toolGroup = csTools.ToolGroupManager.createToolGroup(toolGroupId)!
        toolGroupRef.current = toolGroup

        toolGroup.addViewport(viewportId, renderingEngineId)

        // Stack scroll = mouse wheel
        toolGroup.addTool(csTools.StackScrollTool.toolName)
        toolGroup.setToolActive(csTools.StackScrollTool.toolName)

        // Window/Level = left mouse drag
        toolGroup.addTool(csTools.WindowLevelTool.toolName)
        toolGroup.setToolActive(csTools.WindowLevelTool.toolName, {
          bindings: [{ mouseButton: csTools.Enums.MouseBindings.Primary }],
        })

        // Pan = middle mouse drag
        toolGroup.addTool(csTools.PanTool.toolName)
        toolGroup.setToolActive(csTools.PanTool.toolName, {
          bindings: [{ mouseButton: csTools.Enums.MouseBindings.Auxiliary }],
        })

        // Zoom = right mouse drag
        toolGroup.addTool(csTools.ZoomTool.toolName)
        toolGroup.setToolActive(csTools.ZoomTool.toolName, {
          bindings: [{ mouseButton: csTools.Enums.MouseBindings.Secondary }],
        })

        // Load the stack
        const viewport = engine.getViewport(viewportId) as InstanceType<typeof csCore.StackViewport>
        await viewport.setStack(imageIds, Math.floor(imageIds.length / 2))
        viewport.render()

        onImageChange?.(Math.floor(imageIds.length / 2) + 1, imageIds.length)

        // Listen for image changes to update the slider
        elementRef.current.addEventListener(
          csCore.Enums.Events.STACK_NEW_IMAGE,
          ((e: CustomEvent) => {
            const { imageIdIndex } = e.detail
            onImageChange?.(imageIdIndex + 1, imageIds.length)
          }) as EventListener,
        )

        // Catch async image decode errors (e.g. corrupt DICOM, missing pixel data)
        elementRef.current.addEventListener(
          csCore.Enums.Events.IMAGE_LOAD_ERROR,
          ((e: CustomEvent) => {
            console.warn('DICOM image load error:', e.detail?.error ?? e.detail)
            if (!cancelled) {
              setError('Failed to decode DICOM image. The file may be corrupt or unsupported.')
            }
          }) as EventListener,
        )

        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load DICOM viewer")
          setLoading(false)
        }
      }
    }

    setup()

    return () => {
      cancelled = true
      if (toolGroupRef.current) {
        csTools?.ToolGroupManager.destroyToolGroup(toolGroupId)
        toolGroupRef.current = null
      }
      if (engineRef.current) {
        engineRef.current.destroy()
        engineRef.current = null
      }
    }
  }, [target.studyUID, target.seriesUID])

  return (
    <div className="relative w-full h-full">
      <div
        ref={elementRef}
        className="w-full h-full bg-black"
        onContextMenu={(e) => e.preventDefault()}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Loader2 className="size-8 text-white animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <p className="text-sm text-red-400 text-center px-4">{error}</p>
        </div>
      )}
    </div>
  )
}

// ── Viewer Dialog ──────────────────────────────────────────────────────────

export function DicomViewerDialog({
  target,
  open,
  onOpenChange,
}: {
  target: ViewerTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [imageInfo, setImageInfo] = useState<{ current: number; total: number } | null>(null)

  const handleImageChange = useCallback((current: number, total: number) => {
    setImageInfo({ current, total })
  }, [])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) setImageInfo(null)
  }, [open])

  const modalityInfo = target?.modality ? getModalityInfo(target.modality) : null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-4 z-50 flex flex-col rounded-lg border border-border/30 bg-background/95 backdrop-blur-sm shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onPointerDownOutside={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">
            {target?.seriesDescription || "DICOM Viewer"}
          </DialogPrimitive.Title>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate">
                {target?.seriesDescription || "DICOM Viewer"}
              </span>
              {modalityInfo && (
                <Badge variant="secondary" className="shrink-0">
                  {modalityInfo.emoji} {modalityInfo.label}
                </Badge>
              )}
              {imageInfo && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {imageInfo.current} / {imageInfo.total}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Controls legend */}
              <div className="hidden sm:flex items-center gap-3 mr-3 text-[10px] text-muted-foreground">
                <span>🖱️ L: W/L</span>
                <span>🖱️ R: Zoom</span>
                <span>⚙️ Scroll: Slice</span>
              </div>
              <DialogPrimitive.Close className="rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Viewport */}
          <div className="flex-1 min-h-0">
            {target && open && (
              <CornerstoneViewport
                target={target}
                onImageChange={handleImageChange}
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
