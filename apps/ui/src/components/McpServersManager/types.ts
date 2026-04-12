import type { SmartApp } from '../../lib/api-client';
import type {
  GetAdminMcpServers200ResponseServersInner,
  GetAdminMcpServersByNameHealth200Response,
  GetAdminMcpServersByNameTools200ResponseToolsInner,
  GetAdminAiToolsSkillsRegistryBrowse200ResponseSkillsInner,
} from '../../lib/api-client';

export type { SmartApp };
export type McpServer = GetAdminMcpServers200ResponseServersInner;
export type McpServerHealth = GetAdminMcpServersByNameHealth200Response;
export type McpServerTool = GetAdminMcpServersByNameTools200ResponseToolsInner;
export type SkillsRegistryEntry = GetAdminAiToolsSkillsRegistryBrowse200ResponseSkillsInner;

export interface McpTemplate {
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

export interface McpTemplatesData {
  templates: McpTemplate[];
  categories: Record<string, { name: string; description: string; icon: string }>;
  version: string;
}

export interface RegistryServer {
  name: string;
  title?: string;
  description: string;
  version: string;
  url: string;
  transport: string;
  websiteUrl?: string;
  publishedAt?: string;
}

export interface Skill {
  name: string;
  description: string;
  sourceUrl?: string;
  type: 'claude-skill' | 'custom';
  installedAt?: string;
  enabled: boolean;
}
