#!/usr/bin/env node
// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Typecheck the fenced ts/tsx examples in the docs.
 *
 * Blocks are fragments, so each is wrapped in a module and compiled together.
 * Two kinds of noise are resolved automatically rather than by hand:
 *
 *   undeclared names    an example that says `client.listTools()` without ever
 *                       constructing `client` gets `declare const client: any`,
 *                       read off the compiler's own "Cannot find name".
 *   illustrative import a path like './mcp-http-client' or '@/lib/smart-auth'
 *                       is a stand-in for the reader's own file, so it is
 *                       stubbed. Imports that SHOULD resolve, like
 *                       @proxy-smart/shared-ui, are left alone and checked for
 *                       real. Stubs are reported so they cannot hide.
 *
 * Prose blocks that are shape sketches rather than code opt out:
 *   <!-- doccheck: skip — why -->
 *
 * Usage:
 *   node scripts/check-doc-examples.mjs            typecheck
 *   node scripts/check-doc-examples.mjs --keep     keep .doccheck/ for debugging
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, markdownFiles } from './lib/docs-files.mjs';

const WORK = path.join(ROOT, '.doccheck');
const MAX_PASSES = 6;

/** Diagnostics meaning "the example invented this name". */
const AUTO_DECLARE = new Set(['TS2304', 'TS2552', 'TS18004']);
/** Diagnostic meaning "the example invented this module". */
const AUTO_STUB = 'TS2307';

/** Must be reported, or semantic checking never ran. */
const CANARY = '__canary.ts';
const CANARY_SRC = 'export const n: number = "not a number"\n';

const FENCE = /^```(ts|typescript|tsx)\s*$/;
const SKIP = /<!--\s*doccheck:\s*skip/i;
const DIAG = /^(?:.*[/\\])?([\w.-]+\.tsx?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.*)$/;
const CONFIG_ERROR = /tsconfig\.json\(\d+,\d+\):\s*error/;
const IMPORT_RE = /^[ \t]*import\s(?:(?:type\s)?[\s\S]*?from\s*)?['"][^'"]+['"];?[ \t]*$/gm;

function extractBlocks(doc, source) {
  const lines = source.split(/\r?\n/);
  const blocks = [];
  let i = 0;
  let n = 0;

  while (i < lines.length) {
    const fence = FENCE.exec((lines[i] ?? '').trim());
    if (!fence) {
      i++;
      continue;
    }
    let probe = i - 1;
    while (probe >= 0 && (lines[probe] ?? '').trim().length === 0) probe--;
    const skipped = probe >= 0 && SKIP.test(lines[probe] ?? '');

    const body = [];
    let j = i + 1;
    while (j < lines.length && (lines[j] ?? '').trim() !== '```') {
      body.push(lines[j] ?? '');
      j++;
    }
    if (!skipped && body.join('').trim().length > 0) {
      blocks.push({
        doc,
        startLine: i + 2,
        code: body.join('\n'),
        ext: fence[1] === 'tsx' ? 'tsx' : 'ts',
        id: `${doc.replace(/[^a-zA-Z0-9]/g, '_')}__${n}`,
      });
      n++;
    }
    i = j + 1;
  }
  return blocks;
}

/** Imports must sit at top level, so lift them out of the wrapper. */
function splitImports(code) {
  const imports = [];
  const body = code.replace(IMPORT_RE, (m) => {
    imports.push(m.trim());
    return '';
  });
  return { imports, body };
}

/** The module specifier an import statement targets. */
function specifierOf(stmt) {
  return (
    /from\s*['"]([^'"]+)['"]/.exec(stmt)?.[1] ?? /import\s*['"]([^'"]+)['"]/.exec(stmt)?.[1] ?? null
  );
}

/** Every binding an import statement introduces (default, namespace, named). */
function importBindings(stmt) {
  const names = new Set();
  for (const m of stmt.matchAll(/\{([^}]*)\}/g)) {
    for (const raw of (m[1] ?? '').split(',')) {
      const name = raw.replace(/\btype\b/, '').trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.add(name);
    }
  }
  const ns = /\*\s+as\s+([A-Za-z_$][\w$]*)/.exec(stmt);
  if (ns?.[1]) names.add(ns[1]);
  const dflt = /^import\s+(?:type\s+)?([A-Za-z_$][\w$]*)\s*(?:,|\s+from\b)/.exec(stmt.trim());
  if (dflt?.[1]) names.add(dflt[1]);
  return [...names];
}

