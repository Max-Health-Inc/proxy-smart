#!/usr/bin/env node
/**
 * Build the Consent FHIR IG and generate TypeScript types.
 *
 * Steps:
 *   1. Compile FSH → StructureDefinition JSON (SUSHI)
 *   2. Package into a FHIR .tgz
 *   3. Generate TypeScript & install via babelfhir-ts
 *
 * The generated package lands in the repo-root lib/ folder and is added as a
 * dependency (`maxhealth.consent-generated`), matching how ips-generated and
 * smart-app-launch-generated are wired here.
 */
import { execSync } from "node:child_process";
import { cpSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const fhirDir = resolve(root, "fhir");
const staging = resolve(fhirDir, "fsh-generated", "package");
const resources = resolve(fhirDir, "fsh-generated", "resources");

const PKG_NAME = "maxhealth.consent";

/**
 * Read the IG version from sushi-config.yaml rather than repeating it here.
 * SUSHI names its output after that version, so a hardcoded copy silently tars
 * a path that no longer exists the moment the IG is bumped.
 * `trim()` matters: .gitattributes forces CRLF on *.yaml, so the captured value
 * would otherwise carry a stray carriage return into the filename.
 */
function igVersion() {
  const config = readFileSync(join(fhirDir, "sushi-config.yaml"), "utf-8");
  const match = /^version:\s*(\S+)/m.exec(config);
  if (!match) throw new Error("Could not read `version:` from fhir/sushi-config.yaml");
  return match[1].trim();
}

const PKG_VERSION = igVersion();
const tgzName = `${PKG_NAME}-${PKG_VERSION}.tgz`;

function run(cmd, cwd = root) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

console.log("── Step 1: Compile FSH with SUSHI ──");
run("npx --yes fsh-sushi .", fhirDir);

console.log("\n── Step 2: Package FHIR IG ──");
for (const f of readdirSync(resources).filter((f) => f.endsWith(".json"))) {
  cpSync(join(resources, f), join(staging, f));
}
// Run from fhir/ with relative paths + --force-local so Windows drive letters
// (C:\...) are not misread by tar as a "host:path" remote target.
run(`tar --force-local -czf ${tgzName} -C fsh-generated/package .`, fhirDir);

// babelfhir extracts the tgz into the shared FHIR package cache keyed by
// name@version, and REUSES an existing entry rather than re-extracting. Since
// the IG version only changes on release, a local rebuild would otherwise
// generate from whatever FSH was compiled the first time that version was built
// — silently emitting stale types with no warning. CI never sees this (cold
// runner); local rebuilds always would. Drop the entry so every build extracts
// fresh. It is a cache: babelfhir recreates it from the tarball below.
const cacheEntry = join(homedir(), ".fhir", "packages", `${PKG_NAME}@${PKG_VERSION}`);
rmSync(cacheEntry, { recursive: true, force: true });

console.log("\n── Step 3: Generate TypeScript package (no install) ──");
// --skip-install: pack the generated package for local inspection only. The
// backend consumes the PUBLISHED @max-health-inc/consent-fhir (minted by
// .github/workflows/publish-ig.yml), so we no longer vendor a lib/*.tgz — that
// avoids the tgz/bun.lock integrity drift that used to break cold CI installs.
run(`npx --yes babelfhir-ts@1.5.17 install ./fhir/${tgzName} --skip-install`);

console.log("\n✓ Consent FHIR package generated (lib/). Publish via the publish-ig workflow; do not commit the vendored tgz.");
