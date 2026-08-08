// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/** Shared markdown discovery for the doc checks (check-badges, check-doc-examples). */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Generated, vendored or published trees: their markdown is not ours to fix.
// Matched per path SEGMENT, so nested copies (packages/*/node_modules) are caught.
const SKIP_SEGMENTS = new Set([
  'node_modules', 'dist', 'build', 'coverage', '.git', 'lib', '.doccheck',
]);
const SKIP_PREFIXES = [path.join('backend', 'public')];

/** Every markdown file we own, as repo-relative POSIX paths. */
export function markdownFiles(dir = ROOT, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_SEGMENTS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    const rel = path.relative(ROOT, abs);
    if (SKIP_PREFIXES.some((s) => rel === s || rel.startsWith(`${s}${path.sep}`))) continue;
    if (entry.isDirectory()) markdownFiles(abs, found);
    else if (entry.name.toLowerCase().endsWith('.md')) found.push(rel.split(path.sep).join('/'));
  }
  return found;
}

/** 1-based line number of a character offset. */
export function lineOf(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}