/**
 * Emit a block as a compilable module.
 *
 * Module mode is the default: it keeps top-level `export`, type declarations and
 * top-level `await` working, which is how most examples are actually written. A
 * fragment using a bare `return` is illegal at top level, so it falls back to a
 * function wrapper — chosen from the compiler's own TS1108, never guessed.
 */
function emit(block, declare, stubs, wrapped) {
  const { imports, body } = splitImports(block.code);

  // An illustrative module cannot be declared ambiently and then type-imported:
  // a shorthand `declare module` is a namespace, so `import type { X }` from it
  // fails with TS2709. Drop the import and declare its bindings instead.
  const kept = [];
  const synthesised = [];
  for (const stmt of imports) {
    const spec = specifierOf(stmt);
    if (spec && stubs.includes(spec)) synthesised.push(...importBindings(stmt));
    else kept.push(stmt);
  }
  const names = [...new Set([...declare, ...synthesised])];

  const head = [
    `// GENERATED from ${block.doc}:${block.startLine}`,
    '/* eslint-disable */',
    ...kept,
    // Both namespaces: an invented name may be used as a value or as a type,
    // and a bare `declare const` fails the second case with TS2749.
    ...names.flatMap((d) => [`declare const ${d}: any`, `type ${d} = any`]),
    '',
  ];
  const lines = wrapped
    ? [...head, 'export async function __example(): Promise<unknown> {', BODY_MARK, body, '  return undefined', '}']
    : [...head, BODY_MARK, body, '', 'export {}'];
  return lines.filter((s) => s !== '').join('\n');
}

/** Marks where the block's own first line lands, so diagnostics map back to markdown. */
const BODY_MARK = '// __doccheck_body__';

function tsconfig() {
  const ui = path.relative(WORK, path.join(ROOT, 'frontend', 'ui', 'node_modules')).replace(/\\/g, '/');
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'preserve',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        strict: true,
        // Examples omit callback param types; arity and shape are the point here.
        noImplicitAny: false,
        noEmit: true,
        skipLibCheck: true,
        // Backend examples legitimately use process.env, so give them real node
        // and react types rather than stubbing the globals away.
        typeRoots: [`${ui}/@types`],
        types: ['node'],
        // No `baseUrl`: deprecated in TS 6, and TS5101 aborts the run before any
        // type checking. `paths` resolves relative to this file without it.
        paths: {
          '@proxy-smart/*': [`${ui}/@proxy-smart/*`],
          react: [`${ui}/react`],
          'react/*': [`${ui}/react/*`],
          'react-dom': [`${ui}/react-dom`],
          'lucide-react': [`${ui}/lucide-react`],
        },
      },
      include: ['*.ts', '*.tsx', '*.d.ts'],
    },
    null,
    2,
  );
}

function parseDiags(output) {
  const out = [];
  for (const line of output.split(/\r?\n/)) {
    const m = DIAG.exec(line.trim());
    if (m) out.push({ file: m[1], line: Number(m[2]), code: m[4], message: m[5] });
  }
  return out;
}

function runTsc() {
  const tsc = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.exe' : 'tsc');
  try {
    return execFileSync(tsc, ['-p', 'tsconfig.json'], { cwd: WORK, encoding: 'utf8', stdio: 'pipe' });
  } catch (err) {
    return `${err.stdout ?? ''}${err.stderr ?? ''}`;
  }
}

