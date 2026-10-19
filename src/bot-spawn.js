// Bot spawning utility
// Provides functions to create, track, query, and complete bots with limits.
// Works in both Node (CommonJS) and browser environments.

// UUID generation – use Node's crypto in server, browser's crypto otherwise.
let generateUUID;
if (typeof require === 'function') {
  // Node environment
  try {
    const { randomUUID } = require('node:crypto');
    generateUUID = randomUUID;
  } catch (_) {
    // Fallback if crypto module unavailable
    generateUUID = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
} else if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
  // Browser environment
  generateUUID = crypto.randomUUID.bind(crypto);
} else {
  // Last‑resort polyfill
  generateUUID = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// In‑memory map of bots by their ID
const botRegistry = new Map();

// Configuration limits
const MAX_CONCURRENT_BOTS = 10;
const MAX_NESTING_DEPTH = 5;

/**
 * Compute nesting depth for a new bot based on its parent chain.
 * @param {Object|null} parent Bot object or null.
 * @returns {number} Depth (root bots have depth 1).
 */
function computeDepth(parent) {
  if (!parent) return 1;
  const parentBot = botRegistry.get(parent.id);
  if (!parentBot) return 1; // orphaned parent, treat as root
  return (parentBot.depth || 1) + 1;
}

/**
 * Create a new bot respecting limits.
 * @param {Object} [options]
 * @param {Object|null} [options.parent=null] - Parent bot object (must contain an `id`).
 * @param {string} [options.task=''] - Description of the bot's task.
 * @param {string} [options.color=''] - Bot color (role).
 * @returns {Object} The newly created bot.
 * @throws {Error} If limits are exceeded.
 */
function spawnBot({ parent = null, task = '', color = '' } = {}) {
  if (botRegistry.size >= MAX_CONCURRENT_BOTS) {
    throw new Error('Maximum concurrent bots limit reached');
  }
  const depth = computeDepth(parent);
  if (depth > MAX_NESTING_DEPTH) {
    throw new Error('Maximum bot nesting depth exceeded');
  }
  const id = generateUUID();
  const bot = {
    id,
    parentId: parent ? parent.id : null,
    task,
    color,
    depth,
    createdAt: new Date().toISOString(),
    completed: false,
  };
  botRegistry.set(id, bot);
  return bot;
}

/** Retrieve a bot from the registry by its ID. */
function getBot(id) {
  return botRegistry.get(id);
}

/** Get a snapshot of all bots (read‑only). */
function getAllBots() {
  return Array.from(botRegistry.values()).map(b => ({ ...b }));
}

/** Mark a bot as completed and remove it from the active registry. */
function completeBot(id) {
  const bot = botRegistry.get(id);
  if (!bot) return false;
  bot.completed = true;
  bot.completedAt = new Date().toISOString();
  botRegistry.delete(id);
  return true;
}

/** Query status of a bot (active or completed). */
function getBotStatus(id) {
  const bot = botRegistry.get(id);
  if (bot) return { ...bot, active: true };
  // If not in active map, we cannot retrieve completed info without persistence.
  return null;
}

// Export for Node (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { spawnBot, getBot, getAllBots, completeBot, getBotStatus };
}
// Also expose a global for browsers that load the script via <script src="..."></script>
if (typeof window !== 'undefined') {
  window.botSpawn = { spawnBot, getBot, getAllBots, completeBot, getBotStatus };
}
