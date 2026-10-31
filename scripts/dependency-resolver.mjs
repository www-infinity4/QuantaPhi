// Eligibility report only. Writing this file does not claim a runner lease.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import resolver from '../utils/dependencyResolver.js';

const { resolveDependencies } = resolver;
export const defaultDataDir = fileURLToPath(new URL('../data/', import.meta.url));

async function loadJson(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

export async function run(dataDir = defaultDataDir) {
  const completedJobs = await loadJson(resolve(dataDir, 'completed.json'));
  const pendingJobs = await loadJson(resolve(dataDir, 'pending.json'));
  const eligible = resolveDependencies(completedJobs, pendingJobs);
  // Preserve the legacy output path for consumers; these are eligibility
  // candidates, not authenticated, fenced, or leased claims.
  const claimedPath = resolve(dataDir, 'claimed.json');
  await writeFile(claimedPath, JSON.stringify(eligible, null, 2) + '\n', 'utf8');
  return eligible;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run()
    .then((eligible) => console.log(`Recorded ${eligible.length} eligible jobs; no lease claimed.`))
    .catch((err) => {
      console.error('Dependency eligibility failed:', err.message);
      process.exitCode = 1;
    });
}
