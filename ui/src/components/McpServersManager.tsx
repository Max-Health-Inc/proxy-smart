import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../stores/authStore';
import { getStoredToken } from '@/lib/apiClient';
import { useTranslation } from 'react-i18next';
import {
    Server,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Clock,
    Wrench,
    XCircle,
    Zap,
    Plus,
    Edit,
    Trash2,
    Sparkles,
    Shield,
    ShieldAlert,
    ShieldCheck,
    ExternalLink,
    Globe,
    Search,
    Loader2,
    Download,
    ChevronDown,
    Link2,
    AppWindow,
    BookOpen,
    AlertTriangle,
    Radio
} from 'lucide-react';
import { McpEndpointSettings } from './McpEndpointSettings';
import { Badge, Button, Input, Label } from '@proxy-smart/shared-ui';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import type {
    GetAdminMcpServers200ResponseServersInner,
    GetAdminMcpServersByNameHealth200Response,
    GetAdminMcpServersByNameTools200ResponseToolsInner,
    GetAdminAiToolsSkillsRegistryBrowse200ResponseSkillsInner,
    SmartApp
} from '../lib/api-client';
import { Checkbox } from './ui/checkbox';
import { AssignAppsDialog, AssignedAppsBadges } from './AssignAppsDialog';

interface McpTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    url: string | null;
    transport: string;
    auth: {
        type: string;
        required: boolean;
        provider?: string;
    };
    icon: string;
    isRemote: boolean;
    isPublic: boolean;
    enabled: boolean;
    securityNote?: string;
    installCommand?: string;
}

interface McpTemplatesData {
    templates: McpTemplate[];
    categories: Record<string, { name: string; description: string; icon: string }>;
    version: string;
}

interface RegistryServer {
    name: string;
    title?: string;
    description: string;
    version: string;
    url: string;
    transport: string;
    websiteUrl?: string;
    publishedAt?: string;
}

interface Skill {
    name: string;
    description: string;
    sourceUrl?: string;
    type: 'claude-skill' | 'custom';
    installedAt?: string;
    enabled: boolean;
}

