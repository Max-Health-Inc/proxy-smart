#!/usr/bin/env node
// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Badge and link checker for the repository's markdown.
 *
 * Badges rot silently: a version badge keeps advertising a release from months
 * ago, a workflow badge points at a renamed file and renders "no status", a nav
 * link survives the heading it pointed at. None of that fails a build, so this
 * check does.
 *
 * Everything is derived, never hardcoded: the expected version comes from the
 * root package.json, the owner/repo from its `repository` field, and the valid
 * workflow names from .github/workflows.
 *
 * Usage:
 *   node scripts/check-badges.mjs            static checks only (CI default)
 *   node scripts/check-badges.mjs --online   also HEAD every badge URL
 *   node scripts/check-badges.mjs --json     machine-readable findings
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, markdownFiles, lineOf } from './lib/docs-files.mjs';

const SHIELDS = 'img.shields.io';
const ACTIONS_BADGE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/actions\/workflows\/([^/]+)\/badge\.svg/;
const SEMVER = /\d+\.\d+\.\d+/g;

/**
 * Path prefixes a document declares as produced at deploy time rather than
 * living in the repo, e.g. `<!-- linkcheck: external /compliance/ -->`.
 *
 * Scoped to the prefixes a page names, so it cannot silently excuse an ordinary
 * broken link elsewhere in that page.
 */
function externalPrefixes(source) {
  const prefixes = [];
  for (const m of source.matchAll(/<!--\s*linkcheck:\s*external\s+([^>]+?)\s*-->/gi)) {
    prefixes.push(...m[1].split(/\s+/).filter(Boolean));
  }
  return prefixes;
}

/** GitHub heading slug: lowercase, drop punctuation/emoji, spaces to hyphens. */
function slugify(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function headingSlugs(source) {
  const slugs = new Set();
  for (const m of source.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) slugs.add(slugify(m[1]));
  return slugs;
}

/**
 * Pull every image (markdown + HTML) and every link out of a markdown source.
 * HTML images carry the enclosing <a href> when there is one, since that is
 * what identifies a version badge.
 */
function extract(source) {
  const images = [];
  const links = [];

  for (const m of source.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)) {
    images.push({ alt: m[1], url: m[2], href: null, line: lineOf(source, m.index) });
  }
  for (const m of source.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>\s*<img\s+([^>]+)>/g)) {
    const attrs = m[2];
    images.push({
      alt: /alt="([^"]*)"/.exec(attrs)?.[1] ?? null,
      url: /src="([^"]+)"/.exec(attrs)?.[1] ?? '',
      href: m[1],
      line: lineOf(source, m.index),
    });
  }
  // Bare <img> not wrapped in a link.
  for (const m of source.matchAll(/<img\s+([^>]+)>/g)) {
    const url = /src="([^"]+)"/.exec(m[1])?.[1] ?? '';
    if (images.some((i) => i.url === url && i.line === lineOf(source, m.index))) continue;
    images.push({
      alt: /alt="([^"]*)"/.exec(m[1])?.[1] ?? null,
      url,
      href: null,
      line: lineOf(source, m.index),
    });
  }
  for (const m of source.matchAll(/<a\s+[^>]*href="([^"]+)"/g)) {
    links.push({ href: m[1], line: lineOf(source, m.index) });
  }
  for (const m of source.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)) {
    links.push({ href: m[1], line: lineOf(source, m.index) });
  }
  return { images, links };
}

function isBadge(url) {
  return url.includes(SHIELDS) || ACTIONS_BADGE.test(url);
}

/** A badge advertising THIS project's release, as opposed to a spec version. */
function isVersionBadge(image) {
  return /^version$/i.test(image.alt ?? '') || /\/releases\/?$/.test(image.href ?? '');
}

/**
 * Resolve an in-repo link the way VitePress serves it: extensionless targets
 * mean `<name>.md` or `<name>/index.md`, and a leading slash is a site route
 * relative to the docs root rather than the filesystem root.
 */
