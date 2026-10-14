// test/quant-ai-presentation.test.mjs
// Tests for the pure‑logic API of quant‑ai‑presentation.js.
// No external dependencies – only built‑in Node modules are used.

import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

import {
  loadCues,
  getCueCount,
  getCue,
  getCurrentCue,
  nextCue,
  prevCue,
  handleKeyboard,
} from "../quant-ai-presentation.js";

// Helper to locate the JSON file relative to this test file.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.resolve(__dirname, "..", "production", "quant-ai-commercial.json");

test("load cues and count", async () => {
  await loadCues();
  const count = getCueCount();
  assert.strictEqual(count, 44, "There should be exactly 44 cues");
});

test("cue order matches source JSON", async () => {
  await loadCues();
  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);
  const expectedActions = data.scenes.map((s) => s.action);
  for (let i = 0; i < expectedActions.length; i++) {
    const cue = getCue(i);
    assert.strictEqual(
      cue.action,
      expectedActions[i],
      `Cue ${i} action should match source`
    );
  }
});

test("navigation next/prev works", async () => {
  await loadCues();
  // start at first cue
  assert.strictEqual(getCurrentCue(), getCue(0));
  nextCue();
  assert.strictEqual(getCurrentCue(), getCue(1));
  prevCue();
  assert.strictEqual(getCurrentCue(), getCue(0));
});

test("keyboard handling updates current cue", async () => {
  await loadCues();
  // Ensure we start at first cue
  assert.strictEqual(getCurrentCue(), getCue(0));
  handleKeyboard({ key: "ArrowRight" });
  assert.strictEqual(getCurrentCue(), getCue(1));
  handleKeyboard({ key: "ArrowLeft" });
  assert.strictEqual(getCurrentCue(), getCue(0));
});