export function McpServersManager() {
    const { clientApis } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [servers, setServers] = useState<GetAdminMcpServers200ResponseServersInner[]>([]);
    const [expandedServer, setExpandedServer] = useState<string | null>(null);
    const [serverTools, setServerTools] = useState<Record<string, GetAdminMcpServersByNameTools200ResponseToolsInner[]>>({});
    const [serverHealth, setServerHealth] = useState<Record<string, GetAdminMcpServersByNameHealth200Response>>({});
    
    // Templates state
    const [templates, setTemplates] = useState<McpTemplatesData | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Top-level tab state (MCP Servers vs Skills)
    const [activeToolTab, setActiveToolTab] = useState<string>('mcp-endpoint');

    // Skills state
    const [skills, setSkills] = useState<Skill[]>([]);
    const [skillsLoading, setSkillsLoading] = useState(false);
    const [showAddSkillDialog, setShowAddSkillDialog] = useState(false);
    const [skillFormData, setSkillFormData] = useState({ name: '', description: '', sourceUrl: '' });
    const [skillFormErrors, setSkillFormErrors] = useState<Record<string, string>>({});
    const [skillSubmitting, setSkillSubmitting] = useState(false);

    // Skills registry (skills.sh) state
    const [showSkillsRegistryDialog, setShowSkillsRegistryDialog] = useState(false);
    const [skillsRegistrySearch, setSkillsRegistrySearch] = useState('');
    const [skillsRegistryResults, setSkillsRegistryResults] = useState<GetAdminAiToolsSkillsRegistryBrowse200ResponseSkillsInner[]>([]);
    const [skillsRegistryLoading, setSkillsRegistryLoading] = useState(false);
    const [skillsRegistryError, setSkillsRegistryError] = useState<string | null>(null);
    const [installingSkillId, setInstallingSkillId] = useState<string | null>(null);

    // Memoize installed server names for O(1) lookup
    const installedServerNames = useMemo(() => new Set(servers.map(s => s.name)), [servers]);
    
    // Memoize filtered templates to avoid recalculating on every render
    const filteredTemplates = useMemo(() => {
        if (!templates) return [];
        return templates.templates.filter(
            template => selectedCategory === 'all' || template.category === selectedCategory
        );
    }, [templates, selectedCategory]);
    const [templatesExpanded, setTemplatesExpanded] = useState(false);
    
    // Dialog states
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedServer, setSelectedServer] = useState<GetAdminMcpServers200ResponseServersInner | null>(null);
    
    // Form states
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        description: ''
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // Registry browse state
    const [showRegistryDialog, setShowRegistryDialog] = useState(false);
    const [registrySearch, setRegistrySearch] = useState('');
    const [registryResults, setRegistryResults] = useState<RegistryServer[]>([]);
    const [registryLoading, setRegistryLoading] = useState(false);
    const [registryError, setRegistryError] = useState<string | null>(null);
    const [installingServer, setInstallingServer] = useState<string | null>(null);

    // SMART Apps assignment state
    const [smartApps, setSmartApps] = useState<SmartApp[]>([]);
    const [showAssignAppsDialog, setShowAssignAppsDialog] = useState(false);
    const [assigningResourceName, setAssigningResourceName] = useState<string>('');
    const [assigningField, setAssigningField] = useState<'allowedMcpServerNames' | 'allowedSkillNames'>('allowedMcpServerNames');
    const [assigningLabel, setAssigningLabel] = useState<string>('MCP server');

    const fetchTemplates = useCallback(async () => {
        try {
            const data = await clientApis.mcpManagement.getAdminMcpServersTemplates();
            setTemplates(data as unknown as McpTemplatesData);
        } catch (err) {
            console.error('Failed to fetch templates:', err);
        }
    }, [clientApis]);

    const fetchServers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await clientApis.mcpManagement.getAdminMcpServers();
            setServers(response.servers || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load MCP servers');
            console.error('Failed to fetch MCP servers:', err);
        } finally {
            setLoading(false);
        }
    }, [clientApis]);

    const fetchServerTools = async (serverName: string) => {
        try {
            const response = await clientApis.mcpManagement.getAdminMcpServersByNameTools({ name: serverName });
            setServerTools(prev => ({
                ...prev,
                [serverName]: response.tools || []
            }));
        } catch (err) {
            console.error(`Failed to fetch tools for ${serverName}:`, err);
        }
    };

    const fetchServerHealth = async (serverName: string) => {
        try {
            const response = await clientApis.mcpManagement.getAdminMcpServersByNameHealth({ name: serverName });
            setServerHealth(prev => ({
                ...prev,
                [serverName]: response
            }));
        } catch (err) {
            console.error(`Failed to fetch health for ${serverName}:`, err);
        }
    };

    const fetchSmartApps = useCallback(async () => {
        try {
            const apps = await clientApis.smartApps.getAdminSmartApps();
            setSmartApps(apps || []);
        } catch (err) {
            console.error('Failed to fetch SMART apps:', err);
        }
    }, [clientApis]);

    // Open the shared assign-apps dialog for either MCP servers or skills
    const openAssignDialog = (name: string, field: 'allowedMcpServerNames' | 'allowedSkillNames', label: string) => {
        setAssigningResourceName(name);
        setAssigningField(field);
        setAssigningLabel(label);
        setShowAssignAppsDialog(true);
    };

    // Shared update callback used by AssignAppsDialog
    const updateSmartApp = useCallback(async (clientId: string, update: Partial<SmartApp>) => {
        await clientApis.smartApps.putAdminSmartAppsByClientId({
            clientId,
            updateSmartAppRequest: update,
        });
    }, [clientApis]);

    const handleRefresh = async () => {
        try {
            await clientApis.mcpManagement.postAdminMcpServersRefresh();
            await fetchServers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refresh servers');
            console.error('Failed to refresh MCP servers:', err);
        }
    };

    const handleInstallTemplate = async (template: McpTemplate) => {
        setSubmitting(true);
        setFormErrors({});
        
        try {
            // For remote servers, use the template URL directly
            if (template.isRemote && template.url) {
                await clientApis.mcpManagement.postAdminMcpServers({
                    postAdminMcpServersRequest: {
                        name: template.id,
                        url: template.url,
                        description: template.description
                    }
                });
            } else {
                // For local servers, show error - they need manual installation
                setFormErrors({
                    submit: t('Local MCP servers must be installed manually using: {{command}}', { 
                        command: template.installCommand || 'npm install'
                    })
                });
                return;
            }
            
            // Refresh server list
            await fetchServers();
            
        } catch (err) {
            setFormErrors({
                submit: err instanceof Error ? err.message : 'Failed to install template'
            });
            console.error('Failed to install template:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        
        if (!formData.name.trim()) {
            errors.name = t('Server name is required');
        } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
            errors.name = t('Server name must contain only lowercase letters, numbers, and hyphens');
        }
        
        if (!formData.url.trim()) {
            errors.url = t('Server URL is required');
        } else {
            try {
                new URL(formData.url);
            } catch {
                errors.url = t('Invalid URL format');
            }
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAddServer = async () => {
        if (!validateForm()) return;
        
        setSubmitting(true);
        try {
            await clientApis.mcpManagement.postAdminMcpServers({
                postAdminMcpServersRequest: {
                    name: formData.name,
                    url: formData.url,
                    description: formData.description || undefined
                }
            });
            setShowAddDialog(false);
            setFormData({ name: '', url: '', description: '' });
            await fetchServers();
        } catch (err) {
            setFormErrors({ submit: err instanceof Error ? err.message : 'Failed to add server' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditServer = async () => {
        if (!selectedServer) return;
        if (!validateForm()) return;
        
        setSubmitting(true);
        try {
            await clientApis.mcpManagement.patchAdminMcpServersByName({
                name: selectedServer.name!,
                patchAdminMcpServersByNameRequest: {
                    url: formData.url,
                    description: formData.description || undefined
                }
            });
            setShowEditDialog(false);
            setSelectedServer(null);
            setFormData({ name: '', url: '', description: '' });
            await fetchServers();
        } catch (err) {
            setFormErrors({ submit: err instanceof Error ? err.message : 'Failed to update server' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteServer = async () => {
        if (!selectedServer) return;
        
        setSubmitting(true);
        try {
            await clientApis.mcpManagement.deleteAdminMcpServersByName({
                name: selectedServer.name!
            });
            setShowDeleteDialog(false);
            setSelectedServer(null);
            await fetchServers();
        } catch (err) {
            setFormErrors({ submit: err instanceof Error ? err.message : 'Failed to delete server' });
        } finally {
            setSubmitting(false);
        }
    };

    const openAddDialog = () => {
        setFormData({ name: '', url: '', description: '' });
        setFormErrors({});
        setShowAddDialog(true);
    };

    // --- Registry search ---
    const searchRegistry = useCallback(async (query: string) => {
        setRegistryLoading(true);
        setRegistryError(null);
        try {
            const token = await getStoredToken();
            const params = new URLSearchParams({ limit: '50' });
            if (query.trim()) params.set('q', query.trim());
            const response = await fetch(`/admin/mcp-servers/registry/search?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error(`Search failed: ${response.status}`);
            const data = await response.json();
            setRegistryResults(data.servers || []);
        } catch (err) {
            setRegistryError(err instanceof Error ? err.message : 'Failed to search registry');
            setRegistryResults([]);
        } finally {
            setRegistryLoading(false);
        }
    }, []);

    const handleRegistryInstall = async (server: RegistryServer) => {
        setInstallingServer(server.name);
        try {
            // Derive a short name from the registry name (e.g. "io.github.user/weather" -> "weather")
            const shortName = server.name.includes('/') ? server.name.split('/').pop()! : server.name;
            await clientApis.mcpManagement.postAdminMcpServers({
                postAdminMcpServersRequest: {
                    name: shortName,
                    url: server.url,
                    description: server.title || server.description
                }
            });
            await fetchServers();
            setShowRegistryDialog(false);
        } catch (err) {
            setRegistryError(err instanceof Error ? err.message : 'Failed to add server');
        } finally {
            setInstallingServer(null);
        }
    };

    const openRegistryDialog = () => {
        setRegistrySearch('');
        setRegistryResults([]);
        setRegistryError(null);
        setShowRegistryDialog(true);
        // Load initial results
        searchRegistry('');
    };

    // --- Skills management ---
    const fetchSkills = useCallback(async () => {
        if (!clientApis?.aiTools) return;
        setSkillsLoading(true);
        try {
            const response = await clientApis.aiTools.getAdminAiToolsSkills();
            setSkills(response.skills || []);
        } catch (err) {
            console.error('Failed to fetch skills:', err);
        } finally {
            setSkillsLoading(false);
        }
    }, [clientApis]);

    const handleAddSkill = async () => {
        const errors: Record<string, string> = {};
        if (!skillFormData.name.trim()) errors.name = t('Skill name is required');
        if (Object.keys(errors).length > 0) { setSkillFormErrors(errors); return; }
        
        setSkillSubmitting(true);
        try {
            if (!clientApis?.aiTools) throw new Error('API not available');
            await clientApis.aiTools.postAdminAiToolsSkills({
                postAdminAiToolsSkillsRequest: {
                    name: skillFormData.name,
                    description: skillFormData.description,
                    sourceUrl: skillFormData.sourceUrl || undefined
                }
            });
            setShowAddSkillDialog(false);
            setSkillFormData({ name: '', description: '', sourceUrl: '' });
            await fetchSkills();
        } catch (err) {
            setSkillFormErrors({ submit: err instanceof Error ? err.message : 'Failed to add skill' });
        } finally {
            setSkillSubmitting(false);
        }
    };

    const handleDeleteSkill = async (skillName: string) => {
        try {
            if (!clientApis?.aiTools) return;
            await clientApis.aiTools.deleteAdminAiToolsSkillsByName({ name: skillName });
            await fetchSkills();
        } catch (err) {
            console.error('Failed to delete skill:', err);
        }
    };

    // --- Skills.sh registry browsing ---
    const browseSkillsRegistry = useCallback(async () => {
        if (!clientApis?.aiTools) return;
        setSkillsRegistryLoading(true);
        setSkillsRegistryError(null);
        try {
            const response = await clientApis.aiTools.getAdminAiToolsSkillsRegistryBrowse({ limit: '30' });
            setSkillsRegistryResults(response.skills || []);
        } catch (err) {
            setSkillsRegistryError(err instanceof Error ? err.message : 'Failed to load skills.sh');
            setSkillsRegistryResults([]);
        } finally {
            setSkillsRegistryLoading(false);
        }
    }, [clientApis]);

    const searchSkillsRegistry = useCallback(async (query: string) => {
        if (!clientApis?.aiTools) return;
        setSkillsRegistryLoading(true);
        setSkillsRegistryError(null);
        try {
            if (query.trim().length < 2) {
                // Fall back to browse
                const response = await clientApis.aiTools.getAdminAiToolsSkillsRegistryBrowse({ limit: '30' });
                setSkillsRegistryResults(response.skills || []);
            } else {
                const response = await clientApis.aiTools.getAdminAiToolsSkillsRegistrySearch({ q: query.trim(), limit: '30' });
                setSkillsRegistryResults(response.skills || []);
            }
        } catch (err) {
            setSkillsRegistryError(err instanceof Error ? err.message : 'Search failed');
            setSkillsRegistryResults([]);
        } finally {
            setSkillsRegistryLoading(false);
        }
    }, [clientApis]);

    const handleSkillsRegistryInstall = async (skill: GetAdminAiToolsSkillsRegistryBrowse200ResponseSkillsInner) => {
        if (!clientApis?.aiTools) return;
        setInstallingSkillId(skill.id);
        try {
            // Derive short name from ID (e.g. "owner/repo/skill-name" -> "skill-name")
            const shortName = skill.id.includes('/') ? skill.id.split('/').pop()! : skill.name;
            await clientApis.aiTools.postAdminAiToolsSkillsRegistryInstall({
                postAdminAiToolsSkillsRegistryInstallRequest: {
                    id: skill.id,
                    name: shortName,
                    description: skill.description,
                    owner: skill.owner,
                    repo: skill.repo,
                    githubUrl: skill.githubUrl,
                    skillsshUrl: skill.skillsshUrl
                }
            });
            await fetchSkills();
            // Re-browse to update installed flags
            if (skillsRegistrySearch.trim().length >= 2) {
                await searchSkillsRegistry(skillsRegistrySearch);
            } else {
                await browseSkillsRegistry();
            }
        } catch (err) {
            setSkillsRegistryError(err instanceof Error ? err.message : 'Failed to install skill');
        } finally {
            setInstallingSkillId(null);
        }
    };

    const openSkillsRegistryDialog = () => {
        setSkillsRegistrySearch('');
        setSkillsRegistryResults([]);
        setSkillsRegistryError(null);
        setShowSkillsRegistryDialog(true);
        browseSkillsRegistry();
    };

    const openEditDialog = (server: GetAdminMcpServers200ResponseServersInner) => {
        setSelectedServer(server);
        setFormData({
            name: server.name || '',
            url: server.url || '',
            description: server.description || ''
        });
        setFormErrors({});
        setShowEditDialog(true);
    };

    const openDeleteDialog = (server: GetAdminMcpServers200ResponseServersInner) => {
        setSelectedServer(server);
        setFormErrors({});
        setShowDeleteDialog(true);
    };

    const toggleServerExpansion = async (serverName: string) => {
        if (expandedServer === serverName) {
            setExpandedServer(null);
        } else {
            setExpandedServer(serverName);
            // Fetch tools and health if not already fetched
            if (!serverTools[serverName]) {
                await fetchServerTools(serverName);
            }
            if (!serverHealth[serverName]) {
                await fetchServerHealth(serverName);
            }
        }
    };

    useEffect(() => {
        fetchServers();
        fetchTemplates();
        fetchSmartApps();
        fetchSkills();
    }, [fetchServers, fetchTemplates, fetchSmartApps]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'connected':
                return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'error':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'checking':
                return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
            default:
                return <AlertCircle className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected':
                return 'bg-emerald-500/5 dark:bg-emerald-400/10 hover:bg-emerald-500/10 dark:hover:bg-emerald-400/20 border-emerald-500/20 dark:border-emerald-400/30';
            case 'error':
                return 'bg-red-500/5 dark:bg-red-400/10 hover:bg-red-500/10 dark:hover:bg-red-400/20 border-red-500/20 dark:border-red-400/30';
            case 'checking':
                return 'bg-yellow-500/5 dark:bg-yellow-400/10 hover:bg-yellow-500/10 dark:hover:bg-yellow-400/20 border-yellow-500/20 dark:border-yellow-400/30';
            default:
                return 'bg-gray-500/5 dark:bg-gray-400/10 hover:bg-gray-500/10 dark:hover:bg-gray-400/20 border-gray-500/20 dark:border-gray-400/30';
        }
    };

    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHours > 0) return `${diffHours}h ago`;
        if (diffMins > 0) return `${diffMins}m ago`;
        if (diffSecs > 0) return `${diffSecs}s ago`;
        return 'Just now';
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-background min-h-full">
            {/* Header */}
            <div className="bg-muted/50 p-4 sm:p-6 lg:p-8 rounded-3xl border border-border/50 shadow-lg">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                    <div className="flex-1">
                        <h1 className="text-3xl font-medium text-foreground mb-3 tracking-tight">
                            {t('MCP Configuration')}
                        </h1>
                        <div className="text-muted-foreground flex items-center text-lg">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            {t('Manage MCP servers and endpoints')}
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {activeToolTab === 'mcp-servers' && (
                            <>
                                <Button variant="outline" onClick={openRegistryDialog}>
                                    <Globe className="w-4 h-4 mr-2" />
                                    {t('Browse Registry')}
                                </Button>
                                <Button onClick={openAddDialog}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    {t('Add Server')}
                                </Button>
                                <Button variant="outline" onClick={handleRefresh} disabled={loading}>
                                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                    {t('Refresh Status')}
                                </Button>
                            </>
                        )}
                        {activeToolTab === 'skills' && (
                            <>
                                <Button variant="outline" onClick={openSkillsRegistryDialog}>
                                    <Globe className="w-4 h-4 mr-2" />
                                    {t('Browse skills.sh')}
                                </Button>
                                <Button onClick={() => { setSkillFormData({ name: '', description: '', sourceUrl: '' }); setSkillFormErrors({}); setShowAddSkillDialog(true); }}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    {t('Add Skill')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Top-level Tool Type Tabs */}
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg">
            <Tabs value={activeToolTab} onValueChange={setActiveToolTab} className="w-full">
                {/* TabsList hidden for now — can be re-enabled later when Skills tab is needed */}
                <TabsList className="hidden">
                    <TabsTrigger value="mcp-servers" />
                    <TabsTrigger value="mcp-endpoint" />
                    <TabsTrigger value="skills" />
                </TabsList>

                <TabsContent value="mcp-servers" className="p-6 space-y-6">

            {/* Quick Setup Templates */}
            {templates && templates.templates.length > 0 && (
                <div className="bg-card/70 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                    <button
                        type="button"
                        onClick={() => setTemplatesExpanded(!templatesExpanded)}
                        className="w-full flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <div className="flex items-center">
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                                <Sparkles className="w-7 h-7 text-purple-600" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Quick Setup Templates')}</h3>
                                <p className="text-sm text-muted-foreground">{t('One-click setup for popular MCP servers')}</p>
                            </div>
                        </div>
                        <ChevronDown className={`w-6 h-6 text-muted-foreground transition-transform duration-200 ${templatesExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Category Tabs */}
                    {templatesExpanded && (
                    <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full mt-6">
                        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-6">
                            <TabsTrigger value="all" className="px-4 py-2">
                                {t('All')} ({templates.templates.length})
                            </TabsTrigger>
                            {Object.entries(templates.categories).map(([key, category]) => {
                                const count = templates.templates.filter(t => t.category === key).length;
                                if (count === 0) return null;
                                return (
                                    <TabsTrigger key={key} value={key} className="px-4 py-2">
                                        <span className="mr-2">{category.icon}</span>
                                        {category.name} ({count})
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>

                        <TabsContent value={selectedCategory} className="mt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredTemplates.map(template => {
                                        const isInstalled = installedServerNames.has(template.id);
                                        const securityLevel = template.securityNote?.includes('DANGER') ? 'danger' : 
                                                             template.securityNote?.includes('CAUTION') ? 'caution' : 'safe';
                                        
                                        return (
                                            <div key={template.id} className="bg-muted/30 rounded-xl p-4 border border-border/50 hover:border-primary/30">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-2xl">{template.icon}</span>
                                                        <div>
                                                            <h4 className="font-semibold text-foreground text-sm">{template.name}</h4>
                                                            <div className="flex items-center space-x-1 mt-1">
                                                                <Badge variant={template.isRemote ? 'default' : 'secondary'} className="text-xs">
                                                                    {template.isRemote ? (
                                                                        <><ExternalLink className="w-3 h-3 mr-1" />{t('Remote')}</>
                                                                    ) : (
                                                                        <>{t('Local')}</>
                                                                    )}
                                                                </Badge>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {template.transport.toUpperCase()}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {securityLevel === 'danger' && (
                                                        <ShieldAlert className="w-5 h-5 text-red-500" />
                                                    )}
                                                    {securityLevel === 'caution' && (
                                                        <Shield className="w-5 h-5 text-yellow-500" />
                                                    )}
                                                    {securityLevel === 'safe' && (
                                                        <ShieldCheck className="w-5 h-5 text-green-500" />
                                                    )}
                                                </div>
                                                
                                                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                                    {template.description}
                                                </p>
                                                
                                                {template.securityNote && (
                                                    <div className={`text-xs p-2 rounded-lg mb-3 ${
                                                        securityLevel === 'danger' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                                                        securityLevel === 'caution' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                                                        'bg-green-500/10 text-green-600 dark:text-green-400'
                                                    }`}>
                                                        {template.securityNote}
                                                    </div>
                                                )}
                                                
                                                {template.auth.required && (
                                                    <div className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 p-2 rounded-lg mb-3">
                                                        🔐 {t('Requires')} {template.auth.type === 'oauth' ? 'OAuth' : template.auth.type}
                                                    </div>
                                                )}
                                                
                                                <Button
                                                    onClick={() => handleInstallTemplate(template)}
                                                    disabled={isInstalled || submitting || !template.isRemote}
                                                    size="sm"
                                                    className="w-full"
                                                    variant={isInstalled ? 'secondary' : 'default'}
                                                >
                                                    {isInstalled ? (
                                                        <><CheckCircle className="w-4 h-4 mr-2" />{t('Installed')}</>
                                                    ) : !template.isRemote ? (
                                                        <>{t('Manual Install Required')}</>
                                                    ) : (
                                                        <><Plus className="w-4 h-4 mr-2" />{t('Install')}</>
                                                    )}
                                                </Button>
                                            </div>
                                        );
                                    })}
                            </div>
                        </TabsContent>
                    </Tabs>
                    )}
                </div>
            )}

            {/* Server List */}
            <div className="bg-card/70 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                            <Server className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Configured Servers')}</h3>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {servers.length} {servers.length === 1 ? t('server') : t('servers')}
                    </div>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Server className="w-8 h-8 text-muted-foreground animate-pulse" />
                            </div>
                            <p className="text-muted-foreground text-sm">{t('Loading MCP servers...')}</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                        </div>
                    ) : servers.length > 0 ? (
                        servers.map((server, index) => (
                            <div key={server.name || index}>
                                <div
                                    className={`flex items-center justify-between py-4 px-5 rounded-xl transition-all duration-200 border cursor-pointer ${getStatusColor(server.status || 'unknown')}`}
                                    onClick={() => toggleServerExpansion(server.name!)}
                                >
                                    <div className="flex items-center flex-1">
                                        {getStatusIcon(server.status || 'unknown')}
                                        <div className="flex-1 ml-4">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-foreground font-medium">
                                                    {server.name}
                                                </span>
                                                <span className="text-xs bg-muted/80 px-2 py-1 rounded-full font-medium text-muted-foreground">
                                                    {server.type}
                                                </span>
                                            </div>
                                            {server.description && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {server.description}
                                                </div>
                                            )}
                                            {server.url && (
                                                <div className="text-xs text-muted-foreground mt-1 font-mono">
                                                    {server.url}
                                                </div>
                                            )}
                                            {server.lastChecked && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {t('Last checked')}: {formatTimestamp(server.lastChecked)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        {server.toolCount !== undefined && (
                                            <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1 rounded-lg">
                                                <Wrench className="w-4 h-4 text-primary" />
                                                <span className="text-sm font-semibold text-foreground">
                                                    {server.toolCount} {server.toolCount === 1 ? t('tool') : t('tools')}
                                                </span>
                                            </div>
                                        )}
                                        <span className="text-sm font-semibold">
                                            {server.status === 'connected' && (
                                                <span className="text-emerald-600 dark:text-emerald-400">{t('Connected')}</span>
                                            )}
                                            {server.status === 'error' && (
                                                <span className="text-red-600 dark:text-red-400">{t('Error')}</span>
                                            )}
                                            {server.status === 'unknown' && (
                                                <span className="text-gray-600 dark:text-gray-400">{t('Unknown')}</span>
                                            )}
                                            {!server.status && (
                                                <span className="text-gray-600 dark:text-gray-400">{t('Unknown')}</span>
                                            )}
                                        </span>
                                        {server.type === 'external' && (
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditDialog(server);
                                                    }}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    title={t('Edit server')}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openAssignDialog(server.name!, 'allowedMcpServerNames', 'MCP server');
                                                    }}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    title={t('Assign to SMART Apps')}
                                                >
                                                    <Link2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openDeleteDialog(server);
                                                    }}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedServer === server.name && (
                                    <div className="mt-2 ml-12 p-4 bg-muted/20 rounded-xl border border-border/30">
                                        {/* Health Info */}
                                        {serverHealth[server.name!] && (
                                            <div className="mb-4">
                                                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center">
                                                    <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
                                                    {t('Health Status')}
                                                </h4>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="bg-background/50 p-2 rounded">
                                                        <span className="text-muted-foreground">{t('Status')}:</span>
                                                        <span className="ml-2 font-semibold text-foreground">
                                                            {serverHealth[server.name!].status}
                                                        </span>
                                                    </div>
                                                    {serverHealth[server.name!].responseTime !== undefined && (
                                                        <div className="bg-background/50 p-2 rounded">
                                                            <span className="text-muted-foreground">{t('Response Time')}:</span>
                                                            <span className="ml-2 font-semibold text-foreground">
                                                                {serverHealth[server.name!].responseTime}ms
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Tools List */}
                                        {serverTools[server.name!] && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center">
                                                    <Wrench className="w-4 h-4 mr-2 text-primary" />
                                                    {t('Available Tools')} ({serverTools[server.name!].length})
                                                </h4>
                                                <div className="space-y-2">
                                                    {serverTools[server.name!].map((tool, toolIndex) => (
                                                        <div key={toolIndex} className="bg-background/50 p-3 rounded-lg border border-border/20">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center space-x-2">
                                                                        <Zap className="w-3 h-3 text-primary" />
                                                                        <span className="text-sm font-medium text-foreground">
                                                                            {tool.name}
                                                                        </span>
                                                                    </div>
                                                                    {tool.description && (
                                                                        <p className="text-xs text-muted-foreground mt-1 ml-5">
                                                                            {tool.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Assigned SMART Apps */}
                                        <AssignedAppsBadges
                                            resourceName={server.name!}
                                            field="allowedMcpServerNames"
                                            smartApps={smartApps}
                                            onManage={() => openAssignDialog(server.name!, 'allowedMcpServerNames', 'MCP server')}
                                            emptyMessage={t('No SMART apps are using this MCP server yet.')}
                                        />
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Server className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h4 className="text-lg font-semibold text-foreground mb-2">{t('No MCP Servers')}</h4>
                            <p className="text-muted-foreground text-sm mb-4">
                                {t('No MCP servers have been configured yet.')}
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setShowAddDialog(true)}
                                className="mx-auto"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {t('Add Server')}
                            </Button>
                            <p className="text-muted-foreground text-xs mt-4">
                                {t('Or configure via environment variables:')}
                            </p>
                            <div className="mt-2 bg-muted/30 p-4 rounded-lg text-left max-w-md mx-auto">
                                <code className="text-xs font-mono text-foreground">
                                    GENERATED_MCP_URL=http://localhost:8081<br />
                                    EXTERNAL_MCP_SERVERS=[{"{"}name: ..., url: ...{"}"}]
                                </code>
                            </div>
                        </div>
                    )}
                </div>
            </div>
                </TabsContent>

                {/* MCP Endpoint Tab */}
                <TabsContent value="mcp-endpoint" className="p-6 space-y-6">
                    <McpEndpointSettings />
                </TabsContent>

                {/* Skills Tab */}
                <TabsContent value="skills" className="p-6 space-y-6">
                    <div className="bg-card/70 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl border border-border/50 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center">
                                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                                    <BookOpen className="w-7 h-7 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Installed Skills')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('Claude Skills and custom AI skill packages assigned to SMART apps')}</p>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {skills.length} {skills.length === 1 ? t('skill') : t('skills')}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {skillsLoading ? (
                                <div className="text-center py-8">
                                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mx-auto mb-4" />
                                    <p className="text-muted-foreground text-sm">{t('Loading skills...')}</p>
                                </div>
                            ) : skills.length > 0 ? (
                                skills.map((skill) => (
                                    <div key={skill.name} className="rounded-xl border bg-muted/20 border-border/50">
                                        <div className="flex items-center justify-between py-4 px-5">
                                            <div className="flex items-center flex-1">
                                                <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center mr-4">
                                                    <BookOpen className="w-5 h-5 text-violet-500" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-foreground font-medium">{skill.name}</span>
                                                        <Badge variant="secondary" className="text-xs">{skill.type}</Badge>
                                                    </div>
                                                    {skill.description && (
                                                        <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
                                                    )}
                                                    {skill.sourceUrl && (
                                                        <p className="text-xs text-muted-foreground mt-1 font-mono">{skill.sourceUrl}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    title={t('Assign to SMART Apps')}
                                                    onClick={() => openAssignDialog(skill.name, 'allowedSkillNames', 'skill')}
                                                >
                                                    <Link2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                                                    onClick={() => handleDeleteSkill(skill.name)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="px-5 pb-4">
                                            <AssignedAppsBadges
                                                resourceName={skill.name}
                                                field="allowedSkillNames"
                                                smartApps={smartApps}
                                                onManage={() => openAssignDialog(skill.name, 'allowedSkillNames', 'skill')}
                                                emptyMessage={t('No SMART apps are using this skill yet.')}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <BookOpen className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h4 className="text-lg font-semibold text-foreground mb-2">{t('No Skills Installed')}</h4>
                                    <p className="text-muted-foreground text-sm mb-4">
                                        {t('Skills are AI capability packages that can be assigned to SMART apps.')}
                                    </p>
                                    <div className="flex items-center justify-center gap-3">
                                        <Button
                                            variant="default"
                                            onClick={openSkillsRegistryDialog}
                                        >
                                            <Globe className="w-4 h-4 mr-2" />
                                            {t('Browse skills.sh')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => { setSkillFormData({ name: '', description: '', sourceUrl: '' }); setSkillFormErrors({}); setShowAddSkillDialog(true); }}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            {t('Add Manually')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            </div>

            {/* Add Server Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('Add MCP Server')}</DialogTitle>
                        <DialogDescription>
                            {t('Add a new external MCP server to the system.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('Server Name')}</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="my-mcp-server"
                                className={formErrors.name ? 'border-red-500' : ''}
                            />
                            {formErrors.name && (
                                <p className="text-sm text-red-600">{formErrors.name}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="url">{t('Server URL')}</Label>
                            <Input
                                id="url"
                                value={formData.url}
                                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                placeholder="http://localhost:8082"
                                className={formErrors.url ? 'border-red-500' : ''}
                            />
                            {formErrors.url && (
                                <p className="text-sm text-red-600">{formErrors.url}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('Description')} ({t('optional')})</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder={t('My custom MCP server')}
                            />
                        </div>
                        {formErrors.submit && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                <p className="text-sm text-red-600 dark:text-red-400">{formErrors.submit}</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowAddDialog(false)}
                            disabled={submitting}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            onClick={handleAddServer}
                            disabled={submitting}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {submitting ? t('Adding...') : t('Add Server')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Server Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('Edit MCP Server')}</DialogTitle>
                        <DialogDescription>
                            {t('Update the configuration for')} {selectedServer?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t('Server Name')}</Label>
                            <Input
                                value={formData.name}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">{t('Server name cannot be changed')}</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-url">{t('Server URL')}</Label>
                            <Input
                                id="edit-url"
                                value={formData.url}
                                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                placeholder="http://localhost:8082"
                                className={formErrors.url ? 'border-red-500' : ''}
                            />
                            {formErrors.url && (
                                <p className="text-sm text-red-600">{formErrors.url}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">{t('Description')} ({t('optional')})</Label>
                            <Input
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder={t('My custom MCP server')}
                            />
                        </div>
                        {formErrors.submit && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                <p className="text-sm text-red-600 dark:text-red-400">{formErrors.submit}</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowEditDialog(false)}
                            disabled={submitting}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            onClick={handleEditServer}
                            disabled={submitting}
                        >
                            {submitting ? t('Updating...') : t('Update Server')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Server Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t('Delete MCP Server')}</DialogTitle>
                        <DialogDescription>
                            {t('Are you sure you want to delete')} <strong>{selectedServer?.name}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                {t('This action cannot be undone. The server will be permanently removed from the system.')}
                            </p>
                        </div>
                        {formErrors.submit && (
                            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                <p className="text-sm text-red-600 dark:text-red-400">{formErrors.submit}</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={submitting}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            onClick={handleDeleteServer}
                            disabled={submitting}
                            variant="destructive"
                        >
                            {submitting ? t('Deleting...') : t('Delete Server')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Browse Registry Dialog */}
            <Dialog open={showRegistryDialog} onOpenChange={setShowRegistryDialog}>
                <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            {t('MCP Server Registry')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Browse the official MCP registry for servers with remote (streamable-http) transport.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('Search servers...')}
                                value={registrySearch}
                                onChange={(e) => setRegistrySearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') searchRegistry(registrySearch); }}
                                className="pl-9"
                            />
                        </div>
                        <Button onClick={() => searchRegistry(registrySearch)} disabled={registryLoading}>
                            {registryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Search')}
                        </Button>
                    </div>
                    {registryError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-sm text-red-600 dark:text-red-400">{registryError}</p>
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                        {registryLoading && registryResults.length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : registryResults.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>{t('No servers with remote transport found.')}</p>
                            </div>
                        ) : (
                            registryResults.map((server) => (
                                <div
                                    key={server.name}
                                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium truncate">{server.title || server.name}</h4>
                                                <Badge variant="secondary" className="shrink-0 text-xs">
                                                    v{server.version}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{server.description}</p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                <span className="font-mono truncate">{server.name}</span>
                                                {server.websiteUrl && (
                                                    <a
                                                        href={server.websiteUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 hover:text-foreground"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        {t('Website')}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleRegistryInstall(server)}
                                            disabled={installingServer === server.name}
                                            className="shrink-0"
                                        >
                                            {installingServer === server.name ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                            ) : (
                                                <Download className="h-4 w-4 mr-1" />
                                            )}
                                            {t('Add')}
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Shared Assign to SMART Apps Dialog (MCP servers & Skills) */}
            <AssignAppsDialog
                open={showAssignAppsDialog}
                onOpenChange={setShowAssignAppsDialog}
                resourceName={assigningResourceName}
                resourceLabel={assigningLabel}
                field={assigningField}
                smartApps={smartApps}
                updateApp={updateSmartApp}
                onSaved={fetchSmartApps}
            />

            {/* Add Skill Dialog */}
            <Dialog open={showAddSkillDialog} onOpenChange={setShowAddSkillDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('Add Skill')}</DialogTitle>
                        <DialogDescription>
                            {t('Add an AI skill package that can be assigned to SMART apps.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="skill-name">{t('Skill Name')}</Label>
                            <Input
                                id="skill-name"
                                value={skillFormData.name}
                                onChange={(e) => setSkillFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="health-skillz"
                                className={skillFormErrors.name ? 'border-red-500' : ''}
                            />
                            {skillFormErrors.name && <p className="text-sm text-red-600">{skillFormErrors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="skill-description">{t('Description')}</Label>
                            <Input
                                id="skill-description"
                                value={skillFormData.description}
                                onChange={(e) => setSkillFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder={t('Patient health record access via SMART on FHIR')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="skill-source">{t('Source URL (optional)')}</Label>
                            <Input
                                id="skill-source"
                                value={skillFormData.sourceUrl}
                                onChange={(e) => setSkillFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
                                placeholder="https://github.com/jmandel/health-skillz"
                            />
                        </div>
                        {skillFormErrors.submit && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                <p className="text-sm text-red-600 dark:text-red-400">{skillFormErrors.submit}</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddSkillDialog(false)} disabled={skillSubmitting}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={handleAddSkill} disabled={skillSubmitting}>
                            {skillSubmitting ? t('Adding...') : t('Add Skill')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Browse Skills Registry (skills.sh) Dialog */}
            <Dialog open={showSkillsRegistryDialog} onOpenChange={setShowSkillsRegistryDialog}>
                <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            {t('Skills Registry')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Browse and install skills from the ')}
                            <a href="https://skills.sh" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">skills.sh</a>
                            {t(' public marketplace')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('Search skills... (e.g. agent, web, code)')}
                                value={skillsRegistrySearch}
                                onChange={(e) => setSkillsRegistrySearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') searchSkillsRegistry(skillsRegistrySearch); }}
                                className="pl-9"
                            />
                        </div>
                        <Button onClick={() => searchSkillsRegistry(skillsRegistrySearch)} disabled={skillsRegistryLoading}>
                            {skillsRegistryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Search')}
                        </Button>
                    </div>
                    {skillsRegistryError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-sm text-red-600 dark:text-red-400">{skillsRegistryError}</p>
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                        {skillsRegistryLoading && skillsRegistryResults.length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : skillsRegistryResults.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>{t('No skills found. Try a different search term.')}</p>
                            </div>
                        ) : (
                            skillsRegistryResults.map((skill) => (
                                <div
                                    key={skill.id}
                                    className={`border rounded-lg p-4 transition-colors ${skill.compatible !== false ? 'hover:bg-muted/50' : 'opacity-60 bg-muted/20'}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium truncate">{skill.name}</h4>
                                                {skill.installs > 0 && (
                                                    <Badge variant="secondary" className="shrink-0 text-xs">
                                                        {skill.installs >= 1000 ? `${(skill.installs / 1000).toFixed(1)}K` : skill.installs} installs
                                                    </Badge>
                                                )}
                                                {skill.installed && (
                                                    <Badge variant="outline" className="shrink-0 text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                                                        Installed
                                                    </Badge>
                                                )}
                                                {skill.compatible === false && (
                                                    <Badge variant="outline" className="shrink-0 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                        {skill.incompatibleReason || 'Requires CLI'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{skill.description}</p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                <span className="font-mono truncate">{skill.owner}/{skill.repo}</span>
                                                <a
                                                    href={skill.skillsshUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 hover:text-foreground"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    skills.sh
                                                </a>
                                                <a
                                                    href={skill.githubUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 hover:text-foreground"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    GitHub
                                                </a>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            disabled={skill.installed || skill.compatible === false || installingSkillId === skill.id}
                                            onClick={() => handleSkillsRegistryInstall(skill)}
                                            title={skill.compatible === false ? (skill.incompatibleReason || 'Incompatible — requires CLI access') : undefined}
                                        >
                                            {installingSkillId === skill.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : skill.installed ? (
                                                <>{t('Installed')}</>
                                            ) : skill.compatible === false ? (
                                                <>{t('Incompatible')}</>
                                            ) : (
                                                <>
                                                    <Download className="h-4 w-4 mr-1" />
                                                    {t('Install')}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
