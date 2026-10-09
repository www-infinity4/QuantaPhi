(function (global) {
  'use strict';
  const WALLET_KEY = 'infinity_stock_wallet_v1';
  const STAR_KEY = 'infinity_stock_stars_v1';
  const STYLE_ID = 'widgetphi-stock-style-v1';

  function parseJSON(value, fallback) { try { return JSON.parse(value); } catch (_) { return fallback; } }
  function read(key, fallback) { try { return parseJSON(localStorage.getItem(key), fallback); } catch (_) { return fallback; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } }
  function escapeHTML(value) { return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function payload(card) { return parseJSON(card.getAttribute('data-stock-payload') || '{}', {}); }
  function cardKey(item) { return [item.exchange || '', item.symbol || '', item.company || ''].join(':').toUpperCase(); }
  function nowISO() { return new Date().toISOString(); }
  function validSymbol(value) { return /^[A-Z0-9.^-]{1,16}$/.test(String(value || '').trim().toUpperCase()); }
  function validExchange(value) { return !value || /^[A-Z0-9._-]{2,20}$/.test(String(value || '').trim().toUpperCase()); }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style'); style.id = STYLE_ID;
    style.textContent = '.widgetphi-stock-card{box-sizing:border-box;border:1px solid #d9d2e2;border-radius:18px;background:#fff;color:#17131f;padding:16px;margin:18px 0;box-shadow:0 12px 34px rgba(56,35,78,.10);font-family:Arial,Helvetica,sans-serif}.widgetphi-stock-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.widgetphi-stock-head h2{margin:3px 0 2px;font-size:25px;line-height:1.08}.widgetphi-stock-head p{margin:0;color:#6b6472;font-weight:700}.widgetphi-stock-head small{font-weight:900;letter-spacing:.16em;color:#5f259f}.widgetphi-stock-star{border-radius:12px;border:1px solid #d9d2e2;background:#fff;font-size:22px;padding:8px 10px;cursor:pointer}.widgetphi-stock-star[aria-pressed="true"]{background:#fff4c2}.widgetphi-stock-live{min-height:300px;margin:12px 0;background:#f7f4fb}.widgetphi-stock-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.widgetphi-stock-actions button{border-radius:12px;border:1px solid #5f259f;background:#fff;color:#5f259f;padding:12px 14px;font-weight:900;cursor:pointer}.widgetphi-stock-actions button:last-child{background:#5f259f;color:#fff}.widgetphi-stock-source{display:block;margin-top:10px;color:#6b6472;line-height:1.35}.widgetphi-stock-wallet{border:1px solid #d9d2e2;background:#fff;padding:16px;margin:10px 0 18px;font-family:Arial,Helvetica,sans-serif}.widgetphi-stock-wallet h2{margin:0 0 2px}.widgetphi-stock-wallet p{margin:0 0 12px;color:#6b6472}.widgetphi-wallet-row{display:grid;grid-template-columns:1fr auto;gap:3px 12px;padding:10px 0;border-top:1px solid #eee}.widgetphi-wallet-row small{grid-column:1/-1;color:#777}.widgetphi-stock-snapshot{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-top:10px}.widgetphi-stock-snapshot strong{font-size:25px}.widgetphi-stock-snapshot[data-direction="positive"] span{color:#137333}.widgetphi-stock-snapshot[data-direction="negative"] span{color:#b3261e}@media(max-width:520px){.widgetphi-stock-card{padding:12px}.widgetphi-stock-live{min-height:280px}.widgetphi-stock-head h2{font-size:22px}}';
    document.head.appendChild(style);
  }

  function emit(name, detail) { try { global.dispatchEvent(new CustomEvent(name, { detail })); } catch (_) {} }

  function star(card) {
    const item = payload(card); const key = cardKey(item); const stars = read(STAR_KEY, {});
    stars[key] = !stars[key]; write(STAR_KEY, stars);
    const button = card.querySelector('[data-phi-stock-action="star"]');
    if (button) button.setAttribute('aria-pressed', stars[key] ? 'true' : 'false');
    emit('infinity:stock:star', { item, starred: !!stars[key] });
    return !!stars[key];
  }

  function walletItems() { const items = read(WALLET_KEY, []); return Array.isArray(items) ? items : []; }
  function ensureWalletAfter(card) {
    let wallet = card.parentElement && card.parentElement.querySelector(':scope > [data-widgetphi-stock-wallet]');
    if (!wallet) {
      wallet = document.createElement('section'); wallet.className = 'widgetphi-stock-wallet'; wallet.setAttribute('data-widgetphi-stock-wallet', '');
      wallet.innerHTML = '<header><h2>Infinity Stock Wallet</h2><p>Collected market cards</p></header><div data-widgetphi-stock-wallet-list></div>';
      card.insertAdjacentElement('afterend', wallet);
    }
    renderWallet(wallet); return wallet;
  }
  function collect(card) {
    const item = payload(card); const key = cardKey(item); const items = walletItems();
    const record = Object.assign({}, item, { key, collectedAt: nowISO() });
    const existing = items.findIndex((x) => x && x.key === key);
    if (existing >= 0) items[existing] = Object.assign({}, items[existing], record); else items.unshift(record);
    write(WALLET_KEY, items.slice(0, 500));
    if (global.InfinityStockWallet && global.InfinityStockWallet !== api && typeof global.InfinityStockWallet.collect === 'function') {
      try { global.InfinityStockWallet.collect(record); } catch (_) {}
    }
    if (typeof global.QuantaStarCredit === 'function') {
      try { global.QuantaStarCredit('collect', `stock:${key}`, { key: `stock:${key}`, type: 'Stock', title: record.company || record.symbol, media: '', symbol: record.symbol, exchange: record.exchange }); } catch (_) {}
    }
    emit('infinity:stock:collect', { item: record });
    renderWallets(); ensureWalletAfter(card);
    return record;
  }

  async function share(card) {
    const item = payload(card); const title = `${item.company || item.symbol} (${item.symbol})`;
    const url = item.permalink || location.href; const text = `${title} market card`;
    let completed = false;
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); completed = true; }
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); completed = true; }
    } catch (_) { return false; }
    if (completed && typeof global.QuantaStarCredit === 'function') {
      try { global.QuantaStarCredit('share', `stock:${cardKey(item)}:${Date.now()}`, { key: `stock:${cardKey(item)}`, type: 'Stock', title, symbol: item.symbol, exchange: item.exchange }); } catch (_) {}
    }
    emit('infinity:stock:share', { item, completed });
    return completed;
  }

  function tradingViewScript(host, src, config) {
    if (!host || host.dataset.widgetphiHydrated === '1') return;
    host.dataset.widgetphiHydrated = '1';
    const box = document.createElement('div'); box.className = 'tradingview-widget-container';
    const widget = document.createElement('div'); widget.className = 'tradingview-widget-container__widget'; box.appendChild(widget);
    const script = document.createElement('script'); script.type = 'text/javascript'; script.src = src; script.async = true; script.text = JSON.stringify(config);
    box.appendChild(script); host.replaceChildren(box);
  }

  function hydrateMarketWidgets(root) {
    ensureStyles();
    (root || document).querySelectorAll('[data-widgetphi-tradingview="symbol-overview"]').forEach((host) => {
      const symbol = host.getAttribute('data-symbol') || '';
      tradingViewScript(host, 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js', {
        symbols: [[symbol, `${symbol}|1D`]], chartOnly: false, width: '100%', height: 320, locale: 'en', colorTheme: 'light', autosize: false, showVolume: true, showMA: false, hideDateRanges: false, hideMarketStatus: false, hideSymbolLogo: false, scalePosition: 'right', scaleMode: 'Normal', fontFamily: 'Arial, sans-serif', fontSize: '10', noTimeScale: false, valuesTracking: '1', changeMode: 'price-and-percent'
      });
    });
    (root || document).querySelectorAll('[data-widgetphi-tradingview="ticker"]').forEach((host) => {
      let config = {}; try { config = JSON.parse(decodeURIComponent(host.getAttribute('data-config') || '')); } catch (_) {}
      tradingViewScript(host, 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js', config);
    });
  }

  function stockCardHTML(spec) {
    const symbol = String(spec.symbol || '').trim().toUpperCase(); const exchange = String(spec.exchange || '').trim().toUpperCase();
    if (!validSymbol(symbol) || !validExchange(exchange)) throw new Error('Invalid stock symbol');
    const company = String(spec.company || spec.name || symbol).trim().slice(0, 180); const tradingViewSymbol = exchange ? `${exchange}:${symbol}` : symbol;
    const item = { kind: 'stock', symbol, exchange, tradingViewSymbol, company, query: String(spec.query || `${company} stock`).slice(0, 500), permalink: String(spec.permalink || location.href).slice(0, 1000), source: 'TradingView free widget', quote: spec.quote || null };
    const data = escapeHTML(JSON.stringify(item)); const quoteLink = 'https://www.google.com/finance/quote/' + encodeURIComponent(symbol) + ':' + encodeURIComponent(exchange || 'NASDAQ');
    return `<article class="widgetphi-stock-card" data-widgetphi-stock-card data-stock-payload="${data}"><header class="widgetphi-stock-head"><div><small>STOCK</small><h2>${escapeHTML(company)}</h2><p>${escapeHTML(tradingViewSymbol)}</p></div><button type="button" class="widgetphi-stock-star" data-phi-stock-action="star" aria-label="Star ${escapeHTML(company)}">⭐</button></header><div class="widgetphi-stock-live" data-widgetphi-tradingview="symbol-overview" data-symbol="${escapeHTML(tradingViewSymbol)}"></div><div class="widgetphi-stock-actions"><button type="button" data-phi-stock-action="share">Share +0.1 ★</button><button type="button" data-phi-stock-action="collect">Collect +0.1 ★</button></div><small class="widgetphi-stock-source">Market display: TradingView free widget · <a href="${quoteLink}" target="_blank" rel="noopener noreferrer">Open quote in Google Finance</a> if the live chart cannot load · informational, not investment advice</small></article>`;
  }
  function renderCard(spec, container) {
    ensureStyles(); const host = typeof container === 'string' ? document.querySelector(container) : container;
    if (!host) throw new Error('Stock card container not found'); host.innerHTML = stockCardHTML(spec); mount(host); return host.querySelector('[data-widgetphi-stock-card]');
  }

  function renderWallet(host) {
    const list = host.querySelector('[data-widgetphi-stock-wallet-list]'); if (!list) return;
    const items = walletItems();
    if (!items.length) { list.innerHTML = '<p>No stock cards collected yet.</p>'; return; }
    list.innerHTML = items.map((x) => `<article class="widgetphi-wallet-row"><strong>${escapeHTML(x.company || x.symbol)}</strong><span>${escapeHTML([x.exchange, x.symbol].filter(Boolean).join(':'))}</span><small>${escapeHTML(x.collectedAt || '')}</small></article>`).join('');
  }
  function renderWallets(root) { (root || document).querySelectorAll('[data-widgetphi-stock-wallet]').forEach(renderWallet); }
  function mount(root) { hydrateMarketWidgets(root); renderWallets(root); }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-phi-stock-action]'); if (!button) return;
    const card = button.closest('[data-widgetphi-stock-card]'); if (!card) return;
    const action = button.getAttribute('data-phi-stock-action');
    if (action === 'star') { event.preventDefault(); star(card); }
    if (action === 'collect') { event.preventDefault(); collect(card); button.textContent = 'Collected ✓'; }
    if (action === 'share') { event.preventDefault(); share(card).then((ok) => { if (ok) { const old = button.textContent; button.textContent = 'Shared ✓'; setTimeout(() => { button.textContent = old; }, 1400); } }); }
  });

  const api = { mount, renderCard, stockCardHTML, hydrateMarketWidgets, walletItems, collect, share, star, renderWallets, WALLET_KEY };
  global.WidgetPhiStock = api;
  if (!global.InfinityStockWallet) global.InfinityStockWallet = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount(document)); else mount(document);
})(window);
