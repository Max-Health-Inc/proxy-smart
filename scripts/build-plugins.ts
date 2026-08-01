// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * build-plugins.ts — generate the Proxy Smart agent plugins from ONE source tree.
 *
 * Three plugins differ by exactly two things: the endpoint they point at and who is meant to
 * install them. Everything that carries the actual value — the `smart-app-onboarding` and
 * `smart-launch-debugging` skills — is identical across them. Hand-maintaining that meant
 * either three copies of every SKILL.md, or a dependency between plugins that a customer
 * receiving a single self-contained artifact could not resolve. So the skills live once, in
 * `plugins/source/skills*`, and this assembles each plugin around them.
 *
 * A plugin installed over `git-subdir` only ever clones its own subdirectory, which is why
 * sharing by relative path is not an option and copying at build time is.
 *
 * TARGETS (plugins/source/targets.json):
 *   proxy        committed — the Max Health hosted deployment (api.proxy-smart.com)
 *   proxy-beta   committed — the public demo (beta.proxy-smart.com)
 *   proxy-smart  NOT committed — built per customer against their own endpoint
 *
 * The committed two are what the internal marketplace fetches, so they have to exist in the
 * repo; `--check` is the drift guard that stops someone hand-editing generated output.
 * The customer one is a release artifact and is written outside the repo tree by default.
 *
 * Usage:
 *   bun run plugins                                    # write the committed plugins
 *   bun run plugins:check                              # fail if they are out of date (CI)
 *   bun run plugins:customer -- --url https://…        # build the customer artifact
 *   bun run plugins:customer -- --url https://… --out dist/acme
 */
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const SOURCE_DIR = join(REPO_ROOT, 'plugins', 'source')
const PLUGINS_DIR = join(REPO_ROOT, 'plugins')

const AUTHOR = { name: 'Max Health Inc.', url: 'https://maxhealth.tech' }
const REPOSITORY = 'https://github.com/Max-Health-Inc/proxy-smart'
const LICENSE = 'AGPL-3.0-or-later OR LicenseRef-Commercial'
const MARKETPLACE = 'max-health'
const VERSION = '0.1.0'

interface Target {
  committed: boolean
  displayName: string
  /** Completes the README's `# \`name\` — …` heading, so it reads as a clause, not a sentence. */
  headline: string
  /** Codex's shortDescription, which reads as a sentence of its own. */
  tagline: string
  serverKey: string
  url: string
  homepage: string
  /** Directory names under plugins/source to copy in, in order. */
  skills: string[]
  keywords: string[]
  brandColor: string
  category: string
  endpointHeading: string
  endpointBody: string
  description: string
  longDescription: string
}

/** One emitted file: repo-relative path plus its content. */
interface Artifact {
  path: string
  content: string
}

// ── Rendering ────────────────────────────────────────────────────────────────

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function claudeManifest(name: string, t: Target): string {
  return json({
    $schema: 'https://json.schemastore.org/claude-code-plugin-manifest.json',
    name,
    displayName: t.displayName,
    description: t.description,
    version: VERSION,
    author: AUTHOR,
    homepage: t.homepage,
    repository: REPOSITORY,
    license: LICENSE,
    keywords: t.keywords,
  })
}

function codexManifest(name: string, t: Target): string {
  return json({
    name,
    version: VERSION,
    description: t.description,
    author: AUTHOR,
    homepage: t.homepage,
    repository: REPOSITORY,
    license: LICENSE,
    keywords: t.keywords,
    skills: './skills/',
    mcpServers: './.mcp.codex.json',
    interface: {
      displayName: t.displayName,
      shortDescription: t.tagline,
      longDescription: t.longDescription,
      developerName: AUTHOR.name,
      category: t.category,
      websiteURL: t.homepage,
      brandColor: t.brandColor,
    },
  })
}

/**
 * The MCP server config.
 *
 * The customer target gets `${PROXY_SMART_URL:-<their url>}` so the shipped artifact works
 * untouched but can still be repointed; the Max Health targets are fixed, because an env var
 * silently redirecting an assistant away from the deployment named on the tin is a trap, not a
 * feature.
 */
function mcpConfig(name: string, t: Target): string {
  const url = t.committed ? t.url : `\${PROXY_SMART_URL:-${originOf(t.url)}}/mcp`
  return json({ mcpServers: { [t.serverKey]: { type: 'http', url } } })
}

/** `https://host` from a URL, without reaching for `URL` (this runs before any deps). */
function originOf(url: string): string {
  const scheme = url.indexOf('://')
  if (scheme === -1) return url
  const slash = url.indexOf('/', scheme + 3)
  return slash === -1 ? url : url.slice(0, slash)
}

