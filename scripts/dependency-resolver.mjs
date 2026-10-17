// scripts/dependency-resolver.mjs
// CLI wrapper for the dependency resolver.
// Reads JSON files from the `data/` directory, resolves dependencies, and writes the
// claimable jobs to `data/claimed.json`.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import resolver from '../utils/dependencyResolver.js';

const { resolveDependencies } = resolver;

// Helper to load JSON safely.
async function loadJson(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Failed to read or parse ${filePath}:`, err.message);
    process.exit(1);
  }
}

async function main() {
  const dataDir = resolve(import.meta.url, '..', '..', 'data');
  const completedPath = resolve(dataDir, 'completed.json');
  const pendingPath = resolve(dataDir, 'pending.json');
  const claimedPath = resolve(dataDir, 'claimed.json');

  console.log('Loading completed jobs from', completedPath);
  const completedJobs = await loadJson(completedPath);

  console.log('Loading pending jobs from', pendingPath);
  const pendingJobs = await loadJson(pendingPath);

  console.log('Resolving dependencies...');
  const claimable = resolveDependencies(completedJobs, pendingJobs);

  console.log(`Found ${claimable.length} claimable job(s). Writing to ${claimedPath}`);
  try {
    await writeFile(claimedPath, JSON.stringify(claimable, null, 2), 'utf8');
    console.log('Claimable jobs written successfully.');
  } catch (err) {
    console.error('Failed to write claimed.json:', err.message);
    process.exit(1);
  }
}

// Execute when run directly.
if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
  main();
}
