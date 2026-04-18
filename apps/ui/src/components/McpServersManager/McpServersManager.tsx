import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../stores/authStore';
import { getStoredToken } from '@/lib/apiClient';
import { useTranslation } from 'react-i18next';
import { Globe, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { McpEndpointSettings } from '../McpEndpointSettings';
import { Button } from '@proxy-smart/shared-ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@proxy-smart/shared-ui';
import type {
  GetAdminAiToolsSkillsRegistryBrowse200ResponseSkillsInner,
  SmartApp,
} from '../../lib/api-client';

import { McpServersTab } from './McpServersTab';
import { SkillsTab } from './SkillsTab';
import {
  AddServerDialog,
  EditServerDialog,
  DeleteServerDialog,
  BrowseRegistryDialog,
  AssignAppsDialogWrapper,
  AddSkillDialog,
  SkillsRegistryDialog,
} from './McpDialogs';
import type { McpServer, McpServerHealth, McpServerTool, McpTemplate, McpTemplatesData, RegistryServer, Skill } from './types';

export function McpServersManager() {
  const { clientApis } = useAuth();
  const { t } = useTranslation();

  // --- Server state ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [servers, setServers] = useState<McpServer[]>([]);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [serverTools, setServerTools] = useState<Record<string, McpServerTool[]>>({});
  const [serverHealth, setServerHealth] = useState<Record<string, McpServerHealth>>({});

  // --- Templates state ---
  const [templates, setTemplates] = useState<McpTemplatesData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [templatesExpanded, setTemplatesExpanded] = useState(false);

  // --- Top-level tab ---
  const [activeToolTab, setActiveToolTab] = useState<string>('mcp-endpoint');

  // --- Skills state ---
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [showAddSkillDialog, setShowAddSkillDialog] = useState(false);
  const [skillFormData, setSkillFormData] = useState({ name: '', description: '', sourceUrl: '' });
  const [skillFormErrors, setSkillFormErrors] = useState<Record<string, string>>({});
  const [skillSubmitting, setSkillSubmitting] = useState(false);

  // --- Skills registry (skills.sh) state ---
  const [showSkillsRegistryDialog, setShowSkillsRegistryDialog] = useState(false);
  const [skillsRegistrySearch, setSkillsRegistrySearch] = useState('');
  const [skillsRegistryResults, setSkillsRegistryResults] = useState<GetAdminAiToolsSkillsRegistryBrowse200ResponseSkillsInner[]>([]);
  const [skillsRegistryLoading, setSkillsRegistryLoading] = useState(false);
  const [skillsRegistryError, setSkillsRegistryError] = useState<string | null>(null);
  const [installingSkillId, setInstallingSkillId] = useState<string | null>(null);

  // --- Memoised helpers ---
  const installedServerNames = useMemo(() => new Set(servers.map((s) => s.name)), [servers]);
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.templates.filter(
      (tmpl) => selectedCategory === 'all' || tmpl.category === selectedCategory,
    );
  }, [templates, selectedCategory]);

  // --- Dialog states ---
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedServer, setSelectedServer] = useState<McpServer | null>(null);

  // --- Form states ---
  const [formData, setFormData] = useState({ name: '', url: '', description: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // --- Registry browse state ---
  const [showRegistryDialog, setShowRegistryDialog] = useState(false);
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryResults, setRegistryResults] = useState<RegistryServer[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [installingServer, setInstallingServer] = useState<string | null>(null);

  // --- SMART Apps assignment state ---
  const [smartApps, setSmartApps] = useState<SmartApp[]>([]);
  const [showAssignAppsDialog, setShowAssignAppsDialog] = useState(false);
  const [assigningResourceName, setAssigningResourceName] = useState<string>('');
  const [assigningField, setAssigningField] = useState<'allowedMcpServerNames' | 'allowedSkillNames'>('allowedMcpServerNames');
  const [assigningLabel, setAssigningLabel] = useState<string>('MCP server');

  /* ─── Data fetching ────────────────────────────────────────────── */

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
      setServerTools((prev) => ({ ...prev, [serverName]: response.tools || [] }));
    } catch (err) {
      console.error(`Failed to fetch tools for ${serverName}:`, err);
    }
  };

  const fetchServerHealth = async (serverName: string) => {
    try {
      const response = await clientApis.mcpManagement.getAdminMcpServersByNameHealth({ name: serverName });
      setServerHealth((prev) => ({ ...prev, [serverName]: response }));
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

  /* ─── Effects ──────────────────────────────────────────────────── */

  useEffect(() => {
    fetchServers();
    fetchTemplates();
    fetchSmartApps();
    fetchSkills();
  }, [fetchServers, fetchTemplates, fetchSmartApps, fetchSkills]);

  /* ─── Handlers ─────────────────────────────────────────────────── */

  const openAssignDialog = (name: string, field: 'allowedMcpServerNames' | 'allowedSkillNames', label: string) => {
    setAssigningResourceName(name);
    setAssigningField(field);
    setAssigningLabel(label);
    setShowAssignAppsDialog(true);
  };

  const updateSmartApp = useCallback(
    async (clientId: string, update: Partial<SmartApp>) => {
      await clientApis.smartApps.putAdminSmartAppsByClientId({ clientId, updateSmartAppRequest: update });
    },
    [clientApis],
  );

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
      if (template.isRemote && template.url) {
        await clientApis.mcpManagement.postAdminMcpServers({
          postAdminMcpServersRequest: { name: template.id, url: template.url, description: template.description },
        });
      } else {
        setFormErrors({
          submit: t('Local MCP servers must be installed manually using: {{command}}', {
            command: template.installCommand || 'npm install',
          }),
        });
        return;
      }
      await fetchServers();
    } catch (err) {
      setFormErrors({ submit: err instanceof Error ? err.message : 'Failed to install template' });
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
        postAdminMcpServersRequest: { name: formData.name, url: formData.url, description: formData.description || undefined },
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
        patchAdminMcpServersByNameRequest: { url: formData.url, description: formData.description || undefined },
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
      await clientApis.mcpManagement.deleteAdminMcpServersByName({ name: selectedServer.name! });
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

  const openEditDialog = (server: McpServer) => {
    setSelectedServer(server);
    setFormData({ name: server.name || '', url: server.url || '', description: server.description || '' });
    setFormErrors({});
    setShowEditDialog(true);
  };

  const openDeleteDialog = (server: McpServer) => {
    setSelectedServer(server);
    setFormErrors({});
    setShowDeleteDialog(true);
  };

  const toggleServerExpansion = async (serverName: string) => {
    if (expandedServer === serverName) {
      setExpandedServer(null);
    } else {
      setExpandedServer(serverName);
      if (!serverTools[serverName]) await fetchServerTools(serverName);
      if (!serverHealth[serverName]) await fetchServerHealth(serverName);
    }
  };

  /* ─── Registry search ──────────────────────────────────────────── */

  const searchRegistry = useCallback(async (query: string) => {
    setRegistryLoading(true);
    setRegistryError(null);
    try {
      const token = await getStoredToken();
      const params = new URLSearchParams({ limit: '50' });
      if (query.trim()) params.set('q', query.trim());
      const response = await fetch(`/admin/mcp-servers/registry/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
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
      const shortName = server.name.includes('/') ? server.name.split('/').pop()! : server.name;
      await clientApis.mcpManagement.postAdminMcpServers({
        postAdminMcpServersRequest: { name: shortName, url: server.url, description: server.title || server.description },
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
    searchRegistry('');
  };

  /* ─── Skills management ────────────────────────────────────────── */

  const handleAddSkill = async () => {
    const errors: Record<string, string> = {};
    if (!skillFormData.name.trim()) errors.name = t('Skill name is required');
    if (Object.keys(errors).length > 0) {
      setSkillFormErrors(errors);
      return;
    }
    setSkillSubmitting(true);
    try {
      if (!clientApis?.aiTools) throw new Error('API not available');
      await clientApis.aiTools.postAdminAiToolsSkills({
        postAdminAiToolsSkillsRequest: {
          name: skillFormData.name,
          description: skillFormData.description,
          sourceUrl: skillFormData.sourceUrl || undefined,
        },
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

  /* ─── Skills.sh registry ───────────────────────────────────────── */

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

  const searchSkillsRegistry = useCallback(
    async (query: string) => {
      if (!clientApis?.aiTools) return;
      setSkillsRegistryLoading(true);
      setSkillsRegistryError(null);
      try {
        if (query.trim().length < 2) {
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
    },
    [clientApis],
  );

  const handleSkillsRegistryInstall = async (skill: GetAdminAiToolsSkillsRegistryBrowse200ResponseSkillsInner) => {
    if (!clientApis?.aiTools) return;
    setInstallingSkillId(skill.id);
    try {
      const shortName = skill.id.includes('/') ? skill.id.split('/').pop()! : skill.name;
      await clientApis.aiTools.postAdminAiToolsSkillsRegistryInstall({
        postAdminAiToolsSkillsRegistryInstallRequest: {
          id: skill.id,
          name: shortName,
          description: skill.description,
          owner: skill.owner,
          repo: skill.repo,
          githubUrl: skill.githubUrl,
          skillsshUrl: skill.skillsshUrl,
        },
      });
      await fetchSkills();
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

  const openAddSkillDialog = () => {
    setSkillFormData({ name: '', description: '', sourceUrl: '' });
    setSkillFormErrors({});
    setShowAddSkillDialog(true);
  };

  /* ─── Render ───────────────────────────────────────────────────── */

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
                <Button onClick={openAddSkillDialog}>
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
          <TabsList className="hidden">
            <TabsTrigger value="mcp-servers" />
            <TabsTrigger value="mcp-endpoint" />
            <TabsTrigger value="skills" />
          </TabsList>

          <TabsContent value="mcp-servers" className="p-6 space-y-6">
            <McpServersTab
              servers={servers}
              loading={loading}
              error={error}
              templates={templates}
              filteredTemplates={filteredTemplates}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              templatesExpanded={templatesExpanded}
              setTemplatesExpanded={setTemplatesExpanded}
              installedServerNames={installedServerNames}
              expandedServer={expandedServer}
              serverTools={serverTools}
              serverHealth={serverHealth}
              smartApps={smartApps}
              submitting={submitting}
              onToggleExpansion={toggleServerExpansion}
              onInstallTemplate={handleInstallTemplate}
              onOpenAdd={openAddDialog}
              onOpenEdit={openEditDialog}
              onOpenDelete={openDeleteDialog}
              onOpenAssign={openAssignDialog}
            />
          </TabsContent>

          <TabsContent value="mcp-endpoint" className="p-6 space-y-6">
            <McpEndpointSettings />
          </TabsContent>

          <TabsContent value="skills" className="p-6 space-y-6">
            <SkillsTab
              skills={skills}
              skillsLoading={skillsLoading}
              smartApps={smartApps}
              onOpenAssign={openAssignDialog}
              onDeleteSkill={handleDeleteSkill}
              onOpenSkillsRegistry={openSkillsRegistryDialog}
              onOpenAddSkill={openAddSkillDialog}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AddServerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        submitting={submitting}
        onSubmit={handleAddServer}
      />

      <EditServerDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        selectedServer={selectedServer}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        submitting={submitting}
        onSubmit={handleEditServer}
      />

      <DeleteServerDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        selectedServer={selectedServer}
        formErrors={formErrors}
        submitting={submitting}
        onSubmit={handleDeleteServer}
      />

      <BrowseRegistryDialog
        open={showRegistryDialog}
        onOpenChange={setShowRegistryDialog}
        registrySearch={registrySearch}
        setRegistrySearch={setRegistrySearch}
        registryResults={registryResults}
        registryLoading={registryLoading}
        registryError={registryError}
        installingServer={installingServer}
        onSearch={searchRegistry}
        onInstall={handleRegistryInstall}
      />

      <AssignAppsDialogWrapper
        open={showAssignAppsDialog}
        onOpenChange={setShowAssignAppsDialog}
        resourceName={assigningResourceName}
        resourceLabel={assigningLabel}
        field={assigningField}
        smartApps={smartApps}
        updateApp={updateSmartApp}
        onSaved={fetchSmartApps}
      />

      <AddSkillDialog
        open={showAddSkillDialog}
        onOpenChange={setShowAddSkillDialog}
        formData={skillFormData}
        setFormData={setSkillFormData}
        formErrors={skillFormErrors}
        submitting={skillSubmitting}
        onSubmit={handleAddSkill}
      />

      <SkillsRegistryDialog
        open={showSkillsRegistryDialog}
        onOpenChange={setShowSkillsRegistryDialog}
        search={skillsRegistrySearch}
        setSearch={setSkillsRegistrySearch}
        results={skillsRegistryResults}
        loading={skillsRegistryLoading}
        error={skillsRegistryError}
        installingSkillId={installingSkillId}
        onSearch={searchSkillsRegistry}
        onInstall={handleSkillsRegistryInstall}
      />
    </div>
  );
}
