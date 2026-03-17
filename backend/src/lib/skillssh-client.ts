/**
 * skills.sh integration client.
 *
 * Calls the skills.sh public API to browse and search skill packages.
 *
 * API: https://skills.sh/api/search?q=<query>&limit=<n>
 */

const SKILLS_SH_API_BASE = 'https://skills.sh'

// Broad queries for leaderboard browsing (search API requires >=2 chars)
const LEADERBOARD_QUERIES = ['skills', 'agent', 'ai']

export interface SkillsShEntry {
  id: string
  name: string
  description: string
  owner: string
  repo: string
  installs: number
  githubUrl: string
  skillsshUrl: string
  installed: boolean
  /** false if the skill requires CLI/shell access that this agent cannot provide */
  compatible: boolean
  /** Reason the skill is incompatible (undefined when compatible) */
  incompatibleReason?: string
}

/**
 * Patterns in skill id/name that indicate CLI/shell/filesystem dependency.
 * These skills won't work in an HTTP-only agent runtime.
 */
const CLI_INDICATOR_PATTERNS = /\b(bash|shell|terminal|cli|command[- ]?line|exec|subprocess|filesystem|file[- ]?system|docker|kubectl|ssh|git(?!hub)|brew|npm|pip|cargo|make|cmake|ansible|terraform|puppet|vagrant|tmux|screen|systemctl|journalctl|cron|sed|awk|grep|curl|wget|rsync|scp|ffmpeg|imagemagick|pandoc)\b/i

interface SkillsShSearchResult {
  id: string
  name: string
  source?: string
  installs?: number
}

async function searchApi(query: string, limit = 50): Promise<SkillsShSearchResult[]> {
  const url = new URL('/api/search', SKILLS_SH_API_BASE)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'ProxySmart/1.0 skillssh-client' },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`skills.sh API error: ${response.status}`)
  }

  const data = await response.json() as { skills?: SkillsShSearchResult[] }
  return data.skills ?? []
}

function parseEntry(entry: SkillsShSearchResult, installedIds: Set<string>): SkillsShEntry {
  const parts = entry.id.split('/')
  let owner: string, repo: string

  if (parts.length >= 3) {
    owner = parts[0]
    repo = parts[1]
  } else if (entry.source && entry.source.includes('/')) {
    ;[owner, repo] = entry.source.split('/', 2)
  } else {
    owner = parts[0] ?? 'unknown'
    repo = 'unknown'
  }

  const skillSlug = parts[parts.length - 1] ?? entry.name

  // Check if the skill name/id suggests CLI dependency
  const textToCheck = `${entry.id} ${entry.name}`
  const cliMatch = textToCheck.match(CLI_INDICATOR_PATTERNS)
  const compatible = !cliMatch

  return {
    id: entry.id,
    name: entry.name,
    description: `Skill from ${owner}/${repo}`,
    owner,
    repo,
    installs: entry.installs ?? 0,
    githubUrl: `https://github.com/${owner}/${repo}`,
    skillsshUrl: `https://skills.sh/${entry.id}`,
    installed: installedIds.has(skillSlug) || installedIds.has(entry.id),
    compatible,
    ...(!compatible && { incompatibleReason: `Requires CLI tool: ${cliMatch![0]}` }),
  }
}

/**
 * Browse the skills.sh leaderboard (popular skills).
 * Uses multiple broad queries merged + deduped + sorted by installs.
 */
export async function browseLeaderboard(
  installedIds: Set<string>,
  limit = 20,
): Promise<SkillsShEntry[]> {
  const seen = new Map<string, SkillsShEntry>()

  const results = await Promise.allSettled(
    LEADERBOARD_QUERIES.map((q) => searchApi(q, 50)),
  )

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const entry of result.value) {
      if (!seen.has(entry.id)) {
        seen.set(entry.id, parseEntry(entry, installedIds))
      }
    }
  }

  return [...seen.values()]
    .sort((a, b) => b.installs - a.installs)
    .slice(0, limit)
}

/**
 * Search skills.sh by keyword.
 */
export async function searchSkills(
  query: string,
  installedIds: Set<string>,
  limit = 20,
): Promise<SkillsShEntry[]> {
  if (query.trim().length < 2) return []

  const results = await searchApi(query.trim(), limit)
  return results.map((entry) => parseEntry(entry, installedIds)).slice(0, limit)
}