function main() {
  const keep = process.argv.includes('--keep');

  const docs = markdownFiles();
  const blocks = docs.flatMap((d) => extractBlocks(d, fs.readFileSync(path.join(ROOT, d), 'utf8')));
  if (blocks.length === 0) {
    console.error('check-doc-examples: no fenced ts/tsx examples found — the fence pattern is wrong.');
    process.exit(1);
  }

  fs.rmSync(WORK, { recursive: true, force: true });
  fs.mkdirSync(WORK, { recursive: true });
  fs.writeFileSync(path.join(WORK, 'tsconfig.json'), tsconfig(), 'utf8');
  fs.writeFileSync(path.join(WORK, CANARY), CANARY_SRC, 'utf8');

  const byFile = new Map();
  const declared = new Map();
  const stubbed = new Map();
  const wrapped = new Map();
  for (const b of blocks) {
    const name = `${b.id}.${b.ext}`;
    byFile.set(name, b);
    declared.set(name, []);
    stubbed.set(name, []);
    wrapped.set(name, false);
  }

  // Line the wrapper body starts on, per file, to map diagnostics back to markdown.
  const bodyLine = new Map();
  const live = new Set(byFile.keys());

  const writeAll = () => {
    for (const file of live) {
      const block = byFile.get(file);
      const text = emit(block, declared.get(file) ?? [], stubbed.get(file) ?? [], wrapped.get(file));
      bodyLine.set(file, text.split('\n').findIndex((l) => l === BODY_MARK) + 1);
      fs.writeFileSync(path.join(WORK, file), text, 'utf8');
    }
  };

  // Phase 1 — quarantine what cannot PARSE. TypeScript abandons semantic analysis
  // for the whole program when any file fails to parse, so until every file
  // parses, no "cannot find name/module" diagnostic exists to resolve against.
  let raw = '';
  let diags = [];
  writeAll();
  raw = runTsc();
  diags = parseDiags(raw);

  if (CONFIG_ERROR.test(raw)) {
    console.error('check-doc-examples: tsconfig was rejected, so nothing was type checked:\n');
    console.error(raw.trim());
    process.exit(1);
  }

  // Whatever fails to parse is a shape sketch, not code. Quarantine it so the
  // rest of the corpus can be checked, and report it. TS1108 is excluded: a
  // top-level `return` is not a broken example, just a function-body fragment,
  // and it is only reported once the program parses — so it is resolved below.
  const syntaxBad = new Map();
  for (const d of diags) {
    if (/^TS1\d{3}$/.test(d.code) && d.code !== 'TS1108' && live.has(d.file) && !syntaxBad.has(d.file)) {
      syntaxBad.set(d.file, d);
    }
  }
  for (const file of syntaxBad.keys()) {
    live.delete(file);
    fs.rmSync(path.join(WORK, file), { force: true });
  }

  // Phase 2 — resolve what the examples invent: function-body fragments, plus
  // the names and modules they never define.
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    writeAll();
    raw = runTsc();
    diags = parseDiags(raw);

    let added = false;
    for (const d of diags) {
      if (d.code === 'TS1108' && wrapped.get(d.file) === false) {
        wrapped.set(d.file, true);
        added = true;
      } else if (AUTO_DECLARE.has(d.code)) {
        const name = /Cannot find name '([^']+)'/.exec(d.message)?.[1];
        const list = declared.get(d.file);
        if (name && list && !list.includes(name)) {
          list.push(name);
          added = true;
        }
      } else if (d.code === AUTO_STUB) {
        const mod = /Cannot find module '([^']+)'/.exec(d.message)?.[1];
        const list = stubbed.get(d.file);
        if (mod && list && !list.includes(mod)) {
          list.push(mod);
          added = true;
        }
      }
    }
    if (!added) break;
  }

  if (!diags.some((d) => d.file === CANARY)) {
    console.error('check-doc-examples: the canary type error was not reported — semantic checking did not run.\n');
    console.error(raw.trim());
    process.exit(1);
  }

  // Only diagnostics against a generated example file are ours; anything else is
  // a library .d.ts and must not inflate the count.
  const real = diags.filter(
    (d) => live.has(d.file) && !AUTO_DECLARE.has(d.code) && d.code !== AUTO_STUB,
  );
  for (const d of syntaxBad.values()) real.push(d);

  const uniqueStubs = [...new Set([...stubbed.values()].flat())].sort();

  if (real.length === 0) {
    if (!keep) fs.rmSync(WORK, { recursive: true, force: true });
    console.log(
      `check-doc-examples: ${live.size} example(s) across ${docs.length} markdown file(s) typecheck.`,
    );
    if (uniqueStubs.length > 0) {
      console.log(`  stubbed illustrative module(s): ${uniqueStubs.join(', ')}`);
    }
    return;
  }

  const grouped = new Map();
  for (const d of real) {
    const block = byFile.get(d.file);
    if (!block) continue;
    if (!grouped.has(block.doc)) grouped.set(block.doc, []);
    grouped.get(block.doc).push(d);
  }

  console.error(`\ncheck-doc-examples: ${real.length} error(s) in fenced ts/tsx examples:\n`);
  for (const [doc, ds] of [...grouped].sort()) {
    for (const d of ds) {
      const block = byFile.get(d.file);
      if (!block) continue;
      const line = block.startLine + Math.max(0, d.line - (bodyLine.get(d.file) ?? 0) - 1);
      console.error(`  ${doc}:${line}  ${d.code}  ${d.message}`);
    }
    console.error('');
  }
  console.error(`  Generated sources in .doccheck/ (--keep to retain).`);
  console.error('  A block that is a shape sketch, not code, opts out with:');
  console.error('    <!-- doccheck: skip — why -->\n');
  process.exit(1);
}

main();
