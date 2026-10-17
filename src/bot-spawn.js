// Bot spawning utility
// Provides a function to create a new bot and track it in an in‑memory registry.
// Each bot gets a unique ID and optional parent relationship.

const { randomUUID } = require('node:crypto');

// In‑memory map of bots by their ID
const botRegistry = new Map();

/**
 * Create a new bot.
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
  // Store in registry for later lookup
  botRegistry.set(id, bot);
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

module.exports = { spawnBot, getBot };