function resolveLink(file, href) {
  const bare = href.split('#')[0].split('?')[0];
  if (bare === '') return true;
  const base = bare.startsWith('/')
    ? path.join(ROOT, file.startsWith('docs/') ? 'docs' : '.')
    : path.dirname(path.join(ROOT, file));
  const target = path.resolve(base, bare.replace(/^\//, ''));
  return [target, `${target}.md`, path.join(target, 'index.md')].some((c) => fs.existsSync(c));
}

/**
 * Run every static rule over one document.
 * @returns {Array<{file:string,line:number,rule:string,message:string}>}
 */
function checkDoc(file, source, ctx) {
  const findings = [];
  const add = (line, rule, message) => findings.push({ file, line, rule, message });
  const { images, links } = extract(source);
  const slugs = headingSlugs(source);
  const external = externalPrefixes(source);

  for (const image of images) {
    if (!isBadge(image.url)) continue;

    if (image.alt === null || image.alt.trim() === '') {
      add(image.line, 'badge-no-alt', `badge has no alt text: ${image.url}`);
    }

    // Only STATIC shields badges can drift. A dynamic endpoint (github/v/release)
    // reads the version at render time, which is the preferred fix, so leave it be.
    if (isVersionBadge(image) && image.url.includes('/badge/')) {
      const found = image.url.match(SEMVER) ?? [];
      if (!found.includes(ctx.version)) {
        add(
          image.line,
          'version-drift',
          `hardcoded version badge says ${found.join(', ') || '(none)'} but package.json is ${ctx.version}` +
            ' — prefer a dynamic img.shields.io/github/v/release badge',
        );
      }
    }

    const wf = ACTIONS_BADGE.exec(image.url);
    if (wf) {
      const [, owner, repo, workflow] = wf;
      if (!ctx.workflows.has(workflow)) {
        add(image.line, 'workflow-missing', `badge points at .github/workflows/${workflow}, which does not exist`);
      }
      if (`${owner}/${repo}`.toLowerCase() !== ctx.slug.toLowerCase()) {
        add(image.line, 'workflow-foreign-repo', `badge points at ${owner}/${repo}, but this repo is ${ctx.slug}`);
      }
    }
  }

  for (const link of links) {
    const href = link.href;
    if (href.startsWith('#')) {
      const slug = href.slice(1).toLowerCase();
      if (slug && !slugs.has(slug)) {
        add(link.line, 'dead-anchor', `${href} matches no heading in this document`);
      }
      continue;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) continue;
    if (external.some((p) => href.startsWith(p))) continue;
    if (!resolveLink(file, href)) {
      add(link.line, 'dead-relative-link', `${href} does not exist`);
    }
  }

  return findings;
}

/**
 * Prove the extractor still works. A README reformat that breaks the regexes
 * would otherwise make this script report a clean run over zero badges, which
 * is the one failure mode a checker must never have.
 */
const CANARY_DOC = `# Canary

<p align="center">
  <a href="https://example.invalid/releases"><img src="https://img.shields.io/badge/v0.0.0-alpha-blue.svg" alt="Version"></a>
  <a href="https://github.com/who/what/actions/workflows/nope.yml"><img src="https://github.com/who/what/actions/workflows/nope.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/no-alt-red.svg">
</p>

<a href="#missing-heading">nav</a>
<a href="does-not-exist.md">file</a>
`;

const CANARY_RULES = [
  'version-drift',
  'workflow-missing',
  'workflow-foreign-repo',
  'badge-no-alt',
  'dead-anchor',
  'dead-relative-link',
];

function runCanary(ctx) {
  const rules = new Set(checkDoc('__canary.md', CANARY_DOC, ctx).map((f) => f.rule));
  return CANARY_RULES.filter((r) => !rules.has(r));
}

async function checkOnline(urls) {
  const findings = [];
  await Promise.all(
    [...urls].map(async ({ url, file, line }) => {
      try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        if (!res.ok) findings.push({ file, line, rule: 'badge-unreachable', message: `${url} -> HTTP ${res.status}` });
      } catch (err) {
        findings.push({ file, line, rule: 'badge-unreachable', message: `${url} -> ${err.message}` });
      }
    }),
  );
  return findings;
}

async function main() {
  const args = process.argv.slice(2);
  const online = args.includes('--online');
  const asJson = args.includes('--json');

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const slug = /github\.com\/([^/]+\/[^/.]+)/.exec(pkg.repository?.url ?? '')?.[1];
  if (!slug) {
    console.error('check-badges: package.json has no GitHub repository url to validate against.');
    process.exit(1);
  }

  const workflowDir = path.join(ROOT, '.github', 'workflows');
  const ctx = {
    version: (pkg.version ?? '').replace(/-.*$/, ''),
    slug,
    workflows: new Set(fs.existsSync(workflowDir) ? fs.readdirSync(workflowDir) : []),
  };

  const missed = runCanary(ctx);
  if (missed.length > 0) {
    console.error('check-badges: the canary document did not trigger these rules:');
    for (const r of missed) console.error(`  - ${r}`);
    console.error('\nThe parser has stopped matching real badges. Fix it before trusting a pass.');
    process.exit(1);
  }

  const files = markdownFiles();
  const findings = [];
  const urls = [];
  let badgeCount = 0;

  for (const file of files) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    findings.push(...checkDoc(file, source, ctx));
    for (const image of extract(source).images) {
      if (!isBadge(image.url)) continue;
      badgeCount++;
      urls.push({ url: image.url, file, line: image.line });
    }
  }

  if (online) findings.push(...(await checkOnline(urls)));

  if (asJson) {
    console.log(JSON.stringify({ badges: badgeCount, files: files.length, findings }, null, 2));
    process.exit(findings.length > 0 ? 1 : 0);
  }

  if (findings.length === 0) {
    console.log(`check-badges: ${badgeCount} badge(s) across ${files.length} markdown file(s) are consistent.`);
    return;
  }

  console.error(`\ncheck-badges: ${findings.length} problem(s):\n`);
  for (const f of findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
    console.error(`  ${f.file}:${f.line}  ${f.rule}  ${f.message}`);
  }
  console.error('');
  process.exit(1);
}

main();
