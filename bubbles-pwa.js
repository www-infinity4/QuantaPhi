/* Chrome PWA activation: never hand over wallet/session tokens or capture screen. */
(() => {
  'use strict';
  if (!window.isSecureContext || !('serviceWorker' in navigator)) return;
  // The native Android WebView has its own microphone/overlay stack and is not a Chrome installation.
  const isNative = /Bubbles(?:Android|Overlay|Native)/i.test(navigator.userAgent || '') ||
      new URLSearchParams(location.search).get('embed') === '1';
  if (isNative) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/bubbles-pwa-sw.js', {scope: '/'})
      .catch(() => { const output = document.querySelector('#bubblesInstallStatus'); if (output) output.textContent = 'Chrome installation not available here. You can still use Bubbles in this browser.'; });
  });
  let deferred = null;
  const installButton = document.querySelector('#bubblesInstallChrome');
  const status = document.querySelector('#bubblesInstallStatus');
  if (!installButton || !status) return;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  if (standalone()) {
    installButton.hidden = true;
    status.textContent = 'Bubbles is installed. This Chrome app uses the QuantaPhi website session.';
  } else {
    status.textContent = 'Chrome: open the ⋮ menu and choose Install app or Add to Home screen.';
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferred = event;
    installButton.hidden = false;
    status.textContent = 'Install Bubbles from Chrome. It shares this browser’s QuantaPhi website session.';
  });
  installButton.addEventListener('click', async () => {
    if (!deferred) return;
    const prompt = deferred;
    deferred = null;
    installButton.disabled = true;
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      status.textContent = result?.outcome === 'accepted' ? 'Chrome accepted the installation request.' : 'You can install later from the Chrome menu.';
    } catch {
      status.textContent = 'Use the Chrome ⋮ menu → Install app.';
    } finally {
      installButton.disabled = false;
      installButton.hidden = true;
    }
  });
  window.addEventListener('appinstalled', () => {
    installButton.hidden = true;
    status.textContent = 'Bubbles installed in Chrome.';
  });
})();
