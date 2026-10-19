// Bot spawning utility
// Provides a function to create a new bot, enforce limits, persist state, and expose a UI panel.
// Each bot gets a unique ID, optional parent relationship, and a color that reflects its role.

const { randomUUID } = require('node:crypto');

// In‑memory map of bots by their ID
const botRegistry = new Map();

// Configuration limits (owner‑approved values)
const MAX_DEPTH = 3; // root = 0, child = 1, …
const MAX_ACTIVE_BOTS = 10;

/**
 * Compute the depth of a bot based on its parent chain.
 * @param {Object|null} parent - Parent bot object or null.
 * @returns {number} Depth (0 for top‑level bots).
 */
function computeDepth(parent) {
  if (!parent) return 0;
  const parentBot = botRegistry.get(parent.id);
  if (!parentBot) return 0;
  return (parentBot.depth || 0) + 1;
}

/**
 * Persist the current list of active bots.
 * Uses IndexedDB when available; falls back to localStorage for small payloads.
 */
async function persistBots() {
  const bots = Array.from(botRegistry.values());
  const payload = JSON.stringify(bots);
  // Try IndexedDB first
  if (typeof indexedDB !== 'undefined') {
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('botCoordinationDB', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('bots')) {
            db.createObjectStore('bots');
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction('bots', 'readwrite');
      const store = tx.objectStore('bots');
      store.put(payload, 'active');
      await new Promise((res, rej) => {
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
      db.close();
      return true;
    } catch (_) {
      // fall back to localStorage
    }
  }
  try {
    localStorage.setItem('botCoordinationActive', payload);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Load persisted bots (if any) and repopulate the registry.
 */
async function loadBots() {
  let payload = null;
  if (typeof indexedDB !== 'undefined') {
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('botCoordinationDB', 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx = db.transaction('bots', 'readonly');
      const store = tx.objectStore('bots');
      const getReq = store.get('active');
      payload = await new Promise((res, rej) => {
        getReq.onsuccess = () => res(getReq.result);
        getReq.onerror = () => rej(getReq.error);
      });
      db.close();
    } catch (_) {
      // ignore – will try localStorage
    }
  }
  if (!payload && typeof localStorage !== 'undefined') {
    payload = localStorage.getItem('botCoordinationActive');
  }
  if (payload) {
    try {
      const bots = JSON.parse(payload);
      bots.forEach(b => botRegistry.set(b.id, b));
    } catch (_) {}
  }
}

/**
 * Render the Bot Coordination Panel UI.
 */
function renderBotPanel() {
  let panel = document.getElementById('botCoordinationPanel');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'botCoordinationPanel';
    panel.setAttribute('aria-label', 'Bot Coordination Panel');
    panel.style.padding = '1rem';
    panel.style.background = 'var(--paper, #fff)';
    panel.style.color = 'var(--ink, #000)';
    panel.style.border = '1px solid var(--line, #ccc)';
    panel.style.borderRadius = '8px';
    panel.style.margin = '1rem 0';
    const title = document.createElement('h2');
    title.textContent = 'Active Bots';
    title.style.marginBottom = '0.5rem';
    panel.appendChild(title);
    const list = document.createElement('div');
    list.id = 'botCoordinationList';
    list.style.display = 'grid';
    list.style.gap = '0.5rem';
    list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    panel.appendChild(list);
    document.body.appendChild(panel);
  }
  const list = document.getElementById('botCoordinationList');
  list.innerHTML = '';
  botRegistry.forEach(bot => {
    const card = document.createElement('div');
    card.className = 'bot-card';
    card.style.padding = '0.5rem';
    card.style.border = '1px solid var(--line, #e0e0e0)';
    card.style.borderRadius = '6px';
    card.style.minHeight = '44px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.justifyContent = 'center';
    card.style.background = 'var(--paper, #f9f9f9)';
    card.innerHTML = `<strong>${bot.color || 'unknown'}</strong>: ${bot.task || '(no task)'}`;
    list.appendChild(card);
  });
}

/**
 * Create a new bot with validation, depth/active limits, and UI registration.
 * @param {Object} [options]
 * @param {Object|null} [options.parent=null] - Parent bot object (must contain an `id`).
 * @param {string} [options.task=''] - Description of the bot's task.
 * @param {string} [options.color=''] - Bot color (role).
 * @param {Object} [options.context={}] - Arbitrary context passed to the child (stored but not interpreted here).
 * @returns {Object|null} The newly created bot, or null if limits are exceeded.
 */
function spawnBot({ parent = null, task = '', color = '', context = {} } = {}) {
  // Enforce active‑bot limit
  if (botRegistry.size >= MAX_ACTIVE_BOTS) {
    console.warn('Maximum active bot count reached');
    return null;
  }
  // Compute depth and enforce nesting limit
  const depth = computeDepth(parent);
  if (depth >= MAX_DEPTH) {
    console.warn('Maximum bot nesting depth reached');
    return null;
  }
  const id = randomUUID();
  const bot = {
    id,
    parentId: parent ? parent.id : null,
    task,
    color,
    depth,
    context,
  };
  botRegistry.set(id, bot);
  // Persist and refresh UI
  persistBots().then(renderBotPanel).catch(() => renderBotPanel());
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

// Initialise persisted state and UI on page load (browser only)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  loadBots().then(() => {
    renderBotPanel();
  });
  // Expose a global API for any color bot to spawn children
  window.botSpawn = {
    /**
     * Spawn a child bot.
     * @param {string|null} parentId - ID of the parent bot (or null for top‑level).
     * @param {string} color - Bot color / role.
     * @param {string} task - Description of the task.
     * @param {Object} [context] - Optional context object.
     * @returns {Object|null} The created bot or null if limits prevent creation.
     */
    spawn(parentId, color, task, context = {}) {
      const parent = parentId ? getBot(parentId) : null;
      return spawnBot({ parent, color, task, context });
    },
    get(id) {
      return getBot(id);
    },
  };
}

module.exports = { spawnBot, getBot };
