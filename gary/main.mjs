import { garyPage } from './films.mjs';
import { createEmbedUrl, createPosterUrl, programKey, validateMovie } from '../templates/western-birthday/player.mjs';

const cover = document.getElementById('western-cover');
const coverArt = cover?.querySelector('img');
const player = document.getElementById('western-player');
const play = document.getElementById('western-play');
const title = document.getElementById('western-title');
const description = document.getElementById('western-description');
const status = document.getElementById('western-status');
const source = document.getElementById('western-source');
const choices = document.getElementById('western-choices');

if (!cover || !coverArt || !player || !play || !title ||
    !description || !status || !source || !choices) {
  throw new Error('Gary Westerns player markup is incomplete');
}

let selected = null;
const buttons = new Map();

function choose(movie) {
  if (!validateMovie(movie)) {
    status.textContent = 'This movie cannot be selected because its publisher details are invalid.';
    return;
  }
  selected = movie;
  // Unload the prior YouTube iframe on channel change. This also stops audio.
  player.replaceChildren();
  player.hidden = true;
  cover.hidden = false;
  coverArt.src = createPosterUrl(movie);
  coverArt.alt = movie.title + ' Western film preview';
  title.textContent = movie.title + ' (' + movie.year + ')';
  description.textContent = movie.description;
  source.href = movie.sourceUrl;
  status.textContent = 'Ready to play. Nothing starts without your tap.';
  for (const [id, button] of buttons) {
    button.setAttribute('aria-pressed', String(id === programKey(movie)));
  }
}

function startMovie() {
  const movie = selected;
  if (!movie || !validateMovie(movie)) return;
  const iframe = document.createElement('iframe');
  iframe.src = createEmbedUrl(movie);
  iframe.title = movie.title + ' · player provided by ' + movie.publisher;
  iframe.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.loading = 'eager';
  // Use the source provider's real player embed, never an invented "live" stream.
  player.replaceChildren(iframe);
  cover.hidden = true;
  player.hidden = false;
  status.textContent = 'Player loaded for ' + movie.title + '. Press Play in the video if needed.';
}

for (const movie of garyPage.movies) {
  if (!validateMovie(movie)) continue;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'choice';
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', 'Choose ' + movie.title + ' from ' + movie.publisher);
  const artwork = document.createElement('img');
  artwork.src = createPosterUrl(movie);
  artwork.alt = '';
  artwork.width = 480;
  artwork.height = 270;
  artwork.loading = 'lazy';
  const name = document.createElement('strong');
  name.textContent = movie.title + ' (' + movie.year + ')';
  const byline = document.createElement('small');
  byline.textContent = 'Full film · ' + movie.publisher;
  button.append(artwork, name, byline);
  button.addEventListener('click', () => choose(movie));
  choices.append(button);
  buttons.set(programKey(movie), button);
}
play.addEventListener('click', startMovie);
if (garyPage.movies.some(validateMovie)) {
  choose(garyPage.movies.find(validateMovie));
} else {
  play.disabled = true;
  status.textContent = 'No verified movie selections are available.';
}
