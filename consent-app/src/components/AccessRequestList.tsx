import type { Task } from "fhir/r4"
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, CardAction } from "@proxy-smart/shared-ui"
import {
  getRequestResourceTypes,
  getRequestAction,
  getRequestPeriodStart,
  getRequestPeriodEnd,
} from "@/lib/task-builder"
import { format } from "date-fns"
import {
  ShieldCheck,
  ShieldOff,
  User,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  Send,
  Ban,
  FileText,
  Info,
} from "lucide-react"

interface AccessRequestListProps {
  requests: Task[]
  onApprove: (task: Task) => void
  onReject: (task: Task) => void
}

function getStatusBadge(status?: string) {
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

function getRequesterDisplay(task: Task): string {
  // Try requester first, then owner, then code display
  if (task.requester?.display) return task.requester.display
  if (task.owner?.display) return task.owner.display
  // For DTR tasks, try to get a meaningful name from the code
  const codeDisplay = task.code?.coding?.[0]?.display
  if (codeDisplay && codeDisplay !== "Access Request") return codeDisplay
  if (task.requester?.reference) {
    // Extract readable reference like "Practitioner/123" → "Practitioner 123"
    return task.requester.reference.replace(/\//g, " ")
  }
  return "Unknown requester"
}

/** Return a human-readable explanation of what the task is asking the patient to do */
function getTaskExplanation(task: Task): string | null {
  const isDTR = task.code?.coding?.some(c => c.code === "complete-questionnaire" || c.system?.includes("dtr"))
  const isAccessRequest = task.code?.coding?.some(c => c.code === "access-request")

  if (isDTR || task.description?.toLowerCase().includes("questionnaire")) {
    return "A healthcare provider is asking you to complete a form. This may be required for prior authorization or documentation of a treatment."
  }
  if (isAccessRequest) {
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
          When a practitioner requests access to your data, it will appear here.
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

        return (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4" />
                {getRequesterDisplay(task)}
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
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onReject(task)}
                  >
                    <XCircle className="size-4" />
                    Reject
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
