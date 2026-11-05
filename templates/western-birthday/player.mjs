/* Reusable program validation for Western birthday cards.
   This module contains no recipient identity, wallet access or playback rights claims. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function validateMovie(movie) {
  return Boolean(
    movie &&
    typeof movie.title === 'string' && movie.title.trim().length > 0 &&
    typeof movie.publisher === 'string' && movie.publisher.trim().length > 0 &&
    Number.isInteger(movie.year) && movie.year >= 1888 && movie.year <= 2100 &&
    typeof movie.videoId === 'string' && VIDEO_ID.test(movie.videoId) &&
    movie.sourceUrl === 'https://www.youtube.com/watch?v=' + movie.videoId
  );
}

function checkedId(movie) {
  if (!movie || typeof movie.videoId !== 'string' || !VIDEO_ID.test(movie.videoId)) {
    throw new TypeError('Invalid Western program video ID');
  }
  return movie.videoId;
}

export function createEmbedUrl(movie) {
  return 'https://www.youtube-nocookie.com/embed/' + checkedId(movie) +
    '?rel=0&playsinline=1';
}

export function createPosterUrl(movie) {
  return 'https://i.ytimg.com/vi/' + checkedId(movie) + '/hqdefault.jpg';
}
