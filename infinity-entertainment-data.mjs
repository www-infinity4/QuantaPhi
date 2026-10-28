// Reuse existing Infinity TV program sources; no premium-stream ingestion or implied rights.
export const ENTERTAINMENT_CHANNELS = Object.freeze(['starquest', 'chiller']);
export function chooseEntertainmentProgram(catalog, channel, when = new Date()) {
  if (!ENTERTAINMENT_CHANNELS.includes(channel) || typeof catalog?.now !== 'function') return null;
  const program = catalog.now(channel, when);
  if (!program || typeof program.title !== 'string' || !program.title.trim()) return null;
  const videoId = String(program.videoId || '');
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || (typeof catalog.valid === 'function' && !catalog.valid(videoId))) return null;
  return Object.freeze({channel, title: program.title.slice(0, 160), year: Number.isInteger(program.year) ? program.year : null,
    videoId, poster: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`});
}
