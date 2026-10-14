// quant-ai-presentation.js
// Owner request: Shiny Happy People direction, 44 visual cues, Oracle Octaves styling.
// This module separates pure‑logic (testable in Node) from DOM rendering (browser only).

let cues = [];
let currentIndex = 0;

const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;

/** Load cue data.
 *  In Node: reads the JSON file synchronously via dynamic import of 'node:fs' and 'node:path'.
 *  In the browser: fetches the JSON and then renders the first cue.
 */
export async function loadCues() {
  if (cues.length) return; // already loaded
  if (isNode) {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const jsonPath = path.join(__dirname, "production", "quant-ai-commercial.json");
    const raw = fs.readFileSync(jsonPath, "utf8");
    const data = JSON.parse(raw);
    cues = data.scenes || [];
  } else {
    const response = await fetch("production/quant-ai-commercial.json");
    const data = await response.json();
    cues = data.scenes || [];
    renderCurrentCue();
  }
}

export function getCueCount() {
  return cues.length;
}

export function getCue(index) {
  if (index < 0 || index >= cues.length) {
    throw new RangeError("Cue index out of bounds");
  }
  return cues[index];
}

export function getCurrentCue() {
  return getCue(currentIndex);
}

export function nextCue() {
  if (currentIndex < cues.length - 1) {
    currentIndex++;
    if (!isNode) renderCurrentCue();
  }
  return getCurrentCue();
}

export function prevCue() {
  if (currentIndex > 0) {
    currentIndex--;
    if (!isNode) renderCurrentCue();
  }
  return getCurrentCue();
}

export function handleKeyboard(event) {
  if (!event || typeof event.key !== "string") return;
  if (event.key === "ArrowRight") {
    nextCue();
  } else if (event.key === "ArrowLeft") {
    prevCue();
  }
}

/** Browser‑only rendering of the current cue. */
function renderCurrentCue() {
  if (isNode) return; // safety guard
  const container = document.getElementById("presentation");
  if (!container) return;
  const cue = getCurrentCue();
  // Simple card layout
  const html = [];
  html.push(`<div class="cue-card ${cue.accent || ""}">`);
  html.push(`<h2>${cue.title || "Scene"} (${currentIndex + 1}/${cues.length})</h2>`);
  if (cue.action) html.push(`<p><strong>Action:</strong> ${cue.action}</p>`);
  if (cue.lyric_marker) html.push(`<p><em>${cue.lyric_marker}</em></p>`);
  // Placeholders for R.E.M. and Kris beats
  if (cue.rem) {
    html.push(`<div class="rem-placeholder">R.E.M. beat placeholder</div>`);
  }
  if (cue.kris) {
    html.push(`<div class="kris-placeholder">Kris visual beat placeholder</div>`);
  }
  html.push(`</div>`);
  // Navigation buttons
  html.push(`
    <div class="nav-buttons">
      <button id="prevBtn" ${currentIndex === 0 ? "disabled" : ""}>Previous</button>
      <button id="nextBtn" ${currentIndex === cues.length - 1 ? "disabled" : ""}>Next</button>
    </div>
  `);
  container.innerHTML = html.join("\n");
  // Attach listeners
  document.getElementById("prevBtn").addEventListener("click", () => prevCue());
  document.getElementById("nextBtn").addEventListener("click", () => nextCue());
}

/** Initialise the presentation when running in a browser. */
function initBrowser() {
  if (isNode) return;
  document.addEventListener("DOMContentLoaded", async () => {
    await loadCues();
    // Keyboard navigation
    document.addEventListener("keydown", handleKeyboard);
  });
}

initBrowser();

export default {
  loadCues,
  getCueCount,
  getCue,
  getCurrentCue,
  nextCue,
  prevCue,
  handleKeyboard,
};
