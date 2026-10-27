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
  // Headless install tests and constrained webviews may omit DOM creation APIs.
  // The existing install behavior must continue even without updater controls.
  if (typeof document.createElement !== 'function') return;
  // A PWA cannot silently scan or patch the user's computer or Chrome itself.
  // Poll the first-party release manifest only while Bubbles is running/visible.
  const CURRENT_RELEASE = '20261026-ui-settings1';
  const updateSection = document.createElement('div');
  updateSection.className = 'bubbles-update-controls';
  const updateButton = document.createElement('button');
  updateButton.type = 'button';
  updateButton.textContent = 'Check for updates';
  const updateMessage = document.createElement('p');
  updateMessage.className = 'bubbles-update-message';
  updateMessage.setAttribute('role', 'status');
  updateMessage.setAttribute('aria-live', 'polite');
  updateMessage.textContent = 'Security and app updates are checked when Bubbles opens.';
  updateSection.append(updateButton, updateMessage);
  status.parentElement?.append(updateSection);
  let latest = '', checking = false, lastCheck = 0;
  const check = async (showResult = false) => {
    if (checking || document.visibilityState === 'hidden') return;
    checking = true;
    updateButton.disabled = true;
    if (showResult) updateMessage.textContent = 'Checking for Bubbles updates…';
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (registration) await registration.update();
      }
      const response = await fetch('/bubbles-app-version.json', {cache:'no-store', credentials:'same-origin'});
      if (!response.ok) throw Error('manifest_unavailable');
      const release = await response.json();
      if (typeof release.version !== 'string' || !/^[a-zA-Z0-9_-]{5,64}$/.test(release.version)) throw Error('invalid_release');
      lastCheck = Date.now();
      latest = release.version !== CURRENT_RELEASE ? release.version : '';
      updateButton.dataset.update = latest ? 'ready' : 'current';
      updateButton.textContent = latest ? 'Update Bubbles' : 'Check for updates';
      updateMessage.textContent = latest
        ? 'A Bubbles website update is ready. Save any unsent message, then tap Update Bubbles.'
        : 'Bubbles web app is current · checked just now. Chrome itself updates separately.';
    } catch {
      updateMessage.textContent = 'Could not verify the latest Bubbles version. Existing chats and wallet remain unchanged.';
    } finally {
      checking = false;
      updateButton.disabled = false;
    }
  };
  // A reload must never discard a composed message or an unsent image.
  // The conversation may be collapsed, so inspect all Bubbles composers.
  const hasUnsentMessage = () => {
    if (typeof document.querySelectorAll !== 'function') return false;
    for (const form of document.querySelectorAll('.ba-composer')) {
      const message = form.querySelector('textarea[aria-label="Message Bubbles"]');
      const image = form.querySelector('.ba-photo-preview');
      // A selected file can still be decoding before its preview appears.
      // Block reload throughout image preparation, not just after preview.
      const fileInput = form.querySelector('.ba-photo-file');
      if (String(message?.value || '').trim() || (image && !image.hidden) ||
          (fileInput?.files && fileInput.files.length > 0)) return true;
    }
    return false;
  };
  updateButton.addEventListener('click', () => {
    if (!latest) { void check(true); return; }
    if (hasUnsentMessage()) {
      updateMessage.textContent = 'Your unsent Bubbles message or image is still here. Send or remove it before updating; no reload occurred.';
      return;
    }
    if (!window.confirm('Reload Bubbles to apply the web app update? Your wallet will not be erased.')) return;
    // A clean composer is not sufficient: a reply may still be generating.
    // Bubbles must checkpoint the active thread and explicitly authorize this
    // one reload; otherwise a fresh-chat startup would hide the conversation.
    if (window.QuantaBubbles?.prepareSiteUpdateReload?.() !== true) {
      updateMessage.textContent = 'Bubbles is still working, or the current conversation could not be safely saved. Update paused; no reload occurred.';
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set('appVersion', latest);
    location.assign(url.href);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now()-lastCheck > 60000) void check();
  });
  window.addEventListener('focus', () => {
    if (Date.now()-lastCheck > 60000) void check();
  });
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void check();
  }, 60*60*1000);
  void check();

})();
