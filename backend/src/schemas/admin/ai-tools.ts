/**
 * AI Tools & Skills schemas
 * 
 * Centralized TypeBox schemas for AI skill management CRUD operations.
 */
import { t } from 'elysia'

// ── Core entities ────────────────────────────────────────────────────────────

export const SkillInfo = t.Object({
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

export const SkillsShEntrySchema = t.Object({
  id: t.String({ description: 'Skill ID (owner/repo/name)' }),
  name: t.String({ description: 'Skill name' }),
  description: t.String({ description: 'Skill description' }),
  owner: t.String({ description: 'GitHub owner' }),
  repo: t.String({ description: 'GitHub repository' }),
  installs: t.Number({ description: 'Weekly install count' }),
  githubUrl: t.String({ description: 'GitHub URL' }),
  skillsshUrl: t.String({ description: 'skills.sh URL' }),
  installed: t.Boolean({ description: 'Whether already installed locally' }),
  compatible: t.Boolean({ description: 'Whether compatible with HTTP-only agent runtime' }),
  incompatibleReason: t.Optional(t.String({ description: 'Why the skill is incompatible' })),
})

// ── Request schemas ──────────────────────────────────────────────────────────

export const CreateSkillRequest = t.Object({
  name: t.String({ description: 'Skill name (unique identifier)' }),
  description: t.Optional(t.String({ description: 'Skill description' })),
  sourceUrl: t.Optional(t.String({ description: 'Source URL (e.g. GitHub repo)' }))
})

export const InstallFromRegistryRequest = t.Object({
  id: t.String({ description: 'Skill ID from skills.sh (owner/repo/name)' }),
  name: t.String({ description: 'Short name for local installation' }),
  description: t.Optional(t.String({ description: 'Skill description' })),
  owner: t.String({ description: 'GitHub owner' }),
  repo: t.String({ description: 'GitHub repo' }),
  githubUrl: t.String({ description: 'GitHub URL' }),
  skillsshUrl: t.String({ description: 'skills.sh URL' })
})

// ── Response schemas ─────────────────────────────────────────────────────────

export const SkillsListResponse = t.Object({
  skills: t.Array(SkillInfo, { description: 'List of installed skills' }),
  totalSkills: t.Number({ description: 'Total number of skills' })
})

export const SkillsShBrowseResponse = t.Object({
  skills: t.Array(SkillsShEntrySchema, { description: 'Skills from skills.sh' }),
  total: t.Number({ description: 'Total results returned' }),
  source: t.String({ description: 'Data source identifier' })
})

// ── Inferred types ───────────────────────────────────────────────────────────

export type SkillInfoType = typeof SkillInfo.static
export type SkillsListResponseType = typeof SkillsListResponse.static
