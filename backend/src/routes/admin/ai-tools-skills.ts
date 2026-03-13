import { Elysia, t } from 'elysia'
import { logger } from '../../lib/logger'
import { validateToken } from '@/lib/auth'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { browseLeaderboard, searchSkills, type SkillsShEntry } from '../../lib/skillssh-client'

/**
 * AI Tools — Skills Management
 * 
 * Manages AI skill packages (Claude Skills, custom skills) that can be
 * assigned to SMART apps alongside MCP servers.
 */

// Schemas
const SkillInfo = t.Object({
  name: t.String({ description: 'Skill identifier' }),
  description: t.String({ description: 'Skill description' }),
  sourceUrl: t.Optional(t.String({ description: 'Source URL (e.g. GitHub repo)' })),
  type: t.Union([
    t.Literal('claude-skill'),
    t.Literal('custom')
  ], { description: 'Skill type' }),
  installedAt: t.Optional(t.String({ description: 'ISO timestamp when skill was installed' })),
  enabled: t.Boolean({ description: 'Whether the skill is enabled' })
})

const SkillsListResponse = t.Object({
  skills: t.Array(SkillInfo, { description: 'List of installed skills' }),
  totalSkills: t.Number({ description: 'Total number of skills' })
})

const CreateSkillRequest = t.Object({
  name: t.String({ description: 'Skill name (unique identifier)' }),
  description: t.Optional(t.String({ description: 'Skill description' })),
  sourceUrl: t.Optional(t.String({ description: 'Source URL (e.g. GitHub repo)' }))
})

const SkillsShEntrySchema = t.Object({
  id: t.String({ description: 'Skill ID (owner/repo/name)' }),
  name: t.String({ description: 'Skill name' }),
  description: t.String({ description: 'Skill description' }),
  owner: t.String({ description: 'GitHub owner' }),
  repo: t.String({ description: 'GitHub repository' }),
  installs: t.Number({ description: 'Weekly install count' }),
  githubUrl: t.String({ description: 'GitHub URL' }),
  skillsshUrl: t.String({ description: 'skills.sh URL' }),
  installed: t.Boolean({ description: 'Whether already installed locally' })
})

const SkillsShBrowseResponse = t.Object({
  skills: t.Array(SkillsShEntrySchema, { description: 'Skills from skills.sh' }),
  total: t.Number({ description: 'Total results returned' }),
  source: t.String({ description: 'Data source identifier' })
})

const InstallFromRegistryRequest = t.Object({
  id: t.String({ description: 'Skill ID from skills.sh (owner/repo/name)' }),
  name: t.String({ description: 'Short name for local installation' }),
  description: t.Optional(t.String({ description: 'Skill description' })),
  owner: t.String({ description: 'GitHub owner' }),
  repo: t.String({ description: 'GitHub repo' }),
  githubUrl: t.String({ description: 'GitHub URL' }),
  skillsshUrl: t.String({ description: 'skills.sh URL' })
})

// Types
interface SkillEntry {
  description: string
  sourceUrl?: string
  type: 'claude-skill' | 'custom'
  installedAt: string
  enabled: boolean
}

// ─── File-backed Skills persistence ─────────────────────────────

const SKILLS_JSON_PATH = join(process.cwd(), 'skills.json')

function loadSkills(): Map<string, SkillEntry> {
  try {
    if (!existsSync(SKILLS_JSON_PATH)) return new Map()
    const raw = readFileSync(SKILLS_JSON_PATH, 'utf-8')
    const data = JSON.parse(raw)
    if (!data || typeof data.skills !== 'object') return new Map()
    return new Map(Object.entries(data.skills as Record<string, SkillEntry>))
  } catch (error) {
    logger.server.warn('Failed to load skills.json, starting with empty skill list', {
      error: error instanceof Error ? error.message : String(error)
    })
    return new Map()
  }
}

