import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Proxy Smart',
  description: 'Healthcare interoperability proxy — SMART App Launch 2.2.0, OAuth 2.0 & MCP',
  base: process.env.VITEPRESS_BASE || '/docs/',
  cleanUrls: true,
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${process.env.VITEPRESS_BASE || '/docs/'}logo.svg` }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Admin UI', link: '/admin-ui/dashboard' },
      { text: 'AI & MCP', link: '/MCP_HTTP_SERVER' },
      { text: 'SMART on FHIR', link: '/SMART_2.2.0_CHECKLIST' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Overview', link: '/' },
        ],
      },
      {
        text: 'Admin UI',
        collapsed: false,
        items: [
          { text: 'Dashboard', link: '/admin-ui/dashboard' },
          { text: 'User Management', link: '/admin-ui/user-management' },
          { text: 'SMART Apps', link: '/admin-ui/smart-apps' },
          { text: 'FHIR Servers', link: '/admin-ui/fhir-servers' },
          { text: 'Scope Management', link: '/admin-ui/scope-management' },
        ],
      },
      {
        text: 'AI & MCP',
        collapsed: false,
        items: [
          { text: 'MCP HTTP Server', link: '/MCP_HTTP_SERVER' },
          { text: 'AI MCP Integration', link: '/AI_MCP_INTEGRATION' },
          { text: 'Backend API Tools', link: '/BACKEND_API_TOOLS' },
          { text: 'MCP HTTP Client', link: '/BACKEND_MCP_HTTP_CLIENT' },
          { text: 'MCP Streamable Client', link: '/BACKEND_MCP_STREAMABLE_CLIENT' },
          { text: 'AI Interactive Actions', link: '/AI_INTERACTIVE_ACTIONS' },
          { text: 'Adding Custom Tools', link: '/ai/ADDING_CUSTOM_TOOLS' },
          { text: 'Action Quick Reference', link: '/ai/action-quick-reference' },
          { text: 'Interactive Actions', link: '/ai/interactive-actions' },
        ],
      },
      {
        text: 'SMART on FHIR',
        collapsed: false,
        items: [
          { text: 'SMART 2.2.0 Checklist', link: '/SMART_2.2.0_CHECKLIST' },
        ],
      },
      {
        text: 'Guides',
        collapsed: false,
        items: [
          { text: 'Version Management', link: '/tutorials/version-management' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Max-Health-Inc/proxy-smart' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Proxy Smart — Healthcare Interoperability Platform',
      copyright: '© 2024–2026 Max Health Inc.',
    },
  },
})
