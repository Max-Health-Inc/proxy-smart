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
    default:
      return <Badge variant="outline">{status ?? "unknown"}</Badge>
  }
}

function getRequesterDisplay(task: Task): string {
  return task.requester?.display ?? task.requester?.reference ?? "Unknown practitioner"
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
        const isPending = task.status === "requested"
        const resourceTypes = getRequestResourceTypes(task)
        const action = getRequestAction(task)

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
              <div className="flex flex-wrap gap-1 mb-3">
                {resourceTypes.map((rt) => (
                  <Badge key={rt} variant="outline" className="text-xs">
                    {rt}
                  </Badge>
                ))}
              </div>

              {/* Reason */}
              {task.description && task.description !== "Request to access patient data" && (
                <p className="text-sm text-muted-foreground italic mb-3">
                  &ldquo;{task.description}&rdquo;
                </p>
              )}

              {/* Actions for pending requests */}
              {isPending && (
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
