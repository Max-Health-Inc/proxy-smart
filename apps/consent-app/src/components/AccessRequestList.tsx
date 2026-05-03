import type { Task } from "fhir/r4"
import type { TaskStatusCode } from "hl7.fhir.uv.smart-app-launch-generated/valuesets/ValueSet-TaskStatus"
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, CardAction } from "@max-health-inc/shared-ui"
import {
  getRequestResourceTypes,
  getRequestAction,
  getRequestPeriodStart,
  getRequestPeriodEnd,
} from "@/lib/task-builder"
import { format } from "date-fns"
import {
  ShieldCheck,
  Stethoscope,
  User,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  Send,
  Ban,
  FileText,
  Info,
  AppWindow,
} from "lucide-react"

interface AccessRequestListProps {
  requests: Task[]
  onApprove: (task: Task) => void
  onReject: (task: Task) => void
}

function getStatusBadge(status?: TaskStatusCode | string) {
  switch (status) {
    case "requested":
      return (
        <Badge variant="warning">
          <Send className="size-3" /> Pending
        </Badge>
      )
    case "ready":
      return (
        <Badge variant="warning">
          <FileText className="size-3" /> Action Required
        </Badge>
      )
    case "draft":
      return (
        <Badge variant="outline">
          <FileText className="size-3" /> Draft
        </Badge>
      )
    case "accepted":
      return (
        <Badge variant="success">
          <CheckCircle className="size-3" /> Approved
        </Badge>
      )
    case "rejected":
      return (
        <Badge variant="secondary">
          <XCircle className="size-3" /> Rejected
        </Badge>
      )
    case "cancelled":
      return (
        <Badge variant="outline">
          <Ban className="size-3" /> Cancelled
        </Badge>
      )
    case "completed":
      return (
        <Badge variant="success">
          <CheckCircle className="size-3" /> Completed
        </Badge>
      )
    default:
      return <Badge variant="outline">{status ?? "unknown"}</Badge>
  }
}

/** Determine the requester type from the Task references */
function getRequesterType(task: Task): "practitioner" | "app" | "unknown" {
  const ref = task.requester?.reference ?? ""
  if (ref.startsWith("Practitioner/")) return "practitioner"
  // If requester is a Patient/ or Device/ reference, this likely came from an app on their behalf
  if (ref.startsWith("Patient/") || ref.startsWith("Device/") || ref.startsWith("Organization/")) return "app"
  return "unknown"
}

