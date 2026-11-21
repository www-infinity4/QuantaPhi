export const DURATION = 26;

export const DEFAULT_DESIGN = Object.freeze({
  header: 'left',
  search: 'center',
  carousel: 'lower'
});

export const ALTERNATIVES = Object.freeze({
  'header-center': Object.freeze({
    area:'header', value:'center', name:'Centered header', start:3.5, end:6.5
  }),
  'search-left': Object.freeze({
    area:'search', value:'left', name:'Left-aligned search', start:9, end:12.5
  }),
  'search-wide': Object.freeze({
    area:'search', value:'wide', name:'Full-width search', start:12.5, end:16.5
  }),
  'carousel-upper': Object.freeze({
    area:'carousel', value:'upper', name:'Carousel above search', start:16.5, end:20.5
  })
});

const APPEARANCES = [
  ['header', 1.4],
  ['navigation', 2.8],
  ['type', 4],
  ['search', 5.5],
  ['search-window', 5.5],
  ['spacing', 6],
  ['carousel', 7.5],
  ['cards', 8.4],
  ['mobile', 9.5]
];

const VALID_DESIGNS = {
  header: ['left', 'center'],
  search: ['left', 'center', 'wide'],
  carousel: ['lower', 'upper']
};

export function normalizeDesign(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [area, options] of Object.entries(VALID_DESIGNS)) {
    if (Object.hasOwn(value, area) && options.includes(value[area])) result[area] = value[area];
  }
  return result;
}

export function frameAt(position, saved = {}) {
  const time = Number.isFinite(position) ? Math.min(DURATION, Math.max(0, position)) : 0;
  const design = {...DEFAULT_DESIGN};
  for (const option of Object.values(ALTERNATIVES)) {
    if (time >= option.start && time < option.end) design[option.area] = option.value;
  }
  // Saved changes affect the current preview. Earlier frames retain their
  // recorded layouts, so scrubbing back remains a faithful demo replay.
  if (time === DURATION) Object.assign(design, normalizeDesign(saved));
  const visible = APPEARANCES.filter(([, start]) => time >= start).map(([name]) => name);
  return {
    time,
    design,
    visible,
    workers: visible.filter(name => name !== 'search-window'),
    alternatives: Object.entries(ALTERNATIVES).filter(([, option]) => time >= option.start).map(([id]) => id)
  };
}

export function builderWorkRequest(saved = {}, instruction = '') {
  const design = {...DEFAULT_DESIGN, ...normalizeDesign(saved)};
  const chosen = Object.values(ALTERNATIVES)
    .filter(option => design[option.area] === option.value)
    .map(option => option.name);
  return [
    'Continue Avatar AI visual builder on canonical QuantaPhi #1923 in www-infinity4/QuantaPhi.',
    'Work on the builder inside /bubbles.html#avatarBuilder using avatar-ai-builder.mjs, avatar-ai-builder-core.mjs and avatar-ai-builder.css.',
    'Current preview choices: ' + (chosen.join(', ') || 'original layout') + '.',
    String(instruction).trim().slice(0, 600),
    'Preserve playback, alternative layout markers, Android readability and saved choices. Follow the existing signed runner, tests, independent review and release path. Use real job receipts when connecting live activity.'
  ].filter(Boolean).join('\n').slice(0, 1800);
}
