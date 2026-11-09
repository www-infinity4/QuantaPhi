/* NES/SNES card for the EXISTING Oracle viewer. Reuses the merged
 * TV-Database Game Deck and Emulation-Station browser core configuration.
 * Starts only on a user gesture, no bundled ROMs or wallet operations. */
(function(){
'use strict';
const root=document.getElementById('nesSnesQuickCard');
if(!root)return;
// The public release remains gated until real browser and Android acceptance.
// Explicit owner preview: /?card=nes&nesSnesPreview=1
if(new URLSearchParams(window.location.search).get('nesSnesPreview')!=='1')return;
root.hidden=false;
root.classList.add('card','nes-snes-card');
const html=`
  <div class="nes-snes-hero">
    <img src="/assets/nes-snes-card.svg" alt="Original pixel-art controller and arcade landscape for NES and SNES emulation" width="960" height="540" loading="lazy" decoding="async">
    <span class="nes-snes-label">INFINITY ® · GAME PREVIEW · DEVICE TEST PENDING</span>
  </div>
  <div class="nes-snes-content">
    <h2>NES / SNES · Play your games</h2>
    <p>Use your own legally obtained game file on Android or desktop. Pick NES or SNES and start the emulator here, without opening another website.</p>
    <div class="nes-snes-actions">
      <button id="nesSnesLaunch" type="button" aria-label="Start NES or SNES emulator in this Quick Card">🎮 Start emulator</button>
      <button id="nesSnesStop" type="button" disabled aria-label="Close emulator and stop gameplay">Stop player</button>
    </div>
    <p id="nesSnesStatus" class="nes-snes-status" role="status" aria-live="polite">Ready to open your own game file.</p>
    <div id="nesSnesPlayerSlot" class="nes-snes-slot" aria-label="NES and SNES game player"></div>
    <p class="nes-snes-note">No games or ROM downloads are included. Choose only files you have permission to use. The player uses EmulatorJS from its public CDN; save-state and controller tools appear after a compatible game loads.</p>
  </div>`;
root.innerHTML=html;
const launch=root.querySelector('#nesSnesLaunch');
const stopButton=root.querySelector('#nesSnesStop');
const slot=root.querySelector('#nesSnesPlayerSlot');
const status=root.querySelector('#nesSnesStatus');
let frame=null;
function stop(){
 if(frame){frame.remove();frame=null;}
 slot.replaceChildren();
 launch.disabled=false;
 stopButton.disabled=true;
 status.textContent='Player closed. Your game file was not uploaded to QuantaPhi.';
}
launch.addEventListener('click',()=>{
 if(frame)return;
 frame=document.createElement('iframe');
 frame.src='/nes-snes-player.html';
 frame.title='NES and SNES browser emulator. Choose your own game file.';
 frame.setAttribute('allow','fullscreen; gamepad');
 frame.setAttribute('allowfullscreen','');
 frame.referrerPolicy='no-referrer';
 frame.addEventListener('load',()=>{if(frame)status.textContent='Emulator panel opened. Select a permitted NES or SNES file below to start playing.';});
 frame.addEventListener('error',()=>{status.textContent='The emulator panel could not load. No game started.';});
 slot.append(frame);
 launch.disabled=true;
 stopButton.disabled=false;
 status.textContent='Opening emulator panel. No game has started yet.';
});
stopButton.addEventListener('click',stop);
document.addEventListener('oracle:card-deactivated',event=>{
 if(event.detail?.id==='nesSnesQuickCard')stop();
});
window.addEventListener('pagehide',stop);
})();
