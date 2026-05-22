import packageJson from '../package.json';

/**
 * Frontend application configuration
 * Combines package.json data with Vite environment variables
 */
export const config = {
    // Application info from package.json
    name: packageJson.name,
    displayName: packageJson.displayName || packageJson.name,
    version: packageJson.version,

    // API configuration - UI connects to backend, not directly to Keycloak
    api: {
        baseUrl: import.meta.env.VITE_API_BASE_URL || window.location.origin,
    },

    // Application settings
    app: {
        baseUrl: import.meta.env.VITE_BASE || '/',
        title: packageJson.displayName || packageJson.name,
        description: packageJson.description || 'Healthcare Administration Platform',
        environment: import.meta.env.MODE || 'development',
        isDevelopment: import.meta.env.DEV,
        isProduction: import.meta.env.PROD,
    },

    // Security
    encryption: {
        secret: import.meta.env.VITE_ENCRYPTION_SECRET,
    }
} as const;

// Type exports for better TypeScript support
export type Config = typeof config;
export type ApiConfig = typeof config.api;
export type AppConfig = typeof config.app;
