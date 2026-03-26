import { useState } from "react"
import type { Practitioner, Task } from "fhir/r4"
import { Card, CardContent, CardHeader, CardTitle, CardAction, Badge, Button, Spinner } from "@proxy-smart/shared-ui"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@proxy-smart/shared-ui"
import { AccessRequestForm } from "@/components/AccessRequestForm"
import { formatHumanName } from "@/lib/fhir-client"
import { useAccessRequests } from "@/hooks/useAccessRequests"
import {
  getRequestResourceTypes,
  getRequestPeriodStart,
  getRequestPeriodEnd,
} from "@/lib/task-builder"
import { format } from "date-fns"
import {
  User,
  Stethoscope,
  PlusCircle,
  Send,
  CheckCircle,
  XCircle,
  Ban,
  Clock,
} from "lucide-react"

interface PractitionerDashboardProps {
  practitioner: Practitioner
}

function getStatusBadge(status?: string) {
  switch (status) {
    case "requested":
      return <Badge variant="warning"><Send className="size-3" /> Pending</Badge>
    case "accepted":
      return <Badge variant="success"><CheckCircle className="size-3" /> Approved</Badge>
    case "rejected":
      return <Badge variant="secondary"><XCircle className="size-3" /> Rejected</Badge>
    case "cancelled":
      return <Badge variant="outline"><Ban className="size-3" /> Cancelled</Badge>
    default:
      return <Badge variant="outline">{status ?? "unknown"}</Badge>
  }
}

export function PractitionerDashboard({ practitioner }: PractitionerDashboardProps) {
  const [view, setView] = useState<"list" | "create">("list")
  const practitionerRef = `Practitioner/${practitioner.id}`
  const practitionerName = formatHumanName(practitioner.name)

  const {
    requests,
    loading,
    stats,
    createRequest,
    cancelRequest,
  } = useAccessRequests({ by: "requester", practitionerRef })

  const handleCreate = async (task: Task) => {
    await createRequest(task)
    setView("list")
  }

  if (view === "create") {
    return (
      <AccessRequestForm
        practitionerId={practitioner.id!}
        practitionerDisplay={practitionerName}
        onSubmit={handleCreate}
        onCancel={() => setView("list")}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Identity card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="size-5" />
            {practitionerName}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">Practitioner</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {practitioner.identifier?.[0]?.value && (
              <span>ID: {practitioner.identifier[0].value}</span>
            )}
            {practitioner.qualification?.map((q, i) => (
              <span key={i}>{q.code?.text ?? q.code?.coding?.[0]?.display}</span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Action + list */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Access Requests</h2>
        <Button onClick={() => setView("create")}>
          <PlusCircle className="size-4" />
          New Request
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">
            Pending{stats.pending > 0 && ` (${stats.pending})`}
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        {(["all", "pending", "resolved"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <RequestCards
                requests={requests.filter((r) =>
                  tab === "pending"
                    ? r.status === "requested"
                    : tab === "resolved"
                      ? r.status !== "requested"
                      : true,
                )}
                onCancel={cancelRequest}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function RequestCards({
  requests,
  onCancel,
}: {
  requests: Task[]
  onCancel: (task: Task) => Promise<void>
}) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Send className="size-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">No requests</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((task) => {
        const resourceTypes = getRequestResourceTypes(task)
        const start = getRequestPeriodStart(task)
        const end = getRequestPeriodEnd(task)
        const period = start
          ? `${format(new Date(start), "MMM d, yyyy")} — ${end ? format(new Date(end), "MMM d, yyyy") : "No expiry"}`
          : "No period"

        return (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4" />
                {task.for?.display ?? task.for?.reference ?? "Unknown patient"}
              </CardTitle>
              <CardAction>{getStatusBadge(task.status)}</CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mb-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {period}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {resourceTypes.map((rt) => (
                  <Badge key={rt} variant="outline" className="text-xs">{rt}</Badge>
                ))}
              </div>
              {task.description && task.description !== "Request to access patient data" && (
                <p className="text-sm text-muted-foreground italic">
                  &ldquo;{task.description}&rdquo;
                </p>
              )}
              {task.status === "requested" && (
                <div className="pt-2 border-t mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCancel(task)}
                  >
                    <Ban className="size-4" />
                    Cancel Request
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