function installSection(name: string, t: Target): string {
  if (!t.committed) {
    return [
      '## Install',
      '',
      'This plugin is shipped to you as a directory rather than through a marketplace. Point your',
      'client at it directly:',
      '',
      '```',
      `claude --plugin-dir ./${name}`,
      '```',
      '',
      'To install it permanently, copy the directory somewhere stable and add it to your',
      '`enabledPlugins`, or commit it to your own infrastructure repo and install from there.',
    ].join('\n')
  }
  return [
    '## Install — Claude Code',
    '',
    '```',
    `/plugin marketplace add Max-Health-Inc/maxhealth.tech`,
    `/plugin install ${name}@${MARKETPLACE}`,
    '```',
    '',
    'Then restart Claude Code (or `/reload-plugins`). Try it locally first with',
    `\`claude --plugin-dir ./plugins/${name}\`.`,
    '',
    '## Install — Codex',
    '',
    '```',
    `codex plugin marketplace add Max-Health-Inc/maxhealth.tech`,
    `codex plugin add ${name}@${MARKETPLACE}`,
    '```',
  ].join('\n')
}

/** One bullet per bundled skill, read from the skill's own frontmatter description. */
async function skillList(t: Target): Promise<string> {
  const lines = ['It bundles:', '']
  for (const { slug, summary } of await skillsFor(t)) {
    lines.push(`- **The \`${slug}\` skill** — ${summary}`)
  }
  return lines.join('\n')
}

async function skillTree(t: Target): Promise<string> {
  const slugs = (await skillsFor(t)).map((s) => s.slug)
  return slugs
    .map((slug, i) => {
      const branch = i === slugs.length - 1 ? '└──' : '├──'
      return `    ${branch} ${slug}/SKILL.md`
    })
    .join('\n')
}

interface SkillInfo {
  slug: string
  summary: string
  sourceDir: string
}

/**
 * The skills a target bundles, in declaration order.
 *
 * The one-line summary comes out of each SKILL.md's own frontmatter `description`, so a README
 * bullet cannot drift from the skill it describes — there is no second place to update.
 */
