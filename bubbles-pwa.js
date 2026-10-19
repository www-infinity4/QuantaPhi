/* Bubbles Chrome installation: never touch wallet tokens, sessions or screen permission. */
(() => {
  'use strict';
  const installButton = document.querySelector('#bubblesInstallChrome');
  const status = document.querySelector('#bubblesInstallStatus');
  if (!installButton || !status) return;
  // Android's native Bubbles overlay is separate from the installable Chrome site.
  const nativeApp = /Bubbles(?:Android|Overlay|Native)/i.test(navigator.userAgent || '') ||
    new URLSearchParams(location.search).get('embed') === '1';
  if (nativeApp) {
    installButton.hidden = true;
    status.textContent = 'Open this page in Chrome to install the web app.';
    return;
  }

  let installPrompt = null;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const instructions = 'In Chrome, tap ⋮ (three dots) → Install app or Add to Home screen.';
  if (standalone()) {
    installButton.hidden = true;
    status.textContent = 'Bubbles is already installed in Chrome.';
  } else {
    installButton.hidden = false;
    status.textContent = 'Tap Install Bubbles in Chrome. If the browser does not offer a prompt, use the Chrome ⋮ menu.';
  }

  if (window.isSecureContext && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/bubbles-pwa-sw.js', {scope: '/'})
        .catch(() => { if (!standalone()) status.textContent = instructions; });
    });
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
    status.textContent = 'Chrome is ready to install Bubbles using this browser’s QuantaPhi website session.';
  });
  installButton.addEventListener('click', async () => {
    if (standalone()) {
      installButton.hidden = true;
      status.textContent = 'Bubbles is already installed in Chrome.';
      return;
    }
    // Chrome does not expose a universal API to force its install UI. This
    // button always gives a useful instruction when no install prompt exists.
    if (!installPrompt) {
      status.textContent = instructions;
      return;
    }
    const prompt = installPrompt;
    installPrompt = null;
    installButton.disabled = true;
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      status.textContent = result?.outcome === 'accepted'
        ? 'Chrome accepted the installation request.'
        : 'Installation was cancelled. ' + instructions;
    } catch {
      status.textContent = instructions;
    } finally {
      installButton.disabled = false;
      if (!standalone()) installButton.hidden = false;
    }
  });
  window.addEventListener('appinstalled', () => {
    installButton.hidden = true;
    status.textContent = 'Bubbles is installed in Chrome.';
  });
})();
