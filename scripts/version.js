#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to skip entirely during recursive search
const SKIP_DIRS = ['node_modules', 'dist', 'build', '.git', '.cache', 'cache'];

// Private packages that are never published — excluded from version management
const EXCLUDED_PACKAGES = ['consent-app', 'dtr-app', 'shared-ui'];

// Recursively find all package.json files using built-in modules
function findPackageFiles(dir = process.cwd(), found = [], depth = 0) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (SKIP_DIRS.includes(item)) continue;
        if (depth === 0 && EXCLUDED_PACKAGES.includes(item)) continue;
        findPackageFiles(fullPath, found, depth + 1);
      } else if (item === 'package.json') {
        // Convert to relative path from process.cwd()
        const relativePath = path.relative(process.cwd(), fullPath);
        found.push(relativePath || 'package.json');
      }
    }
    
    return found;
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error.message);
    return found;
  }
}

// Dynamically find all package.json files
function getPackagePaths() {
  try {
    const allPackages = findPackageFiles();
    
    // Ensure root package.json is first
    const rootIndex = allPackages.indexOf('package.json');
    if (rootIndex > 0) {
      allPackages.splice(rootIndex, 1);
      allPackages.unshift('package.json');
    }
    
    return allPackages;
  } catch (error) {
    // Fallback to manual list if finding fails
    console.warn('⚠ Warning: Could not auto-detect package.json files, using fallback list');
    return [
      'package.json',
      'backend/package.json', 
      'apps/ui/package.json',
      'scripts/package.json',
      'testing/package.json',
      'testing/alpha/package.json',
      'testing/beta/package.json',
      'testing/production/package.json'
    ];
  }
}

function updateVersion(newVersion) {
  console.log(`Updating all packages to version: ${newVersion}`);
  
  const packagePaths = getPackagePaths();
  console.log(`Found ${packagePaths.length} package.json files:`);
  packagePaths.forEach(p => console.log(`  - ${p}`));
  console.log('');
  
  packagePaths.forEach(packagePath => {
    if (fs.existsSync(packagePath)) {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      packageContent.version = newVersion;
      fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2) + '\n');
      console.log(`✓ Updated ${packagePath}`);
    } else {
      console.warn(`⚠ Warning: ${packagePath} not found`);
    }
  });
}

function getCurrentVersion() {
  const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return rootPackage.version;
}

function incrementVersion(version, type = 'patch') {
  // Remove any pre-release suffixes to get base version
  const baseVersion = version.replace(/-.*$/, '');
  const [major, minor, patch] = baseVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function getBaseVersion(version) {
  // Remove any pre-release suffixes (alpha, beta, etc.)
  return version.replace(/-.*$/, '');
}

function checkConsistency() {
  const rootVersion = getCurrentVersion();
  const packagePaths = getPackagePaths();
  let isConsistent = true;
  
  console.log(`Checking version consistency (root: ${rootVersion})`);
  
  packagePaths.slice(1).forEach(packagePath => {
    if (fs.existsSync(packagePath)) {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (packageContent.version !== rootVersion) {
        console.log(`❌ ${packagePath}: ${packageContent.version} (expected: ${rootVersion})`);
        isConsistent = false;
      } else {
        console.log(`✓ ${packagePath}: ${packageContent.version}`);
      }
    }
  });
  
  return isConsistent;
}

// CLI usage
const args = process.argv.slice(2);
const command = args[0];

if (command === 'sync') {
  // Sync all packages to root version
  const rootVersion = getCurrentVersion();
  updateVersion(rootVersion);
} else if (command === 'bump') {
  // Bump version (patch by default)
  const type = args[1] || 'patch';
  const currentVersion = getCurrentVersion();
  const newVersion = incrementVersion(currentVersion, type);
  updateVersion(newVersion);
} else if (command === 'set') {
  // Set specific version
  const newVersion = args[1];
  if (!newVersion) {
    console.error('Please provide a version number');
    process.exit(1);
  }
  updateVersion(newVersion);
} else if (command === 'check') {
  // Check version consistency
  const isConsistent = checkConsistency();
  if (!isConsistent) {
    console.log('\n❌ Version inconsistency detected. Run "node scripts/version.js sync" to fix.');
    process.exit(1);
  } else {
    console.log('\n✅ All versions are consistent!');
  }
} else if (command === 'base') {
  // Get base version (without pre-release suffixes)
  const currentVersion = getCurrentVersion();
  const baseVersion = getBaseVersion(currentVersion);
  console.log(baseVersion);
} else {
  console.log('Usage:');
  console.log('  node scripts/version.js sync                 - Sync all packages to root version');
  console.log('  node scripts/version.js bump [major|minor|patch] - Bump version (default: patch)');
  console.log('  node scripts/version.js set <version>       - Set specific version');
  console.log('  node scripts/version.js check               - Check version consistency');
  console.log('  node scripts/version.js base                - Get base version (no pre-release suffixes)');
}
