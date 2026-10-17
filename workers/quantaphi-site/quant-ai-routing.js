import { promises as fs } from 'fs';
import path from 'path';
import { uploadImage } from '../../phi-image-builder.js';

/**
 * Handles Quant AI routing requests.
 * Returns JSON, HTML, or plain‑text responses based on the pathname.
 */
export async function handle(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.startsWith('/quant-ai/commercial')) {
    const data = await fs.readFile(path.resolve('production/quant-ai-commercial.json'), 'utf-8');
    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (pathname.startsWith('/quant-ai/presentation')) {
    const html = await fs.readFile(path.resolve('quant-ai-presentation.html'), 'utf-8');
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  if (pathname.startsWith('/quant-ai/cinema')) {
    const md = await fs.readFile(path.resolve('production/quant-ai-cinema-api.md'), 'utf-8');
    return new Response(md, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  if (request.method === 'POST' && pathname.startsWith('/image/upload')) {
    // Delegate to the UI module's upload handler
    return uploadImage(request);
  }

return new Response('Not found', { status: 404 });
}
