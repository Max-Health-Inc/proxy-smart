import { useState, useCallback } from "react"
import {
  Card, CardContent, CardHeader, CardTitle, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@max-health-inc/shared-ui"
import { FileText, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { fetchBinaryUrl, type DocumentReference } from "@/lib/fhir-client"
import { RecordName, type AnyResource } from "@/lib/ips-display-helpers"
import { useTranslation } from "react-i18next"

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDocTitle(doc: DocumentReference): string {
  return (
    doc.content?.[0]?.attachment?.title ??
    doc.description ??
    doc.type?.coding?.[0]?.display ??
    "Untitled Document"
  )
}

function getDocDate(doc: DocumentReference): string | undefined {
  return doc.date ?? doc.meta?.lastUpdated
}

function getContentType(doc: DocumentReference): string | undefined {
  return doc.content?.[0]?.attachment?.contentType
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  current: "default",
  superseded: "secondary",
  "entered-in-error": "destructive",
}

// ── Utilities for document viewing ───────────────────────────────────────────

/** Determine document link type without resolving URLs yet */
type DocLink =
  | { kind: "external"; url: string }
  | { kind: "fhir-binary"; relativeUrl: string }
  | { kind: "inline-text"; text: string }
  | { kind: "inline-binary"; dataUrl: string }
  | undefined

function classifyDocLink(doc: DocumentReference): DocLink {
  const att = doc.content?.[0]?.attachment
  if (!att) return undefined
  if (att.url) {
    // Absolute URLs (http/https) → external link
    if (/^https?:\/\//i.test(att.url)) return { kind: "external", url: att.url }
    // Relative FHIR reference (e.g. Binary/lab-report-2026-04) → fetch through proxy
    return { kind: "fhir-binary", relativeUrl: att.url }
  }
  if (att.data && att.contentType) {
    // Inline text/plain → show in modal
    if (att.contentType.startsWith("text/")) {
      return { kind: "inline-text", text: atob(att.data) }
    }
    return { kind: "inline-binary", dataUrl: `data:${att.contentType};base64,${att.data}` }
  }
  return undefined
}

// ── Component ────────────────────────────────────────────────────────────────

interface DocumentsCardProps {
  documents: DocumentReference[]
  onOpenDetail: (title: string, resource: AnyResource) => void
}

export function DocumentsCard({ documents, onOpenDetail }: DocumentsCardProps) {
  const { t } = useTranslation()
  const [textModal, setTextModal] = useState<{ title: string; text: string } | null>(null)

  /** Handle click on the view icon — async-fetches FHIR Binaries, opens text in modal */
  const handleView = useCallback(async (doc: DocumentReference) => {
    const link = classifyDocLink(doc)
    if (!link) return
    const title = getDocTitle(doc)
    switch (link.kind) {
      case "external":
        window.open(link.url, "_blank", "noopener,noreferrer")
        break
      case "fhir-binary": {
        const blobUrl = await fetchBinaryUrl(link.relativeUrl)
        window.open(blobUrl, "_blank", "noopener,noreferrer")
        break
      }
      case "inline-text":
        setTextModal({ title, text: link.text })
        break
      case "inline-binary":
        window.open(link.dataUrl, "_blank", "noopener,noreferrer")
        break
    }
  }, [])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-sky-500" />
            {t("documents.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("documents.noDocuments")}</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc, i) => {
                const title = getDocTitle(doc)
                const date = getDocDate(doc)
                const contentType = getContentType(doc)
                const link = classifyDocLink(doc)
                const relatedCount = doc.context?.related?.length ?? 0
                return (
                  <li key={doc.id || i} className="text-sm">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <RecordName resource={doc as AnyResource} onOpen={onOpenDetail}>
                        {title}
                      </RecordName>
                      {doc.status && (
                        <Badge variant={STATUS_VARIANT[doc.status] ?? "outline"} className="text-xs">
                          {doc.status}
                        </Badge>
                      )}
                      {contentType && (
                        <span className="text-xs text-muted-foreground">
                          ({contentType.split("/").pop()})
                        </span>
                      )}
                      {relatedCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {t("documents.nResources", { n: relatedCount })}
                        </Badge>
                      )}
                      {link && (
                        <button
                          type="button"
                          className="inline-flex items-center text-primary hover:underline"
                          onClick={e => { e.stopPropagation(); handleView(doc) }}
                        >
                          <ExternalLink className="size-3" />
                        </button>
                      )}
                    </div>
                    {date && (
                      <span className="text-muted-foreground ml-2">
                        {format(new Date(date), "MMM d, yyyy")}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Text document modal */}
      <Dialog open={!!textModal} onOpenChange={open => { if (!open) setTextModal(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{textModal?.title}</DialogTitle>
          </DialogHeader>
          <pre className="flex-1 overflow-auto whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-md">
            {textModal?.text}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Cross-reference helper (used by RecordDetailModal) ───────────────────────

/** Find documents that reference a given resource via context.related */
export function findLinkedDocuments(
  documents: DocumentReference[],
  resourceType: string | undefined,
  resourceId: string | undefined,
): DocumentReference[] {
  if (!resourceType || !resourceId) return []
  const ref = `${resourceType}/${resourceId}`
  return documents.filter(doc =>
    doc.context?.related?.some(r => r.reference === ref),
  )
}
