/**
 * StarQuest — Authentication & User System
 * Device-local account cache. Durable cross-device storage still requires the
 * server-authoritative account service described in SUPABASE_MIGRATION_PLAN.md.
 */

(function (global) {
  "use strict";

  const STORAGE_KEY = "starquest_users";
  const STORAGE_BACKUP_KEY = "starquest_users_backup_v1";
  const BACKUP_RECOVERY_MARKER_KEY = "starquest_backup_recovery_v2";
  const SESSION_KEY = "starquest_session";
  const GUEST_PROFILE_KEY = "starquest_guest_profile_v1";
  const SYNC_HASH_PREFIX = "sync-";
  const SHARES_PER_COIN = 10;
  const SHARE_ATTEMPT_HISTORY_LIMIT = 250;

  /* ── Secure password hashing using Web Crypto PBKDF2 ── */

  function getCryptoSubtle() {
    return global && global.crypto && global.crypto.subtle ? global.crypto.subtle : null;
  }

  async function hashPasswordAsync(password, username) {
    const enc = new TextEncoder();
    const subtle = getCryptoSubtle();
    if (!subtle) return hashPasswordSync(password, username);
    const keyMaterial = await subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const salt = enc.encode("starquest-v1-" + username.toLowerCase());
    const bits = await subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 },
      keyMaterial,
      256
    );
    return Array.from(new Uint8Array(bits))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function hashPasswordSync(password, username) {
    const input = "starquest-v1-" + username.toLowerCase() + ":" + password;
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return "sync-" + h.toString(16);
  }

  function parseStoredJSON(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function toInt(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.trunc(n);
  }

  function createEventId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function createReceiptHash(parts) {
    const value = parts.map((part) => String(part == null ? "" : part)).join("|");
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return "sq-" + hash.toString(16).padStart(8, "0");
  }

  function dispatch(name, detail) {
    if (typeof document === "undefined") return;
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function normalizeSession(session) {
    if (!session || typeof session !== "object") return null;
    const key = typeof session.key === "string" ? session.key.trim().toLowerCase() : "";
    const username = typeof session.username === "string" ? session.username.trim() : "";
    if (!key || !username) return null;
    return {
      key,
      username,
      signedInAt: toInt(session.signedInAt, Date.now()),
    };
  }

  function loadSession() {
    const raw = parseStoredJSON(SESSION_KEY, null);
    const normalized = normalizeSession(raw);
    if (!normalized) {
      if (raw) localStorage.removeItem(SESSION_KEY);
      return null;
    }
    if (
      !raw ||
      raw.key !== normalized.key ||
      raw.username !== normalized.username ||
      raw.signedInAt !== normalized.signedInAt ||
      Object.keys(raw).length !== 3
    ) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    }
    return normalized;
  }

  function saveSessionForUser(user, signedInAt) {
    if (!user || !user.key || !user.username) return;
    const session = {
      key: user.key,
      username: user.username,
      signedInAt: toInt(signedInAt, Date.now()),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function normalizeHistoryEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const watchedSeconds = Math.max(0, toInt(entry.watchedSeconds, 0));
    const positionSeconds = Math.max(0, toInt(entry.positionSeconds, watchedSeconds));
    const duration = Math.max(0, toInt(entry.duration, 0));
    const completionRate = duration > 0
      ? Math.min(1, watchedSeconds / duration)
      : Math.max(0, Number(entry.completionRate) || 0);
    const startedAt = toInt(entry.startedAt, toInt(entry.watchedAt, Date.now()));
    const lastWatchedAt = toInt(entry.lastWatchedAt, toInt(entry.watchedAt, startedAt));
    const playCount = Math.max(1, toInt(entry.playCount, 1));
    return {
      episodeId: entry.episodeId || "",
      showId: entry.showId || "",
      showTitle: entry.showTitle || "Unknown Show",
      epTitle: entry.epTitle || "Episode",
      thumbnail: entry.thumbnail || "",
      genre: entry.genre || "",
      decade: entry.decade || "",
      tags: Array.isArray(entry.tags) ? entry.tags.slice(0, 20) : [],
      watchedSeconds,
      positionSeconds,
      duration,
      completionRate,
      startedAt,
      lastWatchedAt,
      completed: !!entry.completed || completionRate >= 0.98,
      playCount,
    };
  }

  function normalizeLedgerEntry(tx, fallbackBalance) {
    if (!tx || typeof tx !== "object") return null;
    const amount = toInt(tx.amount, 0);
    return {
      id: tx.id || createEventId("tx"),
      ts: toInt(tx.ts, Date.now()),
      amount,
      reason: tx.reason || "Adjustment",
      referenceId: tx.referenceId || null,
      balance: toInt(tx.balance, fallbackBalance),
      type: tx.type || "adjustment",
      label: tx.label || null,
      commitHash: tx.commitHash || null,
      progressToNextCoin: Math.max(0, toInt(tx.progressToNextCoin, 0)),
      sharesPerCoin: Math.max(0, toInt(tx.sharesPerCoin, 0)),
      contentId: tx.contentId || null,
      companyId: tx.companyId || null,
      actors: Array.isArray(tx.actors) ? tx.actors.slice(0, 50) : [],
      attributionStatus: tx.attributionStatus || null,
      payoutStatus: tx.payoutStatus || null,
    };
  }

  function normalizeUser(user, keyHint) {
    if (!user || typeof user !== "object") return null;
    let username = String(user.username || keyHint || "").trim();
    const key = String(user.key || keyHint || username).trim().toLowerCase();
    if (!key || !username) return null;
    if (key === "kris") username = "kris";
    const passwordHash = String(user.passwordHash || "").trim()
      || (typeof user.password === "string" && user.password
        ? hashPasswordSync(user.password, username)
        : "");

    const tokens = Math.max(0, toInt(user.tokens, toInt(user.starCoins, 0)));
    const ledger = [];
    const sourceLedger = Array.isArray(user.ledger) ? user.ledger : [];
    let balance = tokens;
    sourceLedger.forEach((tx) => {
      const norm = normalizeLedgerEntry(tx, balance);
      if (!norm) return;
      balance = norm.balance;
      ledger.push(norm);
    });

    const history = [];
    const sourceHistory = Array.isArray(user.watchHistory) ? user.watchHistory : [];
    sourceHistory.forEach((entry) => {
      const normalized = normalizeHistoryEntry(entry);
      if (normalized) history.push(normalized);
    });

    const unlockedContent = user.unlockedContent && typeof user.unlockedContent === "object"
      ? user.unlockedContent
      : {};

    const shareEvents = Array.isArray(user.shareEvents) ? user.shareEvents.slice(-250) : [];

    return {
      username,
      key,
      passwordHash,
      joinedAt: toInt(user.joinedAt, Date.now()),
      lastLoginAt: toInt(user.lastLoginAt, Date.now()),
      tokens,
      watchHistory: history.slice(0, 200),
      watchPositions: user.watchPositions && typeof user.watchPositions === "object" ? user.watchPositions : {},
      shareCount: Math.max(0, toInt(user.shareCount, 0)),
      pendingShareCredits: Math.max(0, toInt(user.pendingShareCredits, 0)),
      shareEvents,
      shareCooldownByContent: user.shareCooldownByContent && typeof user.shareCooldownByContent === "object"
        ? user.shareCooldownByContent
        : {},
      shareAttemptIds: user.shareAttemptIds && typeof user.shareAttemptIds === "object"
        ? user.shareAttemptIds
        : {},
      unlockedContent,
      ledger: ledger.slice(-500),
    };
  }

  function loadUsers() {
    let raw;
    const primaryText = localStorage.getItem(STORAGE_KEY);
    try {
      raw = primaryText ? JSON.parse(primaryText) : {};
    } catch (_) {
      raw = parseStoredJSON(STORAGE_BACKUP_KEY, {});
      if (raw && Object.keys(raw).length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
      }
    }
    const normalized = {};
    let changed = false;

    Object.entries(raw || {}).forEach(([storedKey, user]) => {
      const normalizedUser = normalizeUser(user, storedKey);
      if (!normalizedUser) return;
      normalized[normalizedUser.key] = normalizedUser;
      const rawUser = raw[storedKey];
      const sameKey = storedKey === normalizedUser.key;
      const same = sameKey && JSON.stringify(rawUser) === JSON.stringify(normalizedUser);
      if (!same) changed = true;
    });

    /* Recover account activity stranded in the last valid snapshot. This is a
       one-time migration so an intentional later "clear history" stays clear. */
    if (localStorage.getItem(BACKUP_RECOVERY_MARKER_KEY) !== "done") {
      const backup = parseStoredJSON(STORAGE_BACKUP_KEY, {});
      Object.entries(backup || {}).forEach(([storedKey, prior]) => {
        const oldUser = normalizeUser(prior, storedKey);
        const user = oldUser && normalized[oldUser.key];
        if (!user) return;
        const mergedHistory = new Map();
        [...(user.watchHistory || []), ...(oldUser.watchHistory || [])].forEach((entry) => {
          const existing = mergedHistory.get(entry.episodeId);
          if (!existing || Number(entry.lastWatchedAt || 0) > Number(existing.lastWatchedAt || 0)) {
            mergedHistory.set(entry.episodeId, entry);
          }
        });
        user.watchHistory = [...mergedHistory.values()]
          .sort((a, b) => Number(b.lastWatchedAt || 0) - Number(a.lastWatchedAt || 0))
          .slice(0, 200);
        Object.entries(oldUser.watchPositions || {}).forEach(([episodeId, position]) => {
          user.watchPositions[episodeId] = Math.max(
            Math.max(0, toInt(user.watchPositions[episodeId], 0)),
            Math.max(0, toInt(position, 0))
          );
        });
        user.tokens = Math.max(user.tokens, oldUser.tokens);
        user.shareCount = Math.max(user.shareCount, oldUser.shareCount);
        user.pendingShareCredits = Math.max(user.pendingShareCredits, oldUser.pendingShareCredits);
        const events = new Map([...(user.shareEvents || []), ...(oldUser.shareEvents || [])]
          .map((event) => [event.id || event.attemptId, event]));
        user.shareEvents = [...events.values()].slice(-250);
        const ledger = new Map([...(user.ledger || []), ...(oldUser.ledger || [])]
          .map((entry) => [entry.id, entry]));
        user.ledger = [...ledger.values()].slice(-500);
        user.unlockedContent = { ...(oldUser.unlockedContent || {}), ...(user.unlockedContent || {}) };
        changed = true;
      });
      localStorage.setItem(BACKUP_RECOVERY_MARKER_KEY, "done");
    }

    if (Object.keys(raw || {}).length !== Object.keys(normalized).length) changed = true;

    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }

    return normalized;
  }

  function saveUsers(users) {
    const next = JSON.stringify(users);
    const prior = localStorage.getItem(STORAGE_KEY);

    // A large watch history used to make the backup copy hit Android's
    // localStorage quota first, aborting the real share/wallet write. Backups
    // are best-effort; the primary account transaction must remain writable.
    if (prior && prior !== next) {
      try {
        const parsed = JSON.parse(prior);
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length) {
          localStorage.setItem(STORAGE_BACKUP_KEY, prior);
        }
      } catch (_) {
        // Continue to the authoritative primary write.
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      // Free the replaceable snapshot and retry once. Never swallow failure:
      // recordShare must report that a receipt was not committed.
      try { localStorage.removeItem(STORAGE_BACKUP_KEY); } catch (_) {}
      localStorage.setItem(STORAGE_KEY, next);
    }
  }

  function loadGuestProfile() {
    const stored = parseStoredJSON(GUEST_PROFILE_KEY, null);
    return normalizeUser(stored || {
      username: "Guest",
      key: "__guest__",
      joinedAt: Date.now(),
      tokens: 0,
      watchHistory: [],
      watchPositions: {},
      shareCount: 0,
      pendingShareCredits: 0,
      shareEvents: [],
      shareAttemptIds: {},
      unlockedContent: {},
      ledger: [],
    }, "__guest__");
  }

  function saveGuestProfile(profile) {
    const value = JSON.stringify(normalizeUser(profile, "__guest__"));
    try {
      localStorage.setItem(GUEST_PROFILE_KEY, value);
    } catch (_) {
      try { localStorage.removeItem(STORAGE_BACKUP_KEY); } catch (_) {}
      localStorage.setItem(GUEST_PROFILE_KEY, value);
    }
  }

  function mutateViewerProfile(mutator) {
    if (loadSession()) return mutateCurrentUser(mutator);
    const guest = loadGuestProfile();
    const result = mutator(guest, null);
    if (result && result.ok === false) return result;
    try {
      saveGuestProfile(guest);
    } catch (_) {
      return {
        ok: false,
        error: "storage_unavailable",
        message: "Star Coin progress could not be committed on this device.",
      };
    }
    return { ok: true, user: loadGuestProfile(), result };
  }

  function hasGuestProfileData(guest) {
    return !!(guest && (
      guest.tokens || guest.pendingShareCredits || guest.shareEvents.length ||
      guest.watchHistory.length || Object.keys(guest.watchPositions || {}).length
    ));
  }

  function claimGuestProfile(user) {
    const guest = loadGuestProfile();
    const hasGuestData = hasGuestProfileData(guest);
    if (!hasGuestData) return user;

    const mergedHistory = new Map();
    [...(user.watchHistory || []), ...(guest.watchHistory || [])].forEach((entry) => {
      const existing = mergedHistory.get(entry.episodeId);
      if (!existing || Number(entry.lastWatchedAt || 0) > Number(existing.lastWatchedAt || 0)) {
        mergedHistory.set(entry.episodeId, entry);
      }
    });
    user.watchHistory = [...mergedHistory.values()]
      .sort((a, b) => Number(b.lastWatchedAt || 0) - Number(a.lastWatchedAt || 0))
      .slice(0, 200);
    user.watchPositions = { ...(user.watchPositions || {}) };
    Object.entries(guest.watchPositions || {}).forEach(([episodeId, position]) => {
      user.watchPositions[episodeId] = Math.max(
        Math.max(0, toInt(user.watchPositions[episodeId], 0)),
        Math.max(0, toInt(position, 0))
      );
    });
    user.tokens = Math.max(0, toInt(user.tokens, 0)) + Math.max(0, toInt(guest.tokens, 0));
    user.shareCount = Math.max(0, toInt(user.shareCount, 0)) + Math.max(0, toInt(guest.shareCount, 0));
    user.pendingShareCredits = Math.max(0, toInt(user.pendingShareCredits, 0)) + Math.max(0, toInt(guest.pendingShareCredits, 0));
    while (user.pendingShareCredits >= SHARES_PER_COIN) {
      user.pendingShareCredits -= SHARES_PER_COIN;
      user.tokens += 1;
      appendLedger(user, 1, "Guest share progress claimed at sign-in", null, "share_reward", "share reward");
    }
    user.shareEvents = [...(user.shareEvents || []), ...(guest.shareEvents || [])].slice(-250);
    user.ledger = [...(user.ledger || []), ...(guest.ledger || [])].slice(-500);
    user.shareAttemptIds = { ...(user.shareAttemptIds || {}), ...(guest.shareAttemptIds || {}) };
    localStorage.removeItem(GUEST_PROFILE_KEY);
    return normalizeUser(user, user.key);
  }

  function getCurrentUserFromStore() {
    const session = loadSession();
    if (!session) return null;
    const users = loadUsers();
    const user = users[session.key];
    if (!user) {
      clearSession();
      return null;
    }
    /* A short-lived session/storage failure used to send playback and share
       events into the guest profile even while the UI still looked signed in.
       Reclaim that stranded data whenever the real account is available, not
       only during a fresh sign-in. */
    const needsRecovery = hasGuestProfileData(loadGuestProfile());
    const recovered = needsRecovery ? claimGuestProfile(user) : user;
    if (needsRecovery) {
      users[recovered.key] = recovered;
      saveUsers(users);
      saveSessionForUser(recovered, session.signedInAt);
    }
    return recovered;
  }

  function mutateCurrentUser(mutator) {
    const session = loadSession();
    if (!session) {
      return { ok: false, error: "not_signed_in" };
    }

    const users = loadUsers();
    const user = users[session.key];
    if (!user) {
      clearSession();
      return { ok: false, error: "session_not_found" };
    }

    const result = mutator(user, users);
    if (result && result.ok === false) {
      return result;
    }

    users[user.key] = normalizeUser(user, user.key);
    try {
      saveUsers(users);
      saveSessionForUser(users[user.key], session.signedInAt);
    } catch (_) {
      return {
        ok: false,
        error: "storage_unavailable",
        message: "Star Coin progress could not be committed on this device.",
      };
    }
    return { ok: true, user: users[user.key], result };
  }

  function appendLedger(user, amount, reason, referenceId, type, label, metadata) {
    if (!user.ledger) user.ledger = [];
    const meta = metadata && typeof metadata === "object" ? metadata : {};
    const tx = {
      id: createEventId("tx"),
      ts: Date.now(),
      amount,
      reason: reason || "Adjustment",
      referenceId: referenceId || null,
      balance: user.tokens,
      type: type || "adjustment",
      label: label || null,
      commitHash: meta.commitHash || null,
      progressToNextCoin: Math.max(0, toInt(meta.progressToNextCoin, 0)),
      sharesPerCoin: Math.max(0, toInt(meta.sharesPerCoin, 0)),
      contentId: meta.contentId || null,
      companyId: meta.companyId || null,
      actors: Array.isArray(meta.actors) ? meta.actors.slice(0, 50) : [],
      attributionStatus: meta.attributionStatus || null,
      payoutStatus: meta.payoutStatus || null,
    };
    user.ledger.push(tx);
    user.ledger = user.ledger.slice(-500);
    return tx;
  }

  function migrateUsers() {
    const users = loadUsers();
    saveUsers(users);
    const session = loadSession();
    if (session && users[session.key]) {
      saveSessionForUser(users[session.key], session.signedInAt);
    }
  }

  const Auth = {
    currentUser() {
      return getCurrentUserFromStore();
    },

    async register(username, password) {
      const cleanUsername = String(username || "").trim();
      const cleanPassword = String(password || "");
      if (!cleanUsername || cleanUsername.length < 3) {
        return "Username must be at least 3 characters.";
      }
      if (!cleanPassword || cleanPassword.length < 4) {
        return "Password must be at least 4 characters.";
      }
      const users = loadUsers();
      const key = cleanUsername.toLowerCase();
      if (users[key]) {
        return "Username already taken. Please choose another.";
      }

      const passwordHash = getCryptoSubtle()
        ? await hashPasswordAsync(cleanPassword, cleanUsername)
        : hashPasswordSync(cleanPassword, cleanUsername);

      const user = claimGuestProfile(normalizeUser({
        username: cleanUsername,
        key,
        passwordHash,
        joinedAt: Date.now(),
        lastLoginAt: Date.now(),
        tokens: 0,
        watchHistory: [],
        watchPositions: {},
        shareCount: 0,
        pendingShareCredits: 0,
        shareEvents: [],
        shareCooldownByContent: {},
        unlockedContent: {},
        ledger: [],
      }, key));

      users[key] = user;
      saveUsers(users);
      saveSessionForUser(user, Date.now());
      dispatch("starquest:auth-changed", { user: this.currentUser(), action: "register" });
      return this.currentUser();
    },

    async signIn(username, password) {
      const cleanUsername = String(username || "").trim();
      const cleanPassword = String(password || "");
      if (!cleanUsername) {
        return "Please enter your username.";
      }
      if (!cleanPassword) {
        return "Please enter your password.";
      }
      const users = loadUsers();
      const key = cleanUsername.toLowerCase();
      const user = users[key];
      if (!user) {
        return "No account found with that username.";
      }

      const storedHash = String(user.passwordHash || "");
      const hasSubtle = !!getCryptoSubtle();
      const syncHash = hashPasswordSync(cleanPassword, cleanUsername);
      const syncHashLegacy = syncHash.startsWith(SYNC_HASH_PREFIX)
        ? syncHash.slice(SYNC_HASH_PREFIX.length)
        : "";
      const isLegacySyncNoPrefix = !!syncHashLegacy && storedHash === syncHashLegacy;
      const isStoredSyncHash = storedHash.startsWith(SYNC_HASH_PREFIX);
      let asyncHash = "";
      if (hasSubtle && (!isStoredSyncHash || isLegacySyncNoPrefix)) {
        asyncHash = await hashPasswordAsync(cleanPassword, cleanUsername);
      }
      const modernHash = (hasSubtle && (!isStoredSyncHash || isLegacySyncNoPrefix))
        ? asyncHash
        : syncHash;

      const passwordMatches = storedHash === modernHash || isLegacySyncNoPrefix;

      if (!passwordMatches) {
        return "Incorrect password.";
      }

      user.lastLoginAt = Date.now();
      if (isLegacySyncNoPrefix) {
        user.passwordHash = hasSubtle ? asyncHash : syncHash;
      }
      users[user.key] = claimGuestProfile(normalizeUser(user, user.key));
      saveUsers(users);
      saveSessionForUser(users[user.key], Date.now());
      dispatch("starquest:auth-changed", { user: this.currentUser(), action: "signin" });
      return this.currentUser();
    },

    signOut() {
      const user = this.currentUser();
      clearSession();
      dispatch("starquest:auth-changed", { user: null, previousUser: user, action: "signout" });
    },

    saveUser(user) {
      if (!user || !user.key) return;
      const users = loadUsers();
      const existing = users[user.key] || normalizeUser(user, user.key);
      if (!existing) return;
      const merged = normalizeUser(
        {
          ...existing,
          ...user,
          key: existing.key,
          username: existing.username,
          passwordHash: existing.passwordHash,
          joinedAt: existing.joinedAt,
        },
        existing.key
      );
      users[merged.key] = merged;
      saveUsers(users);
      const session = loadSession();
      if (session && session.key === merged.key) {
        saveSessionForUser(merged, session.signedInAt);
      }
    },

    getBalance() {
      const user = this.currentWallet();
      return user ? Math.max(0, toInt(user.tokens, 0)) : 0;
    },

    getLedger() {
      const user = this.currentWallet();
      return user && Array.isArray(user.ledger) ? user.ledger.slice() : [];
    },

    currentWallet() {
      return this.currentUser() || loadGuestProfile();
    },

    canAfford(amount) {
      const value = toInt(amount, NaN);
      if (!Number.isFinite(value) || value <= 0) return false;
      return this.getBalance() >= value;
    },

    addTokens(amount, reason, referenceId, type) {
      const tokenAmount = toInt(amount, NaN);
      if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) return null;
      const result = mutateViewerProfile((user) => {
        user.tokens = Math.max(0, toInt(user.tokens, 0) + tokenAmount);
        const tx = appendLedger(
          user,
          tokenAmount,
          reason || "StarCoin reward",
          referenceId || null,
          type || "adjustment",
          type || "administrator/migration adjustment"
        );
        return { tx };
      });
      if (!result.ok) return null;
      dispatch("starquest:tokens-updated", {
        user: result.user,
        balance: result.user.tokens,
        tx: result.result.tx,
      });
      return result.user;
    },

    spendTokens(amount, reason, referenceId) {
      const tokenAmount = toInt(amount, NaN);
      if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
        return { ok: false, error: "invalid_amount", message: "Amount must be a positive integer." };
      }

      const result = mutateCurrentUser((user) => {
        const balance = Math.max(0, toInt(user.tokens, 0));
        if (balance < tokenAmount) {
          return { ok: false, error: "insufficient_funds", message: "Not enough StarCoins." };
        }
        user.tokens = balance - tokenAmount;
        const tx = appendLedger(
          user,
          -tokenAmount,
          reason || "Spend StarCoins",
          referenceId || null,
          "content_unlock",
          "content unlock"
        );
        return { tx };
      });

      if (!result.ok) {
        return {
          ok: false,
          error: result.error || "not_signed_in",
          message: result.message || "Please sign in.",
        };
      }

      const payload = {
        user: result.user,
        balance: result.user.tokens,
        tx: result.result.tx,
      };
      dispatch("starquest:tokens-updated", payload);
      return {
        ok: true,
        balance: result.user.tokens,
        tx: result.result.tx,
      };
    },

    unlockContent(contentId, cost, title, options) {
      const id = String(contentId || "").trim();
      if (!id) {
        return { ok: false, error: "invalid_content", message: "Invalid content ID." };
      }
      const unlockCost = Math.max(0, toInt(cost, NaN));
      if (!Number.isFinite(unlockCost)) {
        return { ok: false, error: "invalid_cost", message: "Invalid unlock cost." };
      }

      const result = mutateCurrentUser((user) => {
        if (!user.unlockedContent || typeof user.unlockedContent !== "object") {
          user.unlockedContent = {};
        }
        if (user.unlockedContent[id]) {
          return {
            alreadyUnlocked: true,
            unlock: user.unlockedContent[id],
            charged: false,
          };
        }

        if (unlockCost > 0) {
          const balance = Math.max(0, toInt(user.tokens, 0));
          if (balance < unlockCost) {
            return { ok: false, error: "insufficient_funds", message: "Not enough StarCoins." };
          }
          user.tokens = balance - unlockCost;
          const unlockTx = appendLedger(
            user,
            -unlockCost,
            "Unlock: " + (title || id),
            id,
            "content_unlock",
            "content unlock"
          );
          user.lastUnlockLedgerEventId = unlockTx && unlockTx.id;
        }

        const unlock = {
          contentId: id,
          title: title || id,
          cost: unlockCost,
          unlockedAt: Date.now(),
          ledgerEventId: user.lastUnlockLedgerEventId || null,
          rights: options && typeof options === "object" ? options : {},
        };
        user.unlockedContent[id] = unlock;

        return {
          unlock,
          charged: unlockCost > 0,
          alreadyUnlocked: false,
        };
      });

      if (!result.ok) {
        return {
          ok: false,
          error: result.error || "not_signed_in",
          message: result.message || "Please sign in.",
        };
      }

      if (result.result.charged) {
        dispatch("starquest:tokens-updated", {
          user: result.user,
          balance: result.user.tokens,
        });
      }

      dispatch("starquest:content-unlocked", {
        user: result.user,
        contentId: id,
        unlock: result.result.unlock,
        alreadyUnlocked: result.result.alreadyUnlocked,
      });

      return {
        ok: true,
        alreadyUnlocked: !!result.result.alreadyUnlocked,
        unlock: result.result.unlock,
        balance: result.user.tokens,
      };
    },

    isContentUnlocked(contentId) {
      const user = this.currentUser();
      if (!user || !user.unlockedContent) return false;
      return !!user.unlockedContent[contentId];
    },

    getUnlockedContent() {
      const user = this.currentUser();
      if (!user || !user.unlockedContent) return [];
      return Object.values(user.unlockedContent).sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0));
    },

    saveWatchPosition(episodeId, seconds) {
      if (!episodeId) return;
      mutateViewerProfile((user) => {
        if (!user.watchPositions) user.watchPositions = {};
        user.watchPositions[episodeId] = Math.max(0, toInt(seconds, 0));
        return { ok: true };
      });
    },

    getWatchPosition(episodeId) {
      const user = this.currentWallet();
      if (!user || !user.watchPositions) return 0;
      return Math.max(0, toInt(user.watchPositions[episodeId], 0));
    },

    addToHistory(entryOrEpisodeId, showTitle, epTitle, thumbnail, extras) {
      const incoming = (entryOrEpisodeId && typeof entryOrEpisodeId === "object")
        ? { ...entryOrEpisodeId }
        : {
          episodeId: entryOrEpisodeId,
          showTitle,
          epTitle,
          thumbnail,
          ...(extras && typeof extras === "object" ? extras : {}),
        };

      const result = mutateViewerProfile((user) => {
        if (!incoming.episodeId) {
          return { ok: false, error: "invalid_episode", message: "Invalid episode ID." };
        }
        if (!user.watchHistory) user.watchHistory = [];

        const now = Date.now();
        const existing = user.watchHistory.find((h) => h.episodeId === incoming.episodeId);
        const normalized = normalizeHistoryEntry({
          ...existing,
          ...incoming,
          startedAt: existing ? existing.startedAt : now,
          lastWatchedAt: now,
          watchedAt: now,
          playCount: Math.max(1, toInt(existing && existing.playCount, 0) + 1),
        });
        if (!normalized) {
          return { ok: false, error: "invalid_history", message: "Invalid history item." };
        }

        user.watchHistory = user.watchHistory.filter((h) => h.episodeId !== normalized.episodeId);
        user.watchHistory.unshift(normalized);
        user.watchHistory = user.watchHistory.slice(0, 200);
        return { history: user.watchHistory.slice() };
      });

      if (!result.ok) return result;
      dispatch("starquest:history-updated", {
        history: result.result.history,
        user: result.user,
      });
      dispatch("starquest:recommendations-updated", {
        history: result.result.history,
        user: result.user,
      });
      return { ok: true, history: result.result.history, user: result.user };
    },

    updateHistoryProgress(episodeId, positionSeconds, duration, watchedSeconds) {
      if (!episodeId) return;
      const result = mutateViewerProfile((user) => {
        if (!Array.isArray(user.watchHistory)) user.watchHistory = [];
        const idx = user.watchHistory.findIndex((h) => h.episodeId === episodeId);
        if (idx < 0) return { ok: true };
        const item = { ...user.watchHistory[idx] };
        item.positionSeconds = Math.max(0, toInt(positionSeconds, item.positionSeconds || 0));
        item.watchedSeconds = Math.max(item.watchedSeconds || 0, toInt(watchedSeconds, item.watchedSeconds || 0));
        item.duration = Math.max(item.duration || 0, toInt(duration, item.duration || 0));
        item.completionRate = item.duration > 0 ? Math.min(1, item.watchedSeconds / item.duration) : item.completionRate;
        item.completed = item.completionRate >= 0.98;
        item.lastWatchedAt = Date.now();
        user.watchHistory[idx] = normalizeHistoryEntry(item);
        return { ok: true };
      });
      if (result.ok) dispatch("starquest:history-progress", { episodeId, user: result.user });
    },

    clearHistory() {
      const result = mutateViewerProfile((user) => {
        user.watchHistory = [];
        user.watchPositions = {};
        return { history: [] };
      });
      if (!result.ok) return;
      dispatch("starquest:history-updated", { history: [], user: result.user });
      dispatch("starquest:recommendations-updated", { history: [], user: result.user });
    },

    getHistory() {
      const user = this.currentWallet();
      return Array.isArray(user.watchHistory) ? user.watchHistory.slice() : [];
    },

    applyCloudState(state) {
      if (!state || typeof state !== "object") {
        return { ok: false, error: "invalid_cloud_state" };
      }
      const sessionUser = this.currentUser();
      if (!sessionUser) return { ok: false, error: "not_signed_in" };
      const cloudUsername = String(state.username || "").trim().toLowerCase();
      if (!cloudUsername || cloudUsername !== sessionUser.key) {
        return { ok: false, error: "cloud_account_mismatch" };
      }

      const result = mutateViewerProfile((user) => {
        user.tokens = Math.max(0, toInt(state.starCoins, user.tokens || 0));
        user.pendingShareCredits = Math.max(0, Math.min(9, toInt(
          state.pendingShareCredits,
          user.pendingShareCredits || 0
        )));
        user.shareCount = Math.max(0, toInt(state.shareCount, user.shareCount || 0));

        const mergedHistory = new Map();
        [...(user.watchHistory || []), ...(Array.isArray(state.watchHistory) ? state.watchHistory : [])]
          .forEach((entry) => {
            const normalized = normalizeHistoryEntry(entry);
            if (!normalized || !normalized.episodeId) return;
            const existing = mergedHistory.get(normalized.episodeId);
            if (!existing || normalized.lastWatchedAt >= existing.lastWatchedAt) {
              mergedHistory.set(normalized.episodeId, normalized);
            }
          });
        user.watchHistory = [...mergedHistory.values()]
          .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt)
          .slice(0, 200);
        user.watchPositions = user.watchPositions && typeof user.watchPositions === "object"
          ? user.watchPositions
          : {};
        user.watchHistory.forEach((entry) => {
          user.watchPositions[entry.episodeId] = Math.max(
            toInt(user.watchPositions[entry.episodeId], 0),
            toInt(entry.positionSeconds, 0)
          );
        });

        const mergedLedger = new Map();
        [...(user.ledger || []), ...(Array.isArray(state.ledger) ? state.ledger : [])]
          .forEach((entry) => {
            const normalized = normalizeLedgerEntry(entry, user.tokens);
            if (normalized && normalized.id) mergedLedger.set(normalized.id, normalized);
          });
        user.ledger = [...mergedLedger.values()]
          .sort((a, b) => a.ts - b.ts)
          .slice(-500);
        return { ok: true };
      });

      if (!result.ok) return result;
      dispatch("starquest:history-updated", { history: result.user.watchHistory, user: result.user, source: "cloud" });
      dispatch("starquest:tokens-updated", { balance: result.user.tokens, user: result.user, source: "cloud" });
      dispatch("starquest:cloud-synced", { user: result.user });
      return { ok: true, user: result.user };
    },

    recordShare(contentId, options) {
      const id = String(contentId || "").trim();
      if (!id) {
        return { ok: false, error: "invalid_content", message: "Missing content for share." };
      }
      const opts = options && typeof options === "object" ? options : {};
      const now = Date.now();
      const attemptId = String(opts.attemptId || createEventId("share-attempt"));
      // A browser can confirm that its share action completed (native share
      // promise resolved, clipboard write succeeded, or an external composer
      // was opened), but it cannot prove that a recipient viewed the message.
      // Count the confirmed client action toward the visible 1/10 wallet cycle.
      // Completed-watch state remains separate for distributor attribution.
      const qualifiesForProgress = opts.confirmed === true || opts.verified === true;

      const result = mutateViewerProfile((user) => {
        if (!user.shareAttemptIds || typeof user.shareAttemptIds !== "object") user.shareAttemptIds = {};
        if (qualifiesForProgress) {
          if (user.shareAttemptIds[attemptId]) {
            return {
              ok: false,
              error: "duplicate_share_attempt",
              message: "This share attempt was already counted.",
            };
          }
        }

        if (!Array.isArray(user.shareEvents)) user.shareEvents = [];
        const event = {
          id: createEventId("share"),
          attemptId,
          contentId: id,
          receiptHash: createReceiptHash([attemptId, id, now, opts.method || "unknown"]),
          createdAt: now,
          verified: !!opts.verified,
          fullyWatched: !!opts.fullyWatched,
          verificationState: qualifiesForProgress ? "client_confirmed" : "pending_verification",
          status: opts.status || (qualifiesForProgress ? "client_confirmed" : "pending_verification"),
          method: opts.method || "unknown",
          url: opts.url || null,
          showTitle: opts.showTitle || null,
          episodeId: opts.episodeId || null,
          companyId: opts.companyId || "unclaimed:unknown-content",
          actors: Array.isArray(opts.actors) ? opts.actors.slice(0, 50) : [],
          attributionStatus: opts.attributionStatus || "actor_credits_pending",
          payoutEligible: qualifiesForProgress && !!opts.fullyWatched,
          payoutStatus: qualifiesForProgress && !!opts.fullyWatched
            ? "pending_server_commit"
            : "not_yet_eligible",
        };
        user.shareEvents.push(event);
        user.shareEvents = user.shareEvents.slice(-250);
        if (!qualifiesForProgress) {
          return { event, awarded: 0, credited: false };
        }
        user.shareAttemptIds[attemptId] = now;
        const recentAttempts = Object.entries(user.shareAttemptIds)
          .sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, SHARE_ATTEMPT_HISTORY_LIMIT);
        user.shareAttemptIds = Object.fromEntries(recentAttempts);
        user.shareCount = Math.max(0, toInt(user.shareCount, 0)) + 1;
        user.pendingShareCredits = Math.max(0, toInt(user.pendingShareCredits, 0)) + 1;
        appendLedger(
          user,
          0,
          "Confirmed share receipt " + user.pendingShareCredits + "/" + SHARES_PER_COIN,
          event.id,
          "share_credit",
          "share ledger commit",
          {
            commitHash: event.receiptHash,
            progressToNextCoin: user.pendingShareCredits,
            sharesPerCoin: SHARES_PER_COIN,
            contentId: event.contentId,
            companyId: event.companyId,
            actors: event.actors,
            attributionStatus: event.attributionStatus,
            payoutStatus: event.payoutStatus,
          }
        );

        let awarded = 0;
        while (user.pendingShareCredits >= SHARES_PER_COIN) {
          user.pendingShareCredits -= SHARES_PER_COIN;
          awarded += 1;
          user.tokens = Math.max(0, toInt(user.tokens, 0) + 1);
          appendLedger(
            user,
            1,
            "Share reward: 10 completed shares",
            event.id,
            "share_reward",
            "share reward"
          );
        }

        return { event, awarded, credited: true };
      });

      if (!result.ok) {
        return {
          ok: false,
          error: result.error || "not_signed_in",
          message: result.message || "Please sign in.",
          retryInMs: result.retryInMs || 0,
        };
      }

      dispatch("starquest:share-progress", {
        user: result.user,
        lifetimeShareCount: result.user.shareCount,
        progressToNextCoin: result.user.pendingShareCredits,
        sharesPerCoin: SHARES_PER_COIN,
        awarded: result.result.awarded,
        event: result.result.event,
      });

      if (result.result.awarded > 0) {
        dispatch("starquest:tokens-updated", {
          user: result.user,
          balance: result.user.tokens,
        });
      }

      return {
        ok: true,
        awarded: result.result.awarded,
        credited: !!result.result.credited,
        event: result.result.event,
        lifetimeShareCount: result.user.shareCount,
        progressToNextCoin: result.user.pendingShareCredits,
        sharesPerCoin: SHARES_PER_COIN,
        balance: result.user.tokens,
      };
    },

    recordWatchProgress(contentId, seconds, metadata) {
      const id = String(contentId || "").trim();
      if (!id) {
        return { ok: false, error: "invalid_content", message: "Missing content ID." };
      }
      const step = Number(seconds);
      if (!Number.isFinite(step) || step <= 0) {
        return { ok: false, error: "invalid_seconds", message: "Watch progress must be positive." };
      }
      const meta = metadata && typeof metadata === "object" ? metadata : {};

      const result = mutateViewerProfile((user) => {
        const addSeconds = Math.floor(step);
        if (addSeconds <= 0) {
          return { ok: false, error: "invalid_seconds", message: "Watch progress must be positive." };
        }

        if (meta.episodeId) {
          if (!user.watchPositions || typeof user.watchPositions !== "object") user.watchPositions = {};
          user.watchPositions[meta.episodeId] = Math.max(
            0,
            toInt(meta.positionSeconds, user.watchPositions[meta.episodeId] || 0)
          );
          const historyIndex = Array.isArray(user.watchHistory)
            ? user.watchHistory.findIndex((item) => item.episodeId === meta.episodeId)
            : -1;
          if (historyIndex >= 0) {
            const item = { ...user.watchHistory[historyIndex] };
            item.positionSeconds = Math.max(0, toInt(meta.positionSeconds, item.positionSeconds || 0));
            item.watchedSeconds = Math.max(item.watchedSeconds || 0, toInt(meta.watchedSeconds, item.watchedSeconds || 0));
            item.duration = Math.max(item.duration || 0, toInt(meta.duration, item.duration || 0));
            item.completionRate = item.duration > 0 ? Math.min(1, item.watchedSeconds / item.duration) : item.completionRate;
            item.completed = item.completionRate >= 0.98;
            item.lastWatchedAt = Date.now();
            user.watchHistory[historyIndex] = normalizeHistoryEntry(item);
          }
        }

        return { recordedSeconds: addSeconds, rewardCount: 0 };
      });

      if (!result.ok) {
        return {
          ok: false,
          error: result.error || "watch_progress_failed",
          message: result.message || "Watch progress could not be saved.",
        };
      }

      dispatch("starquest:watch-progress", {
        user: result.user,
        contentId: id,
        watchedSeconds: meta.watchedSeconds || 0,
      });

      return {
        ok: true,
        awarded: 0,
        events: [],
        watchedSeconds: meta.watchedSeconds || 0,
        balance: result.user.tokens,
      };
    },

    SHARES_PER_COIN,
    SHARE_ATTEMPT_HISTORY_LIMIT,
  };

  migrateUsers();

  global.StarQuestAuth = Auth;
})(window);

