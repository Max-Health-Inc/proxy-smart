import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { PageLoadingState } from '@/components/ui/page-loading-state'
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsTrigger,
  ResponsiveTabsList,
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
  Monitor,
  Users,
  Server,
} from 'lucide-react'
import type {
  AuthFlow,
  AuthFlowExecution,
  AuthenticatorProvider,
  SmartFlowCard,
} from '@/lib/api-client'
import { SmartFlowsView } from './SmartFlowsView'

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
  const [smartCards, setSmartCards] = useState<SmartFlowCard[]>([])
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<AuthenticatorProvider[]>([])
  const [selectedFlow, setSelectedFlow] = useState<FlowWithExecutions | null>(null)
  const [executions, setExecutions] = useState<AuthFlowExecution[]>([])
  const [showAddExecution, setShowAddExecution] = useState(false)
  const [addingProvider, setAddingProvider] = useState<string>('')
  const [activeTab, setActiveTab] = useState('smart')

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
      clientApis.authFlows.getAdminAuthFlowsSmartFlowMapping()
        .then(data => setSmartCards(data))
        .catch(error => console.error('Failed to load SMART flow cards:', error)),
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

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getFlowClientCount = (flowType: string) =>
    smartCards.find(c => c.flowType === flowType)?.clients.length ?? 0

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'smart') {
      setSelectedFlow(null)
      setExecutions([])
    }
  }

  const handleRefresh = () => {
    if (activeTab === 'keycloak') {
      if (selectedFlow?.alias) loadExecutions(selectedFlow.alias)
      else refreshFlows()
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <PageLoadingState message={t('Loading authentication flows...')} />

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
      {/* Enhanced Header */}
      <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
              {activeTab === 'keycloak' && selectedFlow
                ? selectedFlow.alias
                : t('Authentication Flows')
              }
            </h1>
            <div className="text-muted-foreground text-lg flex items-center">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Workflow className="w-5 h-5 text-primary" />
              </div>
              {activeTab === 'keycloak' && selectedFlow
                ? t('Manage authenticator executions for this flow')
                : t('SMART on FHIR flow types and Keycloak authentication flows')
              }
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTab === 'keycloak' && selectedFlow && (
              <>
                <Button variant="outline" onClick={() => { setSelectedFlow(null); setExecutions([]) }}>
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  {t('Back')}
                </Button>
                <Button onClick={() => setShowAddExecution(!showAddExecution)}>
                  <Plus className="w-5 h-5 mr-2" />
                  {t('Add Execution')}
                </Button>
              </>
            )}
            {activeTab === 'keycloak' && (
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-5 h-5 mr-2" />
                {t('Refresh')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Monitor} label={t('EHR Launch Clients')} value={getFlowClientCount('ehr-launch')} color="primary" />
        <StatCard icon={Users} label={t('Standalone Launch Clients')} value={getFlowClientCount('standalone-launch')} color="emerald" />
        <StatCard icon={Server} label={t('Backend Service Clients')} value={getFlowClientCount('backend-services')} color="purple" />
      </div>

      {/* Main Content */}
      <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <ResponsiveTabsList columns={2}>
            <TabsTrigger value="smart" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
              {t('SMART Flows')}
            </TabsTrigger>
            <TabsTrigger value="keycloak" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground">
              {t('KC Flows')}
            </TabsTrigger>
          </ResponsiveTabsList>

          <TabsContent value="smart" className="p-6 space-y-6">
            <SmartFlowsView />
          </TabsContent>

          <TabsContent value="keycloak" className="p-6 space-y-6">
            {/* Add Execution Panel */}
            {showAddExecution && selectedFlow && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-sm">{t('Select authenticator provider')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                </CardContent>
              </Card>
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
          </TabsContent>
        </Tabs>
      </div>
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
