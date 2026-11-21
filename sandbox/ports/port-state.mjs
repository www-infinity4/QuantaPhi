/** Self-contained experimental viewport state. No network, storage, or production feeds. */
const SHAPES = Object.freeze(['circle', 'double_mirror', 'cluster']);
export function normalizeShape(candidate) {
  return SHAPES.includes(candidate) ? candidate : 'circle';
}
function readingValue(value, fallback = 50) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, Math.round(number))) : fallback;
}
export function createPortState(reading = 50) {
  return Object.freeze({source:'synthetic', reading:readingValue(reading)});
}
export function updatePortReading(current, next) {
  if (!current || current.source !== 'synthetic') throw new TypeError('Only synthetic demo state is supported');
  return createPortState(readingValue(next, current.reading));
}
export function portViews(state) {
  if (!state || state.source !== 'synthetic') throw new TypeError('No authenticated data source is configured');
  return SHAPES.map(shape => Object.freeze({shape, reading:state.reading, mirrored:shape === 'double_mirror'}));
}
