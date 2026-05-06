#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const projectRoot = path.resolve(__dirname, '..');
const backendPublicPath = path.join(projectRoot, 'backend', 'public');

// App definitions: [sourceDistDir, mountPath]
const apps = [
  { name: 'Admin UI',        src: path.join(projectRoot, 'apps', 'ui', 'dist'),                      dest: path.join(backendPublicPath, 'webapp') },
  { name: 'DTR App',         src: path.join(projectRoot, 'apps', 'dtr-app', 'dist'),                  dest: path.join(backendPublicPath, 'apps', 'dtr') },
  { name: 'Consent App',     src: path.join(projectRoot, 'apps', 'consent-app', 'dist'),               dest: path.join(backendPublicPath, 'apps', 'consent') },
  { name: 'Patient Picker',  src: path.join(projectRoot, 'apps', 'patient-picker', 'dist'),            dest: path.join(backendPublicPath, 'apps', 'patient-picker') },
  { name: 'Patient Portal',  src: path.join(projectRoot, 'apps', 'patient-portal', 'dist'),            dest: path.join(backendPublicPath, 'apps', 'patient-portal') },
  { name: 'Docs',            src: path.join(projectRoot, 'docs', '.vitepress', 'dist'),        dest: path.join(backendPublicPath, 'docs') },
];

console.log('🔄 Copying app dists to backend public directory...');

// Ensure the destination directory is recreated from scratch so no stale files linger
function ensureCleanDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`🧹 Cleared existing directory: ${dir}`);
  }

  fs.mkdirSync(dir, { recursive: true });
}

// Function to copy directory recursively
function copyDirectorySync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read the source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectorySync(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // Ensure backend public directory exists
  if (!fs.existsSync(backendPublicPath)) {
    fs.mkdirSync(backendPublicPath, { recursive: true });
    console.log('📁 Created backend public directory');
  }

  for (const app of apps) {
    if (!fs.existsSync(app.src)) {
      console.warn(`⚠️  ${app.name} dist not found at ${app.src} — skipping`);
      continue;
    }

    // Clean destination to guarantee a fresh copy (no stale hashed assets)
    ensureCleanDirectory(app.dest);

    // Copy dist
    copyDirectorySync(app.src, app.dest);

    const copiedFiles = fs.readdirSync(app.dest);
    console.log(`✅ ${app.name} → ${path.relative(projectRoot, app.dest)}/ (${copiedFiles.length} entries)`);
  }

  console.log('🎉 All app dists copied successfully.');

} catch (error) {
  console.error('❌ Error copying app dists:', error.message);
  process.exit(1);
}
