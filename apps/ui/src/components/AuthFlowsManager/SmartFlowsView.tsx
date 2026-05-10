import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { PageLoadingState } from '@/components/ui/page-loading-state'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@proxy-smart/shared-ui'
import {
  ChevronDown,
  ChevronRight,
  Monitor,
  RefreshCw,
  Server,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SmartFlowCard } from '@/lib/api-client'

// ── Flow type icons & colors ─────────────────────────────────────────────────

const FLOW_CONFIG: Record<string, {
  icon: LucideIcon
  gradient: string
  badgeVariant: 'default' | 'secondary' | 'outline'
}> = {
  'ehr-launch': { icon: Monitor, gradient: 'from-blue-500/10 to-blue-600/5', badgeVariant: 'default' },
  'standalone-launch': { icon: Users, gradient: 'from-emerald-500/10 to-emerald-600/5', badgeVariant: 'secondary' },
  'backend-services': { icon: Server, gradient: 'from-purple-500/10 to-purple-600/5', badgeVariant: 'outline' },
}

// ── Component ────────────────────────────────────────────────────────────────

export function SmartFlowsView() {
  const { t } = useTranslation()
  const { isAuthenticated, clientApis } = useAuth()
  const { notify } = useNotificationStore()

  const [cards, setCards] = useState<SmartFlowCard[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isAuthenticated || !clientApis.authFlows) return
    clientApis.authFlows.getAdminAuthFlowsSmartFlowMapping()
      .then(data => setCards(data))
      .catch(error => {
        console.error('Failed to load SMART flow mapping:', error)
        notify({ type: 'error', message: t('Failed to load SMART flow mapping') })
      })
      .finally(() => setLoading(false))
  }, [isAuthenticated, clientApis.authFlows, notify, t])

  const refresh = async () => {
    if (!clientApis.authFlows) return
    setLoading(true)
    try {
      const data = await clientApis.authFlows.getAdminAuthFlowsSmartFlowMapping()
      setCards(data)
    } catch (error) {
      console.error('Failed to refresh:', error)
      notify({ type: 'error', message: t('Failed to refresh SMART flow mapping') })
    } finally {
      setLoading(false)
    }
  }

  const toggleCard = (flowType: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(flowType)) next.delete(flowType)
      else next.add(flowType)
      return next
    })
  }

  if (loading) return <PageLoadingState message={t('Loading SMART flow mapping...')} />

  return (
    <div className="max-w-4xl mx-auto space-y-5 px-2 sm:px-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('How SMART on FHIR launch flows map to Keycloak authentication flows and which clients use each flow type.')}
        </p>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {cards.map(card => {
        const config = FLOW_CONFIG[card.flowType] ?? FLOW_CONFIG['ehr-launch']!
        const Icon = config.icon
        const isExpanded = expandedCards.has(card.flowType)

        return (
          <Card key={card.flowType} className={`bg-gradient-to-br ${config.gradient} overflow-hidden`}>
            {/* Card Header — clickable to expand */}
            <CardHeader
              className="cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() => toggleCard(card.flowType)}
            >
              <div className="flex items-center gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-background/80 flex items-center justify-center border">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <Badge variant={config.badgeVariant}>{card.oauthGrant}</Badge>
                    <Badge variant="outline">{card.clients.length} {t('clients')}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{card.description}</p>
                </div>
                <div className="shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Expanded Detail */}
            {isExpanded && (
              <CardContent className="space-y-4 border-t border-border/40">
                {/* Flow Steps */}
                <div>
                  <h4 className="text-sm font-medium mb-3">{t('Flow Steps')}</h4>
                  <div className="flex items-start gap-0">
                    {card.steps.map((step, i) => (
                      <div key={step.label} className="flex items-start">
                        <div className="flex flex-col items-center text-center min-w-[120px] max-w-[160px]">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                              step.kcFlow
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-muted-foreground/30 bg-muted/50 text-muted-foreground'
                            }`}
                          >
                            {i + 1}
                          </div>
                          <span className="text-xs font-medium mt-1.5">{step.label}</span>
                          {step.kcFlow && (
                            <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0">
                              {step.kcFlow}
                            </Badge>
                          )}
                          {step.description && (
                            <p className="text-[10px] text-muted-foreground mt-1 leading-tight px-1">
                              {step.description}
                            </p>
                          )}
                        </div>
                        {i < card.steps.length - 1 && (
                          <div className="flex items-center mt-3.5">
                            <div className="w-6 h-px bg-border" />
                            <ChevronRight className="w-3 h-3 text-muted-foreground -ml-0.5" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* KC Flows Involved */}
                <div>
                  <h4 className="text-sm font-medium mb-2">{t('Keycloak Flows')}</h4>
                  <div className="flex gap-2">
                    {card.kcFlows.map(flow => (
                      <Badge key={flow} variant="secondary" className="text-xs">
                        {flow}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Clients */}
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    {t('Clients')} ({card.clients.length})
                  </h4>
                  {card.clients.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('No clients configured for this flow type')}</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {card.clients.map(client => (
                        <Card key={client.clientId} className="bg-background/60">
                          <CardContent className="flex items-center gap-2 p-3">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${client.enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium truncate block">
                                {client.name || client.clientId}
                              </span>
                              {client.name && (
                                <span className="text-[10px] text-muted-foreground truncate block">
                                  {client.clientId}
                                </span>
                              )}
                            </div>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {client.publicClient ? 'public' : (client.tokenEndpointAuthMethod ?? 'confidential')}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      {cards.length === 0 && (
        <p className="text-muted-foreground text-center py-8">{t('No SMART flow data available')}</p>
      )}
    </div>
  )
}
