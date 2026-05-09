import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { PageLoadingState } from '@/components/ui/page-loading-state'
import {
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@proxy-smart/shared-ui'
import {
  Workflow,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'
import type {
  AuthFlow,
  AuthFlowExecution,
  AuthenticatorProvider,
} from '@/lib/api-client'

// ── Types ────────────────────────────────────────────────────────────────────

interface FlowWithExecutions extends AuthFlow {
  executions?: AuthFlowExecution[]
  expanded?: boolean
}

// ── Requirement badge colors ─────────────────────────────────────────────────

const requirementVariant = (req?: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
  switch (req) {
    case 'REQUIRED': return 'default'
    case 'ALTERNATIVE': return 'secondary'
    case 'DISABLED': return 'outline'
    case 'CONDITIONAL': return 'destructive'
    default: return 'outline'
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function AuthFlowsManager() {
  const { t } = useTranslation()
  const { isAuthenticated, clientApis } = useAuth()
  const { notify } = useNotificationStore()

  const [flows, setFlows] = useState<FlowWithExecutions[]>([])
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<AuthenticatorProvider[]>([])
  const [selectedFlow, setSelectedFlow] = useState<FlowWithExecutions | null>(null)
  const [executions, setExecutions] = useState<AuthFlowExecution[]>([])
  const [showAddExecution, setShowAddExecution] = useState(false)
  const [addingProvider, setAddingProvider] = useState<string>('')

  // ── Data fetching ────────────────────────────────────────────────────────

  const refreshFlows = useCallback(async () => {
    if (!isAuthenticated || !clientApis.authFlows) return
    try {
      const data = await clientApis.authFlows.getAdminAuthFlows()
      setFlows(data.map(f => ({ ...f, expanded: false })))
    } catch (error) {
      console.error('Failed to load auth flows:', error)
      notify({ type: 'error', message: t('Failed to load authentication flows') })
    }
  }, [isAuthenticated, clientApis.authFlows, notify, t])

  const loadExecutions = useCallback(async (flowAlias: string) => {
    if (!clientApis.authFlows || !flowAlias) return
    try {
      const data = await clientApis.authFlows.getAdminAuthFlowsByFlowAliasExecutions({ flowAlias })
      setExecutions(data)
    } catch (error) {
      console.error('Failed to load executions:', error)
      notify({ type: 'error', message: t('Failed to load flow executions') })
    }
  }, [clientApis.authFlows, notify, t])

  useEffect(() => {
    if (!isAuthenticated || !clientApis.authFlows) return
    Promise.all([
      clientApis.authFlows.getAdminAuthFlows()
        .then(data => setFlows(data.map(f => ({ ...f, expanded: false }))))
        .catch(error => console.error('Failed to load auth flows:', error)),
      clientApis.authFlows.getAdminAuthFlowsClientAuthenticators()
        .then(data => setProviders(data))
        .catch(error => console.error('Failed to load providers:', error)),
    ]).finally(() => setLoading(false))
  }, [isAuthenticated, clientApis.authFlows])

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSelectFlow = (flow: FlowWithExecutions) => {
    setSelectedFlow(flow)
    setShowAddExecution(false)
    if (flow.alias) loadExecutions(flow.alias)
  }

  const handleAddExecution = async () => {
    if (!selectedFlow?.alias || !addingProvider) return
    try {
      await clientApis.authFlows.postAdminAuthFlowsByFlowAliasExecutions({
        flowAlias: selectedFlow.alias,
        addExecutionRequest: { provider: addingProvider },
      })
      notify({ type: 'success', message: t('Execution added successfully') })
      setShowAddExecution(false)
      setAddingProvider('')
      await loadExecutions(selectedFlow.alias)
    } catch (error) {
      console.error('Failed to add execution:', error)
      notify({ type: 'error', message: t('Failed to add execution') })
    }
  }

  const handleUpdateRequirement = async (executionId: string, requirement: string) => {
    if (!selectedFlow?.alias) return
    try {
      await clientApis.authFlows.putAdminAuthFlowsByFlowAliasExecutions({
        flowAlias: selectedFlow.alias,
        updateExecutionRequest: { id: executionId, requirement },
      })
      notify({ type: 'success', message: t('Execution updated') })
      await loadExecutions(selectedFlow.alias)
    } catch (error) {
      console.error('Failed to update execution:', error)
      notify({ type: 'error', message: t('Failed to update execution requirement') })
    }
  }

  const handleDeleteExecution = async (executionId: string) => {
    if (!selectedFlow?.alias) return
    try {
      await clientApis.authFlows.deleteAdminAuthFlowsExecutionsByExecutionId({ executionId })
      notify({ type: 'success', message: t('Execution deleted') })
      await loadExecutions(selectedFlow.alias)
    } catch (error) {
      console.error('Failed to delete execution:', error)
      notify({ type: 'error', message: t('Failed to delete execution') })
    }
  }

  const handleRaisePriority = async (executionId: string) => {
    if (!selectedFlow?.alias) return
    try {
      await clientApis.authFlows.postAdminAuthFlowsExecutionsByExecutionIdRaisePriority({ executionId })
      await loadExecutions(selectedFlow.alias)
    } catch (error) {
      console.error('Failed to raise priority:', error)
      notify({ type: 'error', message: t('Failed to reorder execution') })
    }
  }

  const handleLowerPriority = async (executionId: string) => {
    if (!selectedFlow?.alias) return
    try {
      await clientApis.authFlows.postAdminAuthFlowsExecutionsByExecutionIdLowerPriority({ executionId })
      await loadExecutions(selectedFlow.alias)
    } catch (error) {
      console.error('Failed to lower priority:', error)
      notify({ type: 'error', message: t('Failed to reorder execution') })
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <PageLoadingState message={t('Loading authentication flows...')} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedFlow && (
            <Button variant="ghost" size="sm" onClick={() => { setSelectedFlow(null); setExecutions([]) }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Workflow className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">
              {selectedFlow ? selectedFlow.alias : t('Authentication Flows')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedFlow
                ? t('Manage authenticator executions for this flow')
                : t('Configure how clients and users authenticate')
              }
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedFlow && (
            <Button variant="outline" size="sm" onClick={() => setShowAddExecution(!showAddExecution)}>
              <Plus className="w-4 h-4 mr-1" />
              {t('Add Execution')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => {
            if (selectedFlow?.alias) loadExecutions(selectedFlow.alias)
            else refreshFlows()
          }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Add Execution Panel */}
      {showAddExecution && selectedFlow && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <p className="text-sm font-medium">{t('Select authenticator provider')}</p>
          <div className="flex gap-2 flex-wrap">
            {providers.map(p => (
              <Button
                key={p.id}
                variant={addingProvider === p.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAddingProvider(p.id ?? '')}
              >
                {p.displayName || p.id}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={!addingProvider} onClick={handleAddExecution}>
              {t('Add')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowAddExecution(false); setAddingProvider('') }}>
              {t('Cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Flow List or Execution Detail */}
      {!selectedFlow ? (
        <FlowList flows={flows} onSelect={handleSelectFlow} />
      ) : (
        <ExecutionTable
          executions={executions}
          onUpdateRequirement={handleUpdateRequirement}
          onDelete={handleDeleteExecution}
          onRaisePriority={handleRaisePriority}
          onLowerPriority={handleLowerPriority}
        />
      )}
    </div>
  )
}

// ── Flow List Sub-Component ──────────────────────────────────────────────────

function FlowList({ flows, onSelect }: {
  flows: FlowWithExecutions[]
  onSelect: (flow: FlowWithExecutions) => void
}) {
  const { t } = useTranslation()

  if (flows.length === 0) {
    return <p className="text-muted-foreground text-center py-8">{t('No authentication flows found')}</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('Flow')}</TableHead>
          <TableHead>{t('Provider')}</TableHead>
          <TableHead>{t('Type')}</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {flows.map(flow => (
          <TableRow
            key={flow.id ?? flow.alias}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSelect(flow)}
          >
            <TableCell>
              <div>
                <span className="font-medium">{flow.alias}</span>
                {flow.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{flow.description}</p>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{flow.providerId}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {flow.builtIn && <Badge variant="secondary">{t('Built-in')}</Badge>}
                {flow.topLevel && <Badge variant="outline">{t('Top-level')}</Badge>}
              </div>
            </TableCell>
            <TableCell>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ── Execution Table Sub-Component ────────────────────────────────────────────

function ExecutionTable({ executions, onUpdateRequirement, onDelete, onRaisePriority, onLowerPriority }: {
  executions: AuthFlowExecution[]
  onUpdateRequirement: (id: string, requirement: string) => void
  onDelete: (id: string) => void
  onRaisePriority: (id: string) => void
  onLowerPriority: (id: string) => void
}) {
  const { t } = useTranslation()

  if (executions.length === 0) {
    return <p className="text-muted-foreground text-center py-8">{t('No executions in this flow')}</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('Authenticator')}</TableHead>
          <TableHead>{t('Requirement')}</TableHead>
          <TableHead>{t('Type')}</TableHead>
          <TableHead className="text-right">{t('Actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {executions.map((exec, index) => (
          <TableRow key={exec.id ?? index}>
            <TableCell>
              <div className="flex items-center gap-2" style={{ paddingLeft: `${(exec.level ?? 0) * 20}px` }}>
                {exec.authenticationFlow ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <div className="w-4 h-4" />
                )}
                <div>
                  <span className="font-medium">{exec.displayName || exec.providerId || exec.alias}</span>
                  {exec.alias && exec.displayName && (
                    <p className="text-xs text-muted-foreground">{exec.alias}</p>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              {exec.requirement && (
                <Badge variant={requirementVariant(exec.requirement)}>
                  {exec.requirement}
                </Badge>
              )}
            </TableCell>
            <TableCell>
              {exec.authenticationFlow ? (
                <Badge variant="outline">{t('Sub-flow')}</Badge>
              ) : (
                <Badge variant="secondary">{exec.providerId}</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {exec.requirementChoices?.map(choice => (
                    <DropdownMenuItem
                      key={choice}
                      disabled={exec.requirement === choice}
                      onClick={() => exec.id && onUpdateRequirement(exec.id, choice)}
                    >
                      {t('Set')} {choice}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => exec.id && onRaisePriority(exec.id)}>
                    <ArrowUp className="w-4 h-4 mr-2" />
                    {t('Move Up')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exec.id && onLowerPriority(exec.id)}>
                    <ArrowDown className="w-4 h-4 mr-2" />
                    {t('Move Down')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => exec.id && onDelete(exec.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('Delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