function saveSkills(skills: Map<string, SkillEntry>): void {
  const data = {
    $schema: 'ai-tools-skills-runtime',
    updatedAt: new Date().toISOString(),
    skills: Object.fromEntries(skills)
  }
  writeFileSync(SKILLS_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

// Load once at module init
const installedSkills = loadSkills()

// Seed default skills on first run
const DEFAULT_SKILLS: Array<{ name: string; entry: SkillEntry }> = [
  {
    name: 'health-skillz',
    entry: {
      description: 'SMART on FHIR patient portal access — Claude Skill for reading health records via SMART App Launch',
      sourceUrl: 'https://github.com/jmandel/health-skillz',
      type: 'claude-skill',
      installedAt: new Date().toISOString(),
      enabled: true
    }
  }
]

let seeded = false
for (const { name, entry } of DEFAULT_SKILLS) {
  if (!installedSkills.has(name)) {
    installedSkills.set(name, entry)
    seeded = true
  }
}
if (seeded) {
  saveSkills(installedSkills)
}

/**
 * Get all installed skills
 */
export function getInstalledSkills(): Array<{ name: string } & SkillEntry> {
  return Array.from(installedSkills.entries()).map(([name, entry]) => ({
    name,
    ...entry
  }))
}

// ─── Routes ─────────────────────────────

export const aiToolsSkillsRoutes = new Elysia({ prefix: '/ai-tools/skills', tags: ['ai-tools'] })

  // List all skills
  .get('/', async ({ headers }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))
    
    const skills = getInstalledSkills()
    return {
      skills,
      totalSkills: skills.length
    }
  }, {
    detail: {
      summary: 'List installed skills',
      description: 'Get list of installed AI skills',
      tags: ['ai-tools']
    },
    response: { 200: SkillsListResponse }
  })

  // Add a skill
  .post('/', async ({ headers, body }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))

    if (installedSkills.has(body.name)) {
      throw new Error(`Skill "${body.name}" already exists`)
    }

    const entry: SkillEntry = {
      description: body.description || '',
      sourceUrl: body.sourceUrl,
      type: body.sourceUrl?.includes('github.com') ? 'claude-skill' : 'custom',
      installedAt: new Date().toISOString(),
      enabled: true
    }

    installedSkills.set(body.name, entry)
    saveSkills(installedSkills)

    logger.admin.info('Skill added', { name: body.name })

    return { name: body.name, ...entry }
  }, {
    body: CreateSkillRequest,
    detail: {
      summary: 'Add a skill',
      description: 'Install a new AI skill package',
      tags: ['ai-tools']
    },
    response: { 200: SkillInfo }
  })

  // Delete a skill
  .delete('/:name', async ({ headers, params }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))

    if (!installedSkills.has(params.name)) {
      throw new Error(`Skill "${params.name}" not found`)
    }

    installedSkills.delete(params.name)
    saveSkills(installedSkills)

    logger.admin.info('Skill deleted', { name: params.name })

    return { success: true, message: `Skill "${params.name}" deleted` }
  }, {
    params: t.Object({ name: t.String() }),
    detail: {
      summary: 'Delete a skill',
      description: 'Remove an installed skill',
      tags: ['ai-tools']
    }
  })

  // ─── skills.sh Registry Browse/Search ───────────────────────────

  // Browse leaderboard (popular skills)
  .get('/registry/browse', async ({ headers, query }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))

    const limit = query.limit ? parseInt(query.limit, 10) : 20
    const installedIds = new Set(Array.from(installedSkills.keys()))

    const skills = await browseLeaderboard(installedIds, limit)
    return {
      skills,
      total: skills.length,
      source: 'skills.sh'
    }
  }, {
    query: t.Object({
      limit: t.Optional(t.String({ description: 'Max results (default 20)' }))
    }),
    detail: {
      summary: 'Browse skills.sh registry',
      description: 'Browse popular skills from the skills.sh public registry',
      tags: ['ai-tools']
    },
    response: { 200: SkillsShBrowseResponse }
  })

  // Search skills.sh
  .get('/registry/search', async ({ headers, query }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))

    const q = query.q || ''
    const limit = query.limit ? parseInt(query.limit, 10) : 20
    const installedIds = new Set(Array.from(installedSkills.keys()))

    const skills = await searchSkills(q, installedIds, limit)
    return {
      skills,
      total: skills.length,
      source: 'skills.sh'
    }
  }, {
    query: t.Object({
      q: t.Optional(t.String({ description: 'Search query (min 2 chars)' })),
      limit: t.Optional(t.String({ description: 'Max results (default 20)' }))
    }),
    detail: {
      summary: 'Search skills.sh registry',
      description: 'Search skills from the skills.sh public registry by keyword',
      tags: ['ai-tools']
    },
    response: { 200: SkillsShBrowseResponse }
  })

  // Install from skills.sh registry
  .post('/registry/install', async ({ headers, body }) => {
    const authHeader = headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')
    await validateToken(authHeader.substring(7))

    if (installedSkills.has(body.name)) {
      throw new Error(`Skill "${body.name}" already exists`)
    }

    const entry: SkillEntry = {
      description: body.description || `Installed from skills.sh: ${body.owner}/${body.repo}`,
      sourceUrl: body.githubUrl,
      type: 'claude-skill',
      installedAt: new Date().toISOString(),
      enabled: true
    }

    installedSkills.set(body.name, entry)
    saveSkills(installedSkills)

    logger.admin.info('Skill installed from skills.sh', { name: body.name, source: body.skillsshUrl })

    return {
      success: true,
      skill: { name: body.name, ...entry }
    }
  }, {
    body: InstallFromRegistryRequest,
    detail: {
      summary: 'Install from skills.sh',
      description: 'Install a skill from the skills.sh public registry',
      tags: ['ai-tools']
    }
  })
