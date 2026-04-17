export type SmartAppType = 'backend-service' | 'standalone-app' | 'ehr-launch' | 'agent';
export type AuthenticationType = 'asymmetric' | 'symmetric' | 'none';
export type ServerAccessType = 'all-servers' | 'selected-servers' | 'user-person-servers';
export type McpAccessType = 'none' | 'all-mcp-servers' | 'selected-mcp-servers';

export function isInteractive(appType: SmartAppType | undefined): boolean {
    if (!appType) return false;
    return appType === 'standalone-app' || appType === 'ehr-launch';
}

export function requiresRedirectUri(appType: SmartAppType | undefined): boolean {
    return isInteractive(appType);
}

export function hasFixedAuthType(appType: SmartAppType | undefined): boolean {
    if (!appType) return false;
    return appType === 'backend-service' || appType === 'agent';
}

export function getFixedAuthType(appType: SmartAppType | undefined): AuthenticationType {
    if (appType === 'backend-service' || appType === 'agent') {
        return 'asymmetric';
    }
    return 'asymmetric';
}

export function getAuthTypeDescription(appType: SmartAppType | undefined): string {
    if (appType === 'agent') {
        return 'Agents require private key JWT for secure autonomous authentication';
    }
    if (appType === 'backend-service') {
        return 'Backend services require private key JWT for secure server-to-server communication';
    }
    return '';
}

export function getRedirectUriHelperText(appType: SmartAppType | undefined): string {
    if (appType === 'backend-service') {
        return 'Backend services use client credentials flow - no redirect URI needed';
    }
    if (appType === 'agent') {
        return 'Agents use client credentials flow - no interactive login or redirect URI needed';
    }
    return '';
}

export function isAgent(appType: SmartAppType | undefined): boolean {
    return appType === 'agent';
}

export function getServerAccessTypeDescription(serverAccessType: ServerAccessType): string {
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
}

export function getMcpAccessTypeDescription(mcpAccessType: McpAccessType): string {
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
}
