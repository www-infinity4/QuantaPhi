/* Bubbles Voice Gate — deterministic wake-name, conversation-window and mute rules.
 * This module does not listen to microphones or send requests. It only decides
 * whether a recognized utterance is addressed to Bubbles. */
(function (root) {
  'use strict';
  const WAKE = /^(?:(?:hey|hi|hello|okay|ok)\s+)?(?:bubbles(?:\s+ai)?|bubble\s+ai)(?=$|[\s,:.!?])/i;
  const MUTE = /^(?:please\s+)?(?:mute|stop listening|go quiet|be quiet|pause listening|sleep|goodbye)(?:\s+(?:bubbles?|bubble\s+ai))?[\s.!?]*$/i;
  const RESUME = /^(?:wake up|start listening|listen|unmute|are you there)[\s.!?]*$/i;
  function create(options) {
    const keepMs = Math.max(5000, Math.min(90000, Number(options?.followupMs) || 30000));
    let activeUntil = 0;
    let quiet = false;
    let lastMessage = '';
    let lastAt = 0;
    let wake = WAKE;
    function setName(value) {
      const alias = String(value || '').replace(/\s+/g, ' ').trim().slice(0,38);
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      wake = escaped ? new RegExp('^(?:(?:hey|hi|hello|okay|ok)\\s+)?(?:' + escaped + '|bubbles(?:\\s+ai)?|bubble\\s+ai)(?=$|[\\s,:.!?])','i') : WAKE;
    }
    setName(options?.name);
    function accept(raw, time) {
      const now = Number.isFinite(time) ? time : Date.now();
      const text = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 1800);
      if (!text) return {type: 'ignore', reason: 'empty'};
      const matched = text.match(wake);
      const directed = Boolean(matched);
      const content = directed ? text.slice(matched[0].length).replace(/^[\s,:.!?-]+/, '').trim() : text;
      if (!directed && (quiet || now > activeUntil)) return {type: 'ignore', reason: 'wake_name_required'};
      if (MUTE.test(content)) {
        activeUntil = 0; quiet = true;
        return {type: 'mute'};
      }
      if (directed) quiet = false;
      activeUntil = now + keepMs;
      if (!content || RESUME.test(content)) return {type: 'wake'};
      const normalized = content.toLowerCase().replace(/[\s.,!?]+/g, ' ').trim();
      if (normalized === lastMessage && now - lastAt < 2500) return {type: 'ignore', reason: 'duplicate'};
      lastMessage = normalized; lastAt = now;
      return {type: 'message', text: content, directed};
    }
    return {
      accept,
      setName,
      extend: (at) => {if (!quiet && activeUntil) activeUntil = (Number.isFinite(at) ? at : Date.now()) + keepMs;},
      reset: () => {activeUntil = 0; quiet = false; lastMessage = ''; lastAt = 0;},
      get active() {return !quiet && Date.now() <= activeUntil;},
      get quiet() {return quiet;}
    };
  }
  root.BubblesVoiceGate = Object.freeze({create});
})(typeof window !== 'undefined' ? window : globalThis);

