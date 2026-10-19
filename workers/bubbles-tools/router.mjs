// Simple router for the Bubbles‑tools workers (ESM)
// It registers handlers and can be invoked with a mock request object in tests.

const routes = [];

export function addRoute(method, path, handler) {
  routes.push({ method: method.toUpperCase(), path, handler });
}

export async function route(request) {
  const { method, url } = request;
  const match = routes.find(r => r.method === method.toUpperCase() && r.path === url);
  if (!match) {
    return { status: 404, body: { error: 'Not found' } };
  }
  // Handlers are expected to return {status, body}
  return await match.handler(request);
}

// Register the bot‑spawn endpoint
import { handleSpawn } from './bot-spawn.mjs';
addRoute('POST', '/api/bot/spawn', handleSpawn);
