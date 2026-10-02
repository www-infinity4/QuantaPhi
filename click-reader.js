/* Quant Click Reader: include on each participating site after its wallet bridge. */
(function (global) {
  'use strict';
  const KEY = 'quant-click-reader-pending-v1';
  const ENDPOINT = 'https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/events';
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch (_) { return [] } };
  const save = items => { try { localStorage.setItem(KEY, JSON.stringify(items.slice(-100))) } catch (_) {} };
  let busy = false, configuration = null;
  async function flush() {
    if (busy || !configuration) return;
    const bridge = global.StarQuestCloudLedger;
    if (!bridge?.authenticatedFetch) return;
    busy = true;
    try {
      for (const event of read()) {
        try {
          const response = await bridge.authenticatedFetch(ENDPOINT, {method:'POST',body:event});
          if (!response.ok) break;
          save(read().filter(item => item.eventId !== event.eventId));
        } catch (_) { break }
      }
    } finally { busy = false }
  }
  function track(detail) {
    if (!configuration) return;
    const context = configuration.getContext?.() || {};
    const event = {
      eventId: crypto.randomUUID(), site: clean(configuration.site || location.hostname),
      action: clean(detail.action), contentType: clean(detail.contentType), target: clean(detail.target),
      parentTopic: clean(detail.parentTopic || context.topic), targetTopic: clean(detail.targetTopic),
      parentQuantId: clean(detail.parentQuantId || context.quantId), quantId: clean(detail.quantId),
      tokenId: clean(detail.tokenId || context.tokenId), occurredAt: new Date().toISOString()
    };
    if (!event.action || !event.target) return;
    save([...read(), event]); void flush();
    return event;
  }
  function click(event) {
    const target = event.target?.closest?.('a,button,[data-quant-action]');
    if (!target || target.closest('form,[data-no-quant-track]') || target.matches('[disabled]')) return;
    const label = clean(target.dataset.quantTarget || target.getAttribute('aria-label') || target.textContent);
    if (!label) return;
    const isIndex = Boolean(target.closest('#qYellowDataList'));
    const topic = clean(document.querySelector('#q')?.value);
    const detail = {action:isIndex?'data-index-click':'click',contentType:isIndex?'data-link':target.tagName.toLowerCase(),target:label,targetTopic:isIndex?label:''};
    track(detail);
    if (isIndex && topic) {
      try { sessionStorage.setItem('quant-click-reader-transition-v1', JSON.stringify({fromTopic:topic,toTopic:label,fromQuantId:clean(configuration.getContext?.()?.quantId),eventId:crypto.randomUUID()})) } catch (_) {}
    }
  }
  function install(options) {
    if (configuration) return;
    configuration = options || {};
    document.addEventListener('click', click, true);
    global.addEventListener('focus', flush);
    document.addEventListener('starquest:ledger-connected', flush);
    setInterval(flush, 15000);
    void flush();
  }
  global.QuantClickReader = Object.freeze({install,track,flush});
})(window);
