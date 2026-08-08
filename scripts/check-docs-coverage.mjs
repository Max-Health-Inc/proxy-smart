#!/usr/bin/env node
// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * How much of the published API surface the docs actually cover.
 *
 * For every publishable workspace package, the exports reachable from its
 * declared entry points are collected (following `export * from` and
 * `export { x } from` within the package), then matched against the prose. A
 * symbol counts as documented when the docs name it.
 *
 * This is a deliberately coarse signal: naming a symbol is not the same as
 * explaining it. It is here to catch the case that actually happens — a package
 * grows an export and no one writes a word about it — not to grade prose.
 *
 * Usage:
 *   node scripts/check-docs-coverage.mjs                  report
 *   node scripts/check-docs-coverage.mjs --list           also list what is missing
 *   node scripts/check-docs-coverage.mjs --min=40         fail below a percentage
 *   node scripts/check-docs-coverage.mjs --json           machine-readable
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, markdownFiles } from './lib/docs-files.mjs';

/** Entry points that are not TypeScript (html, assets) carry no symbols. */
const CODE_ENTRY = /\.(ts|tsx|mts|cts)$/;

function workspaceGlobs() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return pkg.workspaces ?? [];
}

/** Publishable packages only: a private workspace has no public API to document. */
function publishablePackages() {
  const out = [];
  for (const rel of workspaceGlobs()) {
    const manifest = path.join(ROOT, rel, 'package.json');
    if (!fs.existsSync(manifest)) continue;
    const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (pkg.private) continue;

    const entries = new Set();
    const exp = pkg.exports;
    if (typeof exp === 'string') entries.add(exp);
    else if (exp && typeof exp === 'object') {
      for (const value of Object.values(exp)) {
        if (typeof value === 'string') entries.add(value);
        else if (value && typeof value === 'object') {
          for (const nested of Object.values(value)) {
            if (typeof nested === 'string') entries.add(nested);
          }
        }
      }
    }
    if (entries.size === 0 && typeof pkg.main === 'string') entries.add(pkg.main);

    const files = [...entries]
      .filter((e) => CODE_ENTRY.test(e))
      .map((e) => path.join(ROOT, rel, e))
      .filter((f) => fs.existsSync(f));
    if (files.length > 0) out.push({ name: pkg.name, dir: rel, entries: files });
  }
  return out;
}

const DECL = [
  /\bexport\s+(?:declare\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
  /\bexport\s+(?:declare\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g,
  /\bexport\s+(?:declare\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
  /\bexport\s+(?:declare\s+)?(?:type|interface|enum)\s+([A-Za-z_$][\w$]*)/g,
];
const EXPORT_CLAUSE = /\bexport\s*(?:type\s*)?\{([^}]*)\}(?:\s*from\s*['"]([^'"]+)['"])?/g;
const EXPORT_STAR = /\bexport\s*\*\s*(?:as\s+[A-Za-z_$][\w$]*\s*)?from\s*['"]([^'"]+)['"]/g;

/** Resolve a relative import the way the bundler would. */
function resolveRel(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Public symbol names reachable from an entry file. */
function exportsOf(entry, seen = new Set()) {
  const abs = path.resolve(entry);
  if (seen.has(abs) || !fs.existsSync(abs)) return new Set();
  seen.add(abs);

  const src = fs.readFileSync(abs, 'utf8');
  const names = new Set();

  for (const re of DECL) {
    for (const m of src.matchAll(re)) names.add(m[1]);
  }
  for (const m of src.matchAll(EXPORT_CLAUSE)) {
    for (const raw of (m[1] ?? '').split(',')) {
      const name = raw.replace(/\btype\b/, '').trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name) && name !== 'default') names.add(name);
    }
  }
  for (const m of src.matchAll(EXPORT_STAR)) {
    const next = resolveRel(abs, m[1]);
    if (next) for (const n of exportsOf(next, seen)) names.add(n);
  }
  return names;
}

function main() {
  const args = process.argv.slice(2);
  const wantList = args.includes('--list');
  const asJson = args.includes('--json');
  const minArg = args.find((a) => a.startsWith('--min='));
  const min = minArg ? Number(minArg.split('=')[1]) : null;

  const docs = markdownFiles();
  const corpus = docs.map((d) => fs.readFileSync(path.join(ROOT, d), 'utf8')).join('\n');
  // One pass over the prose: the set of identifier-shaped words it contains.
  const mentioned = new Set(corpus.match(/[A-Za-z_$][\w$]*/g) ?? []);

  const packages = publishablePackages();
  if (packages.length === 0) {
    console.error('check-docs-coverage: no publishable workspace packages found.');
    process.exit(1);
  }

  const report = [];
  for (const pkg of packages) {
    const symbols = new Set();
    for (const entry of pkg.entries) for (const n of exportsOf(entry)) symbols.add(n);
    const all = [...symbols].sort();
    const missing = all.filter((s) => !mentioned.has(s));
    const documented = all.length - missing.length;
    report.push({
      package: pkg.name,
      total: all.length,
      documented,
      coverage: all.length === 0 ? 100 : Math.round((documented / all.length) * 1000) / 10,
      missing,
    });
  }

  const total = report.reduce((n, r) => n + r.total, 0);
  const documented = report.reduce((n, r) => n + r.documented, 0);
  const overall = total === 0 ? 100 : Math.round((documented / total) * 1000) / 10;

  if (asJson) {
    console.log(JSON.stringify({ overall, total, documented, packages: report }, null, 2));
  } else {
    console.log(`check-docs-coverage: ${documented}/${total} exported symbols named in the docs — ${overall}%\n`);
    for (const r of [...report].sort((a, b) => a.coverage - b.coverage)) {
      console.log(`  ${String(r.coverage).padStart(5)}%  ${r.package}  (${r.documented}/${r.total})`);
      if (wantList && r.missing.length > 0) {
        console.log(`          undocumented: ${r.missing.join(', ')}`);
      }
    }
    console.log('');
  }

  if (min !== null && overall < min) {
    console.error(`check-docs-coverage: ${overall}% is below the required ${min}%.`);
    process.exit(1);
  }
}

main();
