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
import { cpSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const fhirDir = resolve(root, "fhir");
const staging = resolve(fhirDir, "fsh-generated", "package");
const resources = resolve(fhirDir, "fsh-generated", "resources");

const PKG_NAME = "maxhealth.consent";
const PKG_VERSION = "0.1.0";
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

console.log("\n── Step 3: Generate TypeScript package (no install) ──");
// --skip-install: pack the generated package for local inspection only. The
// backend consumes the PUBLISHED @max-health-inc/consent-fhir (minted by
// .github/workflows/publish-ig.yml), so we no longer vendor a lib/*.tgz — that
// avoids the tgz/bun.lock integrity drift that used to break cold CI installs.
run(`npx --yes babelfhir-ts@1.5.17 install ./fhir/${tgzName} --skip-install`);

console.log("\n✓ Consent FHIR package generated (lib/). Publish via the publish-ig workflow; do not commit the vendored tgz.");