async function skillsFor(t: Target): Promise<SkillInfo[]> {
  const found: SkillInfo[] = []
  for (const group of t.skills) {
    const groupDir = join(SOURCE_DIR, group)
    for (const slug of (await readdir(groupDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()) {
      const text = await readFile(join(groupDir, slug, 'SKILL.md'), 'utf8')
      found.push({ slug, summary: firstSentence(descriptionOf(text)), sourceDir: join(groupDir, slug) })
    }
  }
  return found
}

/** The `description:` value from YAML frontmatter, with folded-block newlines flattened. */
function descriptionOf(markdown: string): string {
  const match = /^---\n([\s\S]*?)\n---/.exec(markdown)
  if (!match) return ''
  const body = match[1]
  const start = /^description:[ \t]*(>-|>|\|-|\||.*)$/m.exec(body)
  if (!start) return ''
  if (!start[1].startsWith('>') && !start[1].startsWith('|')) return start[1].trim()
  // The block's own lines begin AFTER the newline that terminates `description: >-`; slicing
  // without dropping it makes the first split segment empty and ends the block immediately.
  const after = body.slice(start.index + start[0].length).replace(/^\r?\n/, '')
  const folded: string[] = []
  for (const line of after.split('\n')) {
    // A folded block runs until the first line that is not indented — the next YAML key.
    if (!/^\s+\S/.test(line)) break
    folded.push(line.trim())
  }
  return folded.join(' ')
}

function firstSentence(text: string): string {
  const stop = text.indexOf('. ')
  return stop === -1 ? text : text.slice(0, stop + 1)
}

async function readme(name: string, t: Target): Promise<string> {
  const template = await readFile(join(SOURCE_DIR, 'README.md.tmpl'), 'utf8')
  return template
    .replaceAll('__NAME__', name)
    .replaceAll('__HEADLINE__', t.headline)
    .replaceAll('__SERVER_KEY__', t.serverKey)
    .replaceAll('__URL__', t.url)
    .replaceAll('__ENDPOINT_HEADING__', t.endpointHeading)
    .replaceAll('__ENDPOINT_BODY__', t.endpointBody)
    .replaceAll('__SKILL_LIST__', await skillList(t))
    .replaceAll('__SKILL_TREE__', await skillTree(t))
    .replaceAll('__INSTALL__', installSection(name, t))
}

/** Every generated file for one target, except the copied skill directories. */
async function artifactsFor(name: string, t: Target): Promise<Artifact[]> {
  return [
    { path: '.claude-plugin/plugin.json', content: claudeManifest(name, t) },
    { path: '.codex-plugin/plugin.json', content: codexManifest(name, t) },
    { path: '.mcp.json', content: mcpConfig(name, t) },
    { path: '.mcp.codex.json', content: mcpConfig(name, t) },
    { path: 'README.md', content: await readme(name, t) },
  ]
}

// ── Emitting ─────────────────────────────────────────────────────────────────

/**
 * Write one plugin directory.
 *
 * The skills subtree is removed first rather than merged onto: a skill renamed or dropped in
 * source has to disappear from the output, and copying over the top would leave the old one
 * behind for the marketplace to keep serving.
 */
async function writeTarget(outDir: string, name: string, t: Target): Promise<void> {
  for (const artifact of await artifactsFor(name, t)) {
    const file = join(outDir, artifact.path)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, artifact.content, 'utf8')
  }
  const skillsOut = join(outDir, 'skills')
  await rm(skillsOut, { recursive: true, force: true })
  for (const skill of await skillsFor(t)) {
    await cp(skill.sourceDir, join(skillsOut, skill.slug), { recursive: true })
  }
}

/** Differences between what is on disk and what the source says it should be. */
async function driftFor(outDir: string, name: string, t: Target): Promise<string[]> {
  const drift: string[] = []
  for (const artifact of await artifactsFor(name, t)) {
    const file = join(outDir, artifact.path)
    if (!existsSync(file)) {
      drift.push(`${relative(REPO_ROOT, file)} is missing`)
      continue
    }
    if ((await readFile(file, 'utf8')) !== artifact.content) {
      drift.push(`${relative(REPO_ROOT, file)} differs from the source`)
    }
  }
  for (const skill of await skillsFor(t)) {
    const file = join(outDir, 'skills', skill.slug, 'SKILL.md')
    if (!existsSync(file)) {
      drift.push(`${relative(REPO_ROOT, file)} is missing`)
      continue
    }
    const [want, got] = await Promise.all([
      readFile(join(skill.sourceDir, 'SKILL.md'), 'utf8'),
      readFile(file, 'utf8'),
    ])
    if (want !== got) drift.push(`${relative(REPO_ROOT, file)} differs from plugins/source`)
  }
  return drift
}

// ── Entry point ──────────────────────────────────────────────────────────────

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function loadTargets(): Promise<Record<string, Target>> {
  return JSON.parse(await readFile(join(SOURCE_DIR, 'targets.json'), 'utf8')) as Record<string, Target>
}

/** Build the customer artifact: the target's placeholders resolved against their endpoint. */
async function buildCustomer(rawUrl: string, outArg: string | undefined): Promise<void> {
  const url = rawUrl.replace(/\/+$/, '')
  if (!url.startsWith('https://')) {
    // Not pedantry: the token audience binds to this URL, and an http endpoint would hand
    // bearer tokens to the network.
    throw new Error(`--url must be https, got: ${rawUrl}`)
  }
  const targets = await loadTargets()
  const name = 'proxy-smart'
  const source = targets[name]
  if (!source) throw new Error(`plugins/source/targets.json has no "${name}" target`)

  const mcpUrl = `${url}/mcp`
  const resolve = (text: string): string =>
    text.replaceAll('__CUSTOMER_URL__', mcpUrl).replaceAll('__CUSTOMER_URL_ORIGIN__', url)
  const target: Target = {
    ...source,
    url: mcpUrl,
    homepage: url,
    endpointBody: resolve(source.endpointBody),
  }

  const outDir = outArg ? join(REPO_ROOT, outArg) : join(REPO_ROOT, 'dist', 'plugins', name)
  await rm(outDir, { recursive: true, force: true })
  await writeTarget(outDir, name, target)
  console.log(`wrote ${relative(REPO_ROOT, outDir)}`)
  console.log(`   endpoint: ${mcpUrl}`)
  console.log(`   skills:   ${(await skillsFor(target)).map((s) => s.slug).join(', ')}`)
}

async function main(): Promise<void> {
  const targets = await loadTargets()
  const committed = Object.entries(targets).filter(([, t]) => t.committed)

  const customerUrl = flag('url')
  if (customerUrl) {
    await buildCustomer(customerUrl, flag('out'))
    return
  }

  if (process.argv.includes('--check')) {
    const drift: string[] = []
    for (const [name, target] of committed) {
      drift.push(...(await driftFor(join(PLUGINS_DIR, name), name, target)))
    }
    if (drift.length === 0) {
      console.log(`plugins are up to date (${committed.map(([n]) => n).join(', ')})`)
      return
    }
    console.error(
      'plugin directories are out of date. They are generated from plugins/source — run:\n' +
        '  bun run plugins\n\n' +
        drift.map((line) => `  - ${line}`).join('\n'),
    )
    process.exit(1)
  }

  for (const [name, target] of committed) {
    await writeTarget(join(PLUGINS_DIR, name), name, target)
    console.log(`wrote plugins/${name} (${(await skillsFor(target)).map((s) => s.slug).join(', ')})`)
  }
}

main().catch((error: unknown) => {
  console.error('build-plugins failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
