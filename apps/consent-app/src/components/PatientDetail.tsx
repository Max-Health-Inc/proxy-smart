import { useState } from "react"
import type { Patient, Consent, Task } from "fhir/r4"
import { Card, CardContent, CardHeader, CardTitle, CardAction, Badge, Button, Spinner } from "@max-health-inc/shared-ui"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@max-health-inc/shared-ui"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@max-health-inc/shared-ui"
import { formatHumanName } from "@/lib/fhir-client"
import { useConsents } from "@/hooks/useConsents"
import { useAccessRequests } from "@/hooks/useAccessRequests"
import { ConsentList } from "@/components/ConsentList"
import { ConsentDetail } from "@/components/ConsentDetail"
import { ConsentBuilder } from "@/components/ConsentBuilder"
import { ConsentStats } from "@/components/ConsentStats"
import { ConsentFilters } from "@/components/ConsentFilters"
import { AuditTimeline } from "@/components/AuditTimeline"
import { AccessRequestList } from "@/components/AccessRequestList"
import { usePractitionerNames } from "@/hooks/usePractitionerNames"
import {
  ArrowLeft,
  User,
  Calendar,
  Hash,
  PlusCircle,
  ShieldCheck,
  Send,
} from "lucide-react"

interface PatientDetailProps {
  patient: Patient
  personReference: string
  onBack: () => void
  hideBack?: boolean
}

export function PatientDetail({ patient, personReference, onBack, hideBack }: PatientDetailProps) {
  const [view, setView] = useState<"list" | "detail" | "create">("list")
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<Consent | null>(null)
  const [approveTarget, setApproveTarget] = useState<Task | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Task | null>(null)
  const {
    consents,
    allConsents,
    loading,
    error,
    stats,
    statusFilter,
    setStatusFilter,
    sortKey,
    setSortKey,
    searchTerm,
    setSearchTerm,
    createNewConsent,
    revoke,
  } = useConsents(patient.id ?? null)
  const {
    requests,
    loading: requestsLoading,
    stats: requestStats,
    approveRequest,
    rejectRequest,
  } = useAccessRequests(patient.id ? { by: "patient", patientId: patient.id } : null)
  const { getActorName } = usePractitionerNames(allConsents)

  const name = formatHumanName(patient.name)
  const mrn = patient.identifier?.[0]?.value

  const confirmRevoke = async () => {
    if (!revokeTarget) return
    await revoke(revokeTarget)
    setRevokeTarget(null)
    if (view === "detail") setView("list")
  }

  const confirmApprove = async () => {
    if (!approveTarget) return
    await approveRequest(approveTarget, personReference)
    setApproveTarget(null)
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    await rejectRequest(rejectTarget)
    setRejectTarget(null)
  }

  const handleCreate = async (consent: Consent) => {
    await createNewConsent(consent)
    setView("list")
  }

  if (view === "detail" && selectedConsent) {
    return (
      <ConsentDetail
        consent={selectedConsent}
        onBack={() => {
          setSelectedConsent(null)
          setView("list")
        }}
        onRevoke={setRevokeTarget}
      />
    )
  }

  if (view === "create") {
    return (
      <ConsentBuilder
        patientId={patient.id!}
        patientDisplay={name}
        personReference={personReference}
        onSubmit={handleCreate}
        onCancel={() => setView("list")}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!hideBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="size-5" />
            </Button>
          )}
          <h2 className="text-xl font-semibold">{name}</h2>
        </div>
        <Button onClick={() => setView("create")}>
          <PlusCircle className="size-4" />
          New Consent
        </Button>
      </div>

      {/* Patient info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Patient Information
          </CardTitle>
          <CardAction>
            <Badge variant="success">
              <ShieldCheck className="size-3" /> {stats.active} active consent{stats.active !== 1 ? "s" : ""}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {patient.birthDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                Born {patient.birthDate}
              </span>
            )}
            {mrn && (
              <span className="flex items-center gap-1.5">
                <Hash className="size-3.5" />
                MRN: {mrn}
              </span>
            )}
            {patient.gender && (
              <span className="capitalize">{patient.gender}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <ConsentStats
        total={stats.total}
        active={stats.active}
        revoked={stats.revoked}
        expiringSoon={stats.expiringSoon}
      />

      {/* Tabs: Consents | Access Requests | Audit Trail */}
      <Tabs defaultValue="consents">
        <TabsList>
          <TabsTrigger value="consents">Consents</TabsTrigger>
          <TabsTrigger value="requests">
            <Send className="size-3.5" />
            Requests
            {requestStats.pending > 0 && (
              <Badge variant="warning" className="ml-1 text-xs px-1.5 py-0">
                {requestStats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="consents" className="space-y-4 mt-4">
          {/* Filters */}
          <ConsentFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            sortKey={sortKey}
            onSortChange={setSortKey}
            resultCount={consents.length}
          />

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-8 text-center text-destructive">
                {error}
              </CardContent>
            </Card>
          ) : (
            <ConsentList
              consents={consents}
              onRevoke={setRevokeTarget}
              onView={(consent) => {
                setSelectedConsent(consent)
                setView("detail")
              }}
              getActorName={getActorName}
            />
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          {requestsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <AccessRequestList
              requests={requests}
              onApprove={setApproveTarget}
              onReject={setRejectTarget}
            />
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditTimeline consents={allConsents} patientId={patient.id} />
        </TabsContent>
      </Tabs>

      {/* Revoke confirmation dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Consent</DialogTitle>
            <DialogDescription>
              This will revoke access for{" "}
              <strong>
                {revokeTarget?.provision?.actor?.[0]?.reference?.display ?? "this practitioner"}
              </strong>
              . They will no longer be able to access this patient&apos;s data. This action can be undone by creating a new consent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRevoke}>
              Revoke Consent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve request confirmation dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Access Request</DialogTitle>
            <DialogDescription>
              This will grant{" "}
              <strong>
                {approveTarget?.requester?.display ?? "this practitioner"}
              </strong>{" "}
              access to your data. A consent record will be created automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmApprove}>
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject request confirmation dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Access Request</DialogTitle>
            <DialogDescription>
              This will reject the access request from{" "}
              <strong>
                {rejectTarget?.requester?.display ?? "this practitioner"}
              </strong>
              . They will not be granted access to your data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
