import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Shield, 
  AlertCircle,
  Server,
  Users,
  Globe,
  CheckCircle,
  Cpu
} from 'lucide-react';
import { useFhirServers } from '@/stores/smartStore';
import { useAuth } from '@/stores/authStore';
import type { ScopeSet, SmartAppFormData } from '@/lib/types/api';
import type { GetAdminMcpServers200ResponseServersInner } from '@/lib/api-client';

type SmartAppType = 'backend-service' | 'standalone-app' | 'ehr-launch' | 'agent';
type AuthenticationType = 'asymmetric' | 'symmetric' | 'none';
type ServerAccessType = 'all-servers' | 'selected-servers' | 'user-person-servers';
type McpAccessType = 'none' | 'all-mcp-servers' | 'selected-mcp-servers';

interface SmartAppAddFormProps {
  open: boolean;
  onClose: () => void;
  onAddApp: (app: SmartAppFormData) => void;
  scopeSets: ScopeSet[];
}

export function SmartAppAddForm({ open, onClose, onAddApp, scopeSets }: SmartAppAddFormProps) {
  const { servers, loading: serversLoading } = useFhirServers();
  const { clientApis } = useAuth();
  
  // MCP servers state
  const [mcpServers, setMcpServers] = useState<GetAdminMcpServers200ResponseServersInner[]>([]);
  const [mcpServersLoading, setMcpServersLoading] = useState(false);

  // Fetch MCP servers when form opens
  const fetchMcpServers = useCallback(async () => {
    if (!clientApis?.mcpManagement) return;
    setMcpServersLoading(true);
    try {
      const response = await clientApis.mcpManagement.getAdminMcpServers();
      setMcpServers(response.servers || []);
    } catch (err) {
      console.error('Failed to fetch MCP servers:', err);
    } finally {
      setMcpServersLoading(false);
    }
  }, [clientApis]);

  useEffect(() => {
    if (open) {
      fetchMcpServers();
    }
  }, [open, fetchMcpServers]);
  
  const [newApp, setNewApp] = useState<SmartAppFormData>({
    name: '',
    clientId: '',
    launchUrl: '',
    redirectUris: [], // Changed to array for API compatibility
    description: '',
    defaultClientScopes: [],
    scopeSetId: '',
    optionalClientScopes: [],
    appType: 'standalone-app',
    authenticationType: 'symmetric', // UI-only field - not sent to backend
    serverAccessType: 'all-servers',
    allowedServerIds: [],
    mcpAccessType: 'none', // MCP server access control
    allowedMcpServerNames: [],
    publicClient: false,
    webOrigins: [],
    smartVersion: '2.0.0',
    fhirVersion: 'R4',
    systemScopes: []
  });

  // Helper functions
  const isInteractive = (appType: SmartAppType | undefined): boolean => {
    if (!appType) return false;
    return appType === 'standalone-app' || appType === 'ehr-launch';
  };

  const requiresRedirectUri = (appType: SmartAppType | undefined): boolean => {
    return isInteractive(appType);
  };

  const hasFixedAuthType = (appType: SmartAppType | undefined): boolean => {
    if (!appType) return false;
    return appType === 'backend-service' || appType === 'agent';
  };

  const getFixedAuthType = (appType: SmartAppType | undefined): AuthenticationType => {
    if (appType === 'backend-service' || appType === 'agent') {
      return 'asymmetric';
    }
    return 'asymmetric';
  };

  const getAuthTypeDescription = (appType: SmartAppType | undefined): string => {
    if (appType === 'agent') {
      return 'Agents require private key JWT for secure autonomous authentication';
    }
    if (appType === 'backend-service') {
      return 'Backend services require private key JWT for secure server-to-server communication';
    }
    return '';
  };

  const getRedirectUriHelperText = (appType: SmartAppType | undefined): string => {
    if (appType === 'backend-service') {
      return 'Backend services use client credentials flow - no redirect URI needed';
    }
    if (appType === 'agent') {
      return 'Agents use client credentials flow - no interactive login or redirect URI needed';
    }
    return '';
  };

  const isAgent = (appType: SmartAppType | undefined): boolean => {
    return appType === 'agent';
  };

  const getServerAccessTypeDescription = (serverAccessType: ServerAccessType): string => {
    switch (serverAccessType) {
      case 'all-servers':
        return 'App can access all FHIR servers behind the Proxy';
      case 'selected-servers':
        return 'App is restricted to specific FHIR servers only';
      case 'user-person-servers':
        return 'App can only access servers where the user has associated Person records (not available for backend services)';
      default:
        return '';
    }
  };

  const getMcpAccessTypeDescription = (mcpAccessType: McpAccessType): string => {
    switch (mcpAccessType) {
      case 'none':
        return 'App has no access to MCP servers (AI capabilities disabled)';
      case 'all-mcp-servers':
        return 'App can access all configured MCP servers';
      case 'selected-mcp-servers':
        return 'App is restricted to specific MCP servers only';
      default:
        return '';
    }
  };

  const getScopeSetName = (scopeSetId?: string) => {
    if (!scopeSetId) return 'Custom';
    const scopeSet = scopeSets.find(set => set.id === scopeSetId);
    return scopeSet ? scopeSet.name : 'Unknown';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get scopes from selected scope set - guard against undefined arrays
    let finalDefaultScopes = [...(newApp.defaultClientScopes || [])];
    if (newApp.scopeSetId) {
      const selectedScopeSet = scopeSets.find(set => set.id === newApp.scopeSetId);
      if (selectedScopeSet) {
        finalDefaultScopes = [...selectedScopeSet.scopes, ...(newApp.optionalClientScopes || [])];
      }
    } else {
      finalDefaultScopes = [...(newApp.defaultClientScopes || []), ...(newApp.optionalClientScopes || [])];
    }
    
    onAddApp({
      name: newApp.name,
      clientId: newApp.clientId,
      launchUrl: newApp.launchUrl,
      redirectUris: newApp.redirectUris || [],
      description: newApp.description,
      defaultClientScopes: finalDefaultScopes,
      scopeSetId: newApp.scopeSetId,
      optionalClientScopes: newApp.optionalClientScopes || [],
      appType: newApp.appType!,
      serverAccessType: newApp.serverAccessType!,
      allowedServerIds: newApp.allowedServerIds || [],
      // MCP server access control
      mcpAccessType: newApp.mcpAccessType,
      allowedMcpServerNames: newApp.mcpAccessType === 'selected-mcp-servers' ? newApp.allowedMcpServerNames : [],
      // authenticationType is UI-only - backend infers from jwksUri/publicKey presence
      jwksUri: newApp.jwksUri,
      publicKey: newApp.publicKey,
    });

    // Reset form
    setNewApp({ 
      name: '', 
      clientId: '', 
      launchUrl: '',
      redirectUris: [], 
      description: '', 
      defaultClientScopes: [], 
      scopeSetId: '',
      optionalClientScopes: [],
      appType: 'standalone-app',
      authenticationType: 'symmetric', // UI-only
      serverAccessType: 'all-servers',
      allowedServerIds: [],
      mcpAccessType: 'none',
      allowedMcpServerNames: [],
    });
    onClose();
  };

  const handleCancel = () => {
    setNewApp({ 
      name: '', 
      clientId: '', 
      launchUrl: '',
      redirectUris: [], 
      description: '', 
      defaultClientScopes: [], 
      scopeSetId: '',
      optionalClientScopes: [],
      appType: 'standalone-app',
      authenticationType: 'symmetric', // UI-only
      serverAccessType: 'all-servers',
      allowedServerIds: [],
      mcpAccessType: 'none',
      allowedMcpServerNames: [],
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="bg-card/70 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">Register New SMART on FHIR Application</h3>
            <p className="text-muted-foreground font-medium">Add a new healthcare application to your system</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-semibold text-foreground">Application Name</Label>
            <Input
              id="name"
              placeholder="e.g., Clinical Decision Support"
              value={newApp.name}
              onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
              className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
              required
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="clientId" className="text-sm font-semibold text-foreground">Client ID</Label>
            <Input
              id="clientId"
              placeholder="e.g., app-client-123"
              value={newApp.clientId}
              onChange={(e) => setNewApp({ ...newApp, clientId: e.target.value })}
              className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="appType" className="text-sm font-semibold text-foreground">Application Type</Label>
            <Select
              value={newApp.appType}
              onValueChange={(value) => {
                const appType = value as SmartAppType;
                setNewApp({
                  ...newApp,
                  appType,
                  redirectUris: requiresRedirectUri(appType) ? newApp.redirectUris : [],
                  authenticationType: hasFixedAuthType(appType) ? getFixedAuthType(appType) : (newApp.authenticationType || 'symmetric')
                });
              }}
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standalone-app">Standalone App (Interactive)</SelectItem>
                <SelectItem value="ehr-launch">EHR Launch App (Interactive)</SelectItem>
                <SelectItem value="backend-service">Backend Service (Non-interactive, Deterministic)</SelectItem>
                <SelectItem value="agent">AI Agent (Non-interactive, Autonomous)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isInteractive(newApp.appType) && (
            <div className="space-y-3">
              <Label htmlFor="authenticationType" className="text-sm font-semibold text-foreground">Authentication Type</Label>
              <Select
                value={newApp.authenticationType}
                onValueChange={(value) => setNewApp({ ...newApp, authenticationType: value as AuthenticationType })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asymmetric">Asymmetric Client Authentication</SelectItem>
                  <SelectItem value="symmetric">Symmetric Client Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {hasFixedAuthType(newApp.appType) && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Authentication Type</Label>
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <span className="text-sm font-medium text-foreground">Asymmetric (Required)</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {getAuthTypeDescription(newApp.appType!)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Authentication Credentials Section */}
        {(newApp.authenticationType === 'asymmetric' || hasFixedAuthType(newApp.appType!)) && (
          <div className="space-y-6 p-6 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shadow-sm">
                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground tracking-tight">Asymmetric Authentication</h4>
                <p className="text-muted-foreground text-sm font-medium">Provide JWKS URI or public key for JWT signature verification</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="jwksUri" className="text-sm font-semibold text-foreground">JWKS URI</Label>
              <Input
                id="jwksUri"
                type="url"
                placeholder="https://your-app.com/.well-known/jwks.json"
                value={newApp.jwksUri || ''}
                onChange={(e) => setNewApp({ ...newApp, jwksUri: e.target.value })}
                className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
              />
              <p className="text-xs text-muted-foreground">
                URL endpoint where the proxy can fetch your app's public keys for JWT verification
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="publicKey" className="text-sm font-semibold text-foreground">Public Key (Alternative)</Label>
              <Textarea
                id="publicKey"
                placeholder="-----BEGIN PUBLIC KEY-----&#10;MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...&#10;-----END PUBLIC KEY-----"
                value={newApp.publicKey || ''}
                onChange={(e) => setNewApp({ ...newApp, publicKey: e.target.value })}
                className="min-h-[100px] rounded-xl shadow-sm font-mono"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Provide a public key directly if not using JWKS URI. Supports PEM format (RSA, EC).
              </p>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Authentication Options</p>
                  <p className="text-blue-700 dark:text-blue-400 text-xs">
                    You can provide either a JWKS URI or a public key directly. The JWKS URI is recommended as it allows for key rotation.
                    If both are provided, the JWKS URI takes precedence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {newApp.authenticationType === 'symmetric' && !hasFixedAuthType(newApp.appType!) && (
          <div className="space-y-6 p-6 bg-rose-500/10 rounded-xl border border-rose-500/20">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center shadow-sm">
                <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground tracking-tight">Symmetric Authentication</h4>
                <p className="text-muted-foreground text-sm font-medium">Store a shared secret for client authentication</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="clientSecret" className="text-sm font-semibold text-foreground">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="Enter shared secret"
                value={newApp.secret || ''}
                onChange={(e) => setNewApp({ ...newApp, secret: e.target.value })}
                className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">
                A shared secret used for symmetric client authentication. Keep this secure and never expose it in client-side code.
              </p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Security Warning</p>
                  <p className="text-amber-700 dark:text-amber-400 text-xs">
                    Symmetric authentication (client secrets) is less secure than asymmetric authentication (JWT with public/private keys).
                    Use asymmetric authentication when possible, especially for production deployments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Label htmlFor="redirectUri" className="text-sm font-semibold text-foreground">Redirect URI</Label>
          <Input
            id="redirectUri"
            type="url"
            placeholder="https://your-app.com/callback"
            value={(newApp.redirectUris || [])[0] || ''}
            onChange={(e) => setNewApp({ 
              ...newApp, 
              redirectUris: e.target.value ? [e.target.value] : []
            })}
            className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
            required={requiresRedirectUri(newApp.appType!)}
            disabled={!requiresRedirectUri(newApp.appType!)}
          />
          {!requiresRedirectUri(newApp.appType!) && (
            <p className="text-xs text-muted-foreground">{getRedirectUriHelperText(newApp.appType!)}</p>
          )}
          {isAgent(newApp.appType!) && (
            <div className="mt-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-purple-800 dark:text-purple-300 mb-1">Agent Flow Characteristics</p>
                  <p className="text-purple-700 dark:text-purple-400 mb-2">
                    Autonomous agents operate like backend services (no user login) but with non-deterministic, self-initiated behavior:
                  </p>
                  <ul className="text-purple-700 dark:text-purple-400 text-xs space-y-1 ml-4 list-disc">
                    <li><strong>No interactive login</strong> - Uses client credentials like backend services</li>
                    <li><strong>Non-deterministic</strong> - Makes autonomous decisions based on environmental triggers</li>
                    <li><strong>Dynamic identity</strong> - fhirUser resolved to specific Device resource at runtime</li>
                    <li><strong>Self-initiated</strong> - Actions triggered by AI/ML algorithms, not scheduled tasks</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="description" className="text-sm font-semibold text-foreground">Description</Label>
          <Input
            id="description"
            placeholder="Brief description of the application"
            value={newApp.description}
            onChange={(e) => setNewApp({ ...newApp, description: e.target.value })}
            className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
          />
        </div>

        {/* Server Access Configuration Section */}
        <div className="space-y-6 p-6 bg-orange-500/10 rounded-xl border border-orange-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center shadow-sm">
              <Server className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-foreground tracking-tight">Server Access Configuration</h4>
              <p className="text-muted-foreground text-sm font-medium">Control which FHIR servers this application can access</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="serverAccessType" className="text-sm font-semibold text-foreground">Server Access Type</Label>
              <Select
                value={newApp.serverAccessType}
                onValueChange={(value) => {
                  const serverAccessType = value as ServerAccessType;
                  setNewApp({
                    ...newApp,
                    serverAccessType,
                    allowedServerIds: serverAccessType === 'selected-servers' ? newApp.allowedServerIds : []
                  });
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-servers">All Available Servers</SelectItem>
                  <SelectItem value="selected-servers">Specific Servers Only</SelectItem>
                  {newApp.appType !== 'backend-service' && (
                    <SelectItem value="user-person-servers">Servers with User Person Records</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getServerAccessTypeDescription(newApp.serverAccessType!)}
              </p>
            </div>

            {newApp.serverAccessType === 'selected-servers' && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Select Allowed Servers</Label>
                {serversLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <div className="animate-spin inline-block w-4 h-4 border-2 border-border/50 border-t-primary rounded-full mr-2"></div>
                    Loading available servers...
                  </div>
                ) : servers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground bg-muted/50 rounded-lg border border-border/50">
                    <Server className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">No FHIR servers available</p>
                    <p className="text-xs text-muted-foreground">Configure FHIR servers first</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-card rounded-lg border border-border/50">
                    {servers.map((server) => (
                      <label key={server.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer">
                        <Checkbox
                          checked={(newApp.allowedServerIds || []).includes(server.id)}
                          onCheckedChange={(checked) => {
                            const serverIds = checked === true
                              ? [...(newApp.allowedServerIds || []), server.id]
                              : (newApp.allowedServerIds || []).filter(id => id !== server.id);
                            setNewApp({ ...newApp, allowedServerIds: serverIds });
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-foreground truncate">{server.name}</span>
                            {server.supported ? (
                              <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span className="truncate">{server.url}</span>
                            <Badge variant="outline" className="text-xs">
                              {server.fhirVersion}
                            </Badge>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {(newApp.allowedServerIds || []).length > 0 && (
                  <div className="text-xs text-green-600 dark:text-green-400 bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                    ✓ {(newApp.allowedServerIds || []).length} server(s) selected
                  </div>
                )}
              </div>
            )}

            {newApp.serverAccessType === 'user-person-servers' && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-purple-800 dark:text-purple-300 mb-1">User Person Server Access</p>
                    <p className="text-purple-700 dark:text-purple-400 mb-2">
                      This app will only be able to access FHIR servers where the authenticated user has an associated Person resource.
                    </p>
                    <ul className="text-purple-700 dark:text-purple-400 text-xs space-y-1 ml-4 list-disc">
                      <li>Server access is determined dynamically at runtime</li>
                      <li>Based on the user's Person resource links</li>
                      <li>Provides automatic data governance and access control</li>
                      <li>Only available for interactive applications (not backend services)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {newApp.serverAccessType === 'all-servers' && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Globe className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-green-800 dark:text-green-300 mb-1">All Server Access</p>
                    <p className="text-green-700 dark:text-green-400 text-xs">
                      This app will have access to all FHIR servers configured behind the Proxy. 
                      Use this option for apps that need broad access across all healthcare data sources.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MCP Server Access Section */}
        <div className="space-y-6 p-6 bg-violet-500/10 rounded-xl border border-violet-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center shadow-sm">
              <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-foreground tracking-tight">MCP Server Access (AI Capabilities)</h4>
              <p className="text-muted-foreground text-sm font-medium">Control which AI/MCP servers this application can use</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="mcpAccessType" className="text-sm font-semibold text-foreground">MCP Access Type</Label>
              <Select
                value={newApp.mcpAccessType || 'none'}
                onValueChange={(value) => {
                  const mcpAccessType = value as McpAccessType;
                  setNewApp({
                    ...newApp,
                    mcpAccessType,
                    allowedMcpServerNames: mcpAccessType === 'selected-mcp-servers' ? newApp.allowedMcpServerNames : []
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No MCP Access</SelectItem>
                  <SelectItem value="all-mcp-servers">All MCP Servers</SelectItem>
                  <SelectItem value="selected-mcp-servers">Specific MCP Servers Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getMcpAccessTypeDescription(newApp.mcpAccessType || 'none')}
              </p>
            </div>

            {newApp.mcpAccessType === 'selected-mcp-servers' && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Select Allowed MCP Servers</Label>
                {mcpServersLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <div className="animate-spin inline-block w-4 h-4 border-2 border-border/50 border-t-primary rounded-full mr-2"></div>
                    Loading available MCP servers...
                  </div>
                ) : mcpServers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground bg-muted/50 rounded-lg border border-border/50">
                    <Cpu className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">No MCP servers available</p>
                    <p className="text-xs text-muted-foreground">Configure MCP servers first</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-card rounded-lg border border-border/50">
                    {mcpServers.map((server) => (
                      <label key={server.name} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer">
                        <Checkbox
                          checked={(newApp.allowedMcpServerNames || []).includes(server.name)}
                          onCheckedChange={(checked) => {
                            const serverNames = checked === true
                              ? [...(newApp.allowedMcpServerNames || []), server.name]
                              : (newApp.allowedMcpServerNames || []).filter(name => name !== server.name);
                            setNewApp({ ...newApp, allowedMcpServerNames: serverNames });
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-foreground truncate">{server.name}</span>
                            {server.status === 'connected' ? (
                              <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span className="truncate">{server.url || server.type}</span>
                            {server.toolCount !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                {server.toolCount} tools
                              </Badge>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {(newApp.allowedMcpServerNames || []).length > 0 && (
                  <div className="text-xs text-violet-600 dark:text-violet-400 bg-violet-500/10 p-2 rounded-lg border border-violet-500/20">
                    ✓ {(newApp.allowedMcpServerNames || []).length} MCP server(s) selected
                  </div>
                )}
              </div>
            )}

            {newApp.mcpAccessType === 'none' && (
              <div className="p-4 bg-slate-500/10 border border-slate-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Cpu className="w-4 h-4 text-slate-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-slate-800 dark:text-slate-300 mb-1">No MCP Access</p>
                    <p className="text-slate-700 dark:text-slate-400 text-xs">
                      This app will not have access to any MCP servers. AI-powered features will be unavailable.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {newApp.mcpAccessType === 'all-mcp-servers' && (
              <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-violet-800 dark:text-violet-300 mb-1">Full MCP Access</p>
                    <p className="text-violet-700 dark:text-violet-400 text-xs">
                      This app will have access to all MCP servers configured in the system, enabling full AI capabilities.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scope Management Section */}
        <div className="space-y-6 p-6 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-foreground tracking-tight">Scope Configuration</h4>
              <p className="text-muted-foreground text-sm font-medium">Define what data this application can access</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="scopeSet" className="text-sm font-semibold text-foreground">Scope Template</Label>
              <Select
                value={newApp.scopeSetId || "__custom__"}
                onValueChange={(value) => setNewApp({ ...newApp, scopeSetId: value === "__custom__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom__">Custom Scopes</SelectItem>
                  {scopeSets.map(set => (
                    <SelectItem key={set.id} value={set.id}>{set.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="customScopes" className="text-sm font-semibold text-foreground">Additional Scopes</Label>
              <Input
                id="customScopes"
                placeholder="patient/Patient.read, user/Observation.read"
                value={(newApp.optionalClientScopes || []).join(', ')}
                onChange={(e) => setNewApp({ 
                  ...newApp, 
                  optionalClientScopes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
          </div>

          {(newApp.scopeSetId || (newApp.optionalClientScopes || []).length > 0) && (
            <div className="bg-card/70 p-4 rounded-lg border border-border/50">
              <Label className="text-sm font-semibold text-foreground mb-2 block">Current Scope Preview</Label>
              <div className="text-xs text-muted-foreground mb-2">
                Template: <span className="font-medium">{getScopeSetName(newApp.scopeSetId)}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {/* Show template scopes */}
                {newApp.scopeSetId && scopeSets.find(set => set.id === newApp.scopeSetId)?.scopes.map((scope, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 font-mono">
                    {scope}
                  </Badge>
                ))}
                {/* Show additional scopes */}
                {(newApp.optionalClientScopes || []).map((scope: string, index: number) => (
                  <Badge key={`optional-${index}`} variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 font-mono">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="flex-1 rounded-xl py-3 font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold rounded-xl py-3 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Application
          </Button>
        </div>
      </form>
    </div>
  );
}
