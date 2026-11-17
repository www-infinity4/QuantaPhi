const promptField = document.getElementById('guide-prompt');
const copyButton = document.querySelector('[data-copy-prompt]');
const copyStatus = document.querySelector('.copy-status');

if (promptField && copyButton && copyStatus) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(promptField.value);
      copyStatus.textContent = 'Instructions copied.';
    } catch {
      promptField.focus();
      promptField.select();
      copyStatus.textContent = 'Instructions selected. Use your device’s Copy command.';
    }
  });
}

const chatLink = document.querySelector('[data-open-bubbles]');
chatLink?.addEventListener('click', (event) => {
  if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const launcher = document.querySelector('.quantaphi-bubbles-embed-launcher');
  if (!launcher) return;

  event.preventDefault();
  if (launcher.getAttribute('aria-expanded') === 'true') {
    document.querySelector('iframe[data-bubble-id]')?.focus();
    return;
  }
  launcher.click();
});
