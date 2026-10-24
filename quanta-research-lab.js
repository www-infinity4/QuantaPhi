/* QuantaPhi research lab local interface console.
   Deliberately does not claim authenticated backend execution or live agent status. */
(() => {
  'use strict';
  const form = document.getElementById('qpLabConsoleForm');
  const input = document.getElementById('qpLabConsoleInput');
  const screen = document.getElementById('qpLabConsoleLog');
  if (!form || !input || !screen) return;

  function write(message, kind = 'reply') {
    const line = document.createElement('p');
    line.dataset.kind = kind;
    line.textContent = String(message);
    screen.appendChild(line);
    while (screen.childElementCount > 32) screen.firstElementChild.remove();
    screen.scrollTop = screen.scrollHeight;
  }

  function goTo(id, focus) {
    const element = document.getElementById(id);
    if (!element) {
      write('That part of the interface is not available in this view.', 'error');
      return;
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focus && typeof element.focus === 'function') element.focus({ preventScroll: true });
  }

  const commands = Object.freeze({
    help: () => write('Commands: help · architecture · pipeline · status · cards · search · clear'),
    architecture: () => write('Research model: source intelligence → Robot Brain planning and receipts → interactive quick cards. This is an architectural description, not a system health report.'),
    pipeline: () => write('RED: wide search/snapshot | BLUE: plan/dependencies | YELLOW: read/evidence | BLACK: verification/seal. These are named roles, not a verified active run.'),
    status: () => {
      const search = document.getElementById('q');
      const deck = document.getElementById('oracleCardDeck');
      const stage = document.getElementById('oracleCardStage');
      const renderedCard = !!stage && Array.from(stage.children).some(node => !node.hidden);
      write('Local interface only — research search: ' + (search ? 'present' : 'unavailable') + '; card deck: ' + (deck ? 'present' : 'unavailable') + '; card stage: ' + (renderedCard ? 'has visible content' : 'not yet rendered/empty') + '. Remote brain, deployment and TLS health were not checked.');
    },
    cards: () => { goTo('oracleCardDeck'); write('Moved to the interactive Public / For You / Following card deck.'); },
    search: () => { goTo('q', true); write('Moved to the main QuantaPhi search field.'); },
    clear: () => { screen.replaceChildren(); write('Local console cleared. Enter help for available commands.'); }
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const command = input.value.trim().toLowerCase();
    input.value = '';
    if (!command) return;
    write('quantaphi:~$ ' + command, 'command');
    if (Object.hasOwn(commands, command)) commands[command]();
    else write('Unrecognized local command. Type help. No server instruction was sent.', 'error');
  });
})();
