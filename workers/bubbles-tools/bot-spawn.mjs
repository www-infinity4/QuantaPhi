// Bot‑spawn API handler (ESM)
// Expects a request object with a `json()` method that resolves to {purpose:string, parentId?:string}
// Returns a plain object suitable for JSON serialization.

import { spawnBotByPurpose } from '../../src/bot-spawn.js';

/**
 * Handle POST /api/bot/spawn
 * @param {Object} req - Minimal request representation.
 * @returns {Promise<Object>} Response payload {status, body}.
 */
export async function handleSpawn(req) {
  try {
    const payload = await req.json();
    const { purpose, parentId } = payload;
    const bot = spawnBotByPurpose(purpose, parentId ?? null);
    return { status: 200, body: bot };
  } catch (e) {
    return { status: 400, body: { error: e.message } };
  }
}
