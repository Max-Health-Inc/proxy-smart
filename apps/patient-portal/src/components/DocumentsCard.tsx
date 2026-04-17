import { Card, CardContent, CardHeader, CardTitle, Badge } from "@proxy-smart/shared-ui"
import { FileText, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import type { DocumentReference } from "@/lib/fhir-client"
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

/** Build a viewable data URL from inline base64 content */
function getViewUrl(doc: DocumentReference): string | undefined {
  const att = doc.content?.[0]?.attachment
  if (!att) return undefined
  if (att.url) return att.url
  if (att.data && att.contentType) return `data:${att.contentType};base64,${att.data}`
  return undefined
}

// ── Component ────────────────────────────────────────────────────────────────

interface DocumentsCardProps {
  documents: DocumentReference[]
  onOpenDetail: (title: string, resource: AnyResource) => void
}

export function DocumentsCard({ documents, onOpenDetail }: DocumentsCardProps) {
  const { t } = useTranslation()
  return (
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
              const viewUrl = getViewUrl(doc)
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
                    {viewUrl && (
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="size-3" />
                      </a>
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
