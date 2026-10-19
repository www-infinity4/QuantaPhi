// Bot spawning utility
// Provides functions to create bots, track them, and spawn bots based on purpose.
// Each bot gets a unique ID and optional parent relationship.

const { randomUUID } = require('node:crypto');

// In‑memory map of bots by their ID
const botRegistry = new Map();

// Configuration limits
const MAX_ACTIVE_BOTS = 20; // total bots that can exist at once
const MAX_NESTING_DEPTH = 5; // how deep parent‑child chains may go

// Purpose → color mapping (extend as needed)
const PURPOSE_COLOR = {
  read: 'yellow',          // research / information extraction
  import: 'blue',          // handle imports and decisions
  coordinate: 'purple',    // coordinate work and delegate
  identify: 'orange',      // identify questions / missing info
  build: 'green',          // build, repair, test
  review: 'black',         // review results and seal work
};

/**
 * Internal helper to compute nesting depth of a bot.
 * @param {Object|null} parentBot
 * @returns {number} depth (root bot = 1)
 */
function computeDepth(parentBot) {
  let depth = 1;
  let current = parentBot;
  while (current && current.parentId) {
    const next = botRegistry.get(current.parentId);
    if (!next) break;
    depth += 1;
    current = next;
  }
  return depth;
}

/**
 * Create a new bot with explicit options (legacy API).
 * @param {Object} [options]
 * @param {Object|null} [options.parent=null] - Parent bot object (must contain an `id`).
 * @param {string} [options.task=''] - Description of the bot's task.
 * @param {string} [options.color=''] - Bot color (role).
 * @returns {Object} The newly created bot.
 */
function spawnBot({ parent = null, task = '', color = '' } = {}) {
  const id = randomUUID();
  const bot = {
    id,
    parentId: parent ? parent.id : null,
    task,
    color,
  };
  botRegistry.set(id, bot);
  return bot;
}

/**
 * Spawn a bot based on a purpose string, enforcing limits.
 * @param {string} purpose - The job purpose (e.g., "read", "import").
 * @param {string|null} [parentId=null] - Optional parent bot ID.
 * @returns {Object} The created bot.
 * @throws {Error} If limits are exceeded or purpose unknown.
 */
function spawnBotByPurpose(purpose, parentId = null) {
  if (botRegistry.size >= MAX_ACTIVE_BOTS) {
    throw new Error('Maximum active bot count reached');
  }
  const color = PURPOSE_COLOR[purpose];
  if (!color) {
    throw new Error(`Unknown purpose: ${purpose}`);
  }
  const parentBot = parentId ? botRegistry.get(parentId) : null;
  const depth = computeDepth(parentBot);
  if (depth >= MAX_NESTING_DEPTH) {
    throw new Error('Maximum nesting depth exceeded');
  }
  const bot = spawnBot({ parent: parentBot, task: purpose, color });
  return bot;
}

/**
 * Retrieve a bot from the registry by its ID.
 * @param {string} id - Bot identifier.
 * @returns {Object|undefined} The bot object if found.
 */
function getBot(id) {
  return botRegistry.get(id);
}

module.exports = { spawnBot, spawnBotByPurpose, getBot, PURPOSE_COLOR, MAX_ACTIVE_BOTS, MAX_NESTING_DEPTH };
