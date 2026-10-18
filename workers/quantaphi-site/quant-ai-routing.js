import { promises as fs } from 'fs';
import path from 'path';

/**
 * Handles Quant AI routing requests.
 * Returns JSON, HTML, or plain‑text responses based on the pathname.
 */
export async function handle(request, env = {}) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Serve commercial JSON
  if (pathname.startsWith('/quant-ai/commercial')) {
    const data = await fs.readFile(path.resolve('production/quant-ai-commercial.json'), 'utf-8');
    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Serve presentation HTML
  if (pathname.startsWith('/quant-ai/presentation')) {
    const html = await fs.readFile(path.resolve('quant-ai-presentation.html'), 'utf-8');
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // Serve cinema API markdown
  if (pathname.startsWith('/quant-ai/cinema')) {
    const md = await fs.readFile(path.resolve('production/quant-ai-cinema-api.md'), 'utf-8');
    return new Response(md, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Static assets (HTML, CSS, JS) for the Quant‑AI UI
  if (
    pathname === '/quant-ai/' ||
    pathname.endsWith('.html') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  ) {
    // Require the private Quant‑AI service binding
    if (!env.QUANT_AI || typeof env.QUANT_AI.fetch !== 'function') {
      return new Response(JSON.stringify({ error: 'quant_ai_service_not_configured' }), {
        status: 503,
        headers: { 'cache-control': 'no-store' }
      });
    }
    const upstream = await env.QUANT_AI.fetch(request);
    const headers = new Headers(upstream.headers);
    headers.set('cache-control', 'no-store');
    headers.set('x-quantaphi-app', 'Quant-AI');
    return new Response(upstream.body, { status: upstream.status, headers });
  }

  // Fallback for any other path
  return new Response('Not found', { status: 404 });
}
