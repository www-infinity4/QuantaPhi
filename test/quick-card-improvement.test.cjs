const test = require('node:test');
const assert = require('node:assert/strict');

(async () => {
  const mod = await import('../quick-card-wiring.mjs');
  const getControls = mod.getControls;
  test('quick card controls', () => {
    const controls = getControls();
    const required = ['star', 'collect', 'share', 'build', 'search'];
    for (const r of required) {
      assert.ok(controls.includes(r), `Missing control ${r}`);
    }
  });
})();