/* Reusable source-backed Western program validation.
   Does not grant playback rights or touch identity/wallets. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const ARCHIVE_ID = /^[A-Za-z0-9_-]{3,80}$/;

export function validateMovie(movie) {
  if (!movie || typeof movie !== 'object' ||
      typeof movie.title !== 'string' || !movie.title.trim() ||
      typeof movie.publisher !== 'string' || !movie.publisher.trim() ||
      !Number.isInteger(movie.year) || movie.year < 1888 || movie.year > 2100) {
    return false;
  }
  if (movie.provider === 'internet-archive') {
    return typeof movie.archiveId === 'string' &&
      ARCHIVE_ID.test(movie.archiveId) &&
      movie.sourceUrl === 'https://archive.org/details/' + movie.archiveId;
  }
  if (movie.provider === undefined || movie.provider === 'youtube') {
    return typeof movie.videoId === 'string' &&
      YOUTUBE_ID.test(movie.videoId) &&
      movie.sourceUrl === 'https://www.youtube.com/watch?v=' + movie.videoId;
  }
  return false;
}

function checkedId(movie) {
  const archive = movie?.provider === 'internet-archive';
  const id = archive ? movie?.archiveId : movie?.videoId;
  const valid = archive ? ARCHIVE_ID.test(id ?? '') : YOUTUBE_ID.test(id ?? '');
  if (!valid || typeof id !== 'string') {
    throw new TypeError('Invalid Western program ID');
  }
  return id;
}

export function programKey(movie) {
  if (!validateMovie(movie)) throw new TypeError('Invalid Western program');
  return (movie.provider === 'internet-archive' ? 'archive:' : 'youtube:') + checkedId(movie);
}

export function createEmbedUrl(movie) {
  const id = checkedId(movie);
  return movie.provider === 'internet-archive'
    ? 'https://archive.org/embed/' + id
    : 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&playsinline=1';
}

export function createPosterUrl(movie) {
  const id = checkedId(movie);
  return movie.provider === 'internet-archive'
    ? 'https://archive.org/services/img/' + id
    : 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
}