/** Get a meaningful requester name, avoiding confusing "Patient" labels */
function getRequesterDisplay(task: Task): { name: string; source?: string } {
  const requesterRef = task.requester?.reference ?? ""
  const requesterDisplay = task.requester?.display ?? ""
  const ownerDisplay = task.owner?.display ?? ""
  const type = getRequesterType(task)

  // Best case: requester is a Practitioner with a display name
  if (type === "practitioner" && requesterDisplay) {
    return { name: requesterDisplay }
  }
  if (type === "practitioner" && requesterRef) {
    return { name: requesterRef.replace("Practitioner/", "Dr. ") }
  }

  // If the owner is a Practitioner (task was created by a practitioner app)
  const ownerRef = task.owner?.reference ?? ""
  if (ownerRef.startsWith("Practitioner/")) {
    return { name: ownerDisplay || ownerRef.replace("Practitioner/", "Dr. ") }
  }

  // Requester is a Patient or Device — this came from an app
  // Show the app/source info instead of the confusing "Patient ..." label
  const sourceApp = task.meta?.source
  if (sourceApp) {
    return { name: sourceApp, source: "via app" }
  }

  // For DTR tasks, try to get a meaningful name from the code
  const codeDisplay = task.code?.coding?.[0]?.display
  if (codeDisplay && codeDisplay !== "Access Request") {
    return { name: codeDisplay }
  }

  // If the display contains "via" (e.g. "Patient via Dora Health App"),
  // extract the app name as the meaningful part
  if (requesterDisplay.toLowerCase().includes("via ")) {
    const appName = requesterDisplay.split(/via\s+/i)[1]
    if (appName) return { name: appName.trim(), source: "via app" }
  }

  // Last resort: show the reference type cleanly
  if (requesterDisplay) return { name: requesterDisplay }
  if (requesterRef) return { name: requesterRef.replace(/\//g, " ") }

  return { name: "Unknown" }
}

/** Return a human-readable explanation of what the task is asking the patient to do */
function getTaskExplanation(task: Task): string | null {
  const isDTR = task.code?.coding?.some(c => c.code === "complete-questionnaire" || c.system?.includes("dtr"))
  const isAccessRequest = task.code?.coding?.some(c => c.code === "access-request")
  const type = getRequesterType(task)
  const fromApp = type === "app" || type === "unknown"

  if (isDTR || task.description?.toLowerCase().includes("questionnaire")) {
    return "You are being asked to complete a form. This may be required for prior authorization or documentation of a treatment."
  }
  if (isAccessRequest) {
    if (fromApp) {
      return "An application is requesting permission to access your health records on behalf of a care provider. Review the details and decide whether to approve."
    }
    return "A healthcare provider is requesting permission to view your health records. You can approve or reject this request."
  }
  if (task.status === "requested" || task.status === "ready") {
    return "A request has been made that requires your review and decision."
  }
  return null
}

function getPeriod(task: Task): string {
  const start = getRequestPeriodStart(task)
  const end = getRequestPeriodEnd(task)
  if (!start) return "No period set"
  const startFmt = format(new Date(start), "MMM d, yyyy")
  const endFmt = end ? format(new Date(end), "MMM d, yyyy") : "No expiry"
  return `${startFmt} — ${endFmt}`
}

function RequesterIcon({ type }: { type: "practitioner" | "app" | "unknown" }) {
  if (type === "practitioner") return <Stethoscope className="size-4 text-primary" />
  if (type === "app") return <AppWindow className="size-4 text-muted-foreground" />
  return <User className="size-4 text-muted-foreground" />
}

export function AccessRequestList({
  requests,
  onApprove,
  onReject,
}: AccessRequestListProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ShieldCheck className="size-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">No access requests</p>
        <p className="text-sm">
          When someone requests access to your data, it will appear here for your approval.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((task) => {
        const isActionable = task.status === "requested" || task.status === "ready"
        const resourceTypes = getRequestResourceTypes(task)
        const action = getRequestAction(task)
        const explanation = getTaskExplanation(task)
        const requesterType = getRequesterType(task)
        const requester = getRequesterDisplay(task)

        return (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RequesterIcon type={requesterType} />
                <span>
                  {requester.name}
                  {requester.source && (
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      ({requester.source})
                    </span>
                  )}
                </span>
              </CardTitle>
              <CardAction>{getStatusBadge(task.status)}</CardAction>
            </CardHeader>
            <CardContent>
              {/* Contextual explanation */}
              {explanation && (
                <div className="flex gap-2 items-start text-sm text-muted-foreground bg-muted/50 border border-border/50 p-3 mb-3">
                  <Info className="size-4 shrink-0 mt-0.5" />
                  <span>{explanation}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {getPeriod(task)}
                </span>
                <span className="flex items-center gap-1.5 capitalize">
                  <Eye className="size-3.5" />
                  {action}
                </span>
              </div>

              {/* Resource types */}
              {resourceTypes.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {resourceTypes.map((rt) => (
                    <Badge key={rt} variant="outline" className="text-xs">
                      {rt}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Reason */}
              {task.description && task.description !== "Request to access patient data" && (
                <p className="text-sm text-muted-foreground italic mb-3">
                  &ldquo;{task.description}&rdquo;
                </p>
              )}

              {/* Actions for pending/ready requests */}
              {isActionable && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => onApprove(task)}
                  >
                    <CheckCircle className="size-4" />
                    Grant Access
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onReject(task)}
                  >
                    <XCircle className="size-4" />
                    Deny
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
