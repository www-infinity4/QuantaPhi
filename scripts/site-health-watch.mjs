import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

/**
 * Helper to fetch a URL and record status, time and final URL.
 * Returns an object { url, status, timeMs, finalUrl, error? }.
 */
async function fetchInfo(url) {
  const start = performance.now();
  try {
    const response = await fetch(url, { redirect: 'follow' });
    const timeMs = performance.now() - start;
    return {
      url: String(response.url),
      status: response.status,
      timeMs: Math.round(timeMs),
      finalUrl: response.url,
    };
  } catch (err) {
    const timeMs = performance.now() - start;
    return {
      url,
      status: null,
      timeMs: Math.round(timeMs),
      finalUrl: null,
      error: err.message,
    };
  }
}

/**
 * Extract internal links from an HTML string.
 * Returns an array of absolute URLs (as strings).
 */
function extractInternalLinks(html, baseUrl) {
  const links = [];
  const origin = new URL(baseUrl).origin;
  const regex = /<a[^>]+href=["']([^"'>#]+)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const href = match[1];
      const resolved = new URL(href, baseUrl);
      if (resolved.origin === origin) {
        links.push(resolved.href);
      }
    } catch (_) {
      // ignore malformed URLs
    }
  }
  return links;
}

/**
 * Main runner.
 * @param {string[]} entryUrls - URLs to start crawling. If omitted, defaults to the four QuantaPhi pages.
 * @returns {Promise<Object>} The generated report object.
 */
export async function run(entryUrls) {
  const defaultEntries = [
    'https://quantaphi.org/',
    'https://quantaphi.org/about.html',
    'https://quantaphi.org/learn/',
    'https://quantaphi.org/storybook/',
  ];
  const urls = entryUrls && entryUrls.length ? entryUrls : defaultEntries;

  const report = {
    generatedAt: new Date().toISOString(),
    pages: [],
    links: [],
  };

  // Process each entry page
  for (const pageUrl of urls) {
    const pageInfo = await fetchInfo(pageUrl);
    report.pages.push({
      url: pageUrl,
      status: pageInfo.status,
      timeMs: pageInfo.timeMs,
      finalUrl: pageInfo.finalUrl,
    });

    // If we got HTML, parse links
    if (pageInfo.status && pageInfo.status >= 200 && pageInfo.status < 300) {
      try {
        const resp = await fetch(pageUrl);
        const html = await resp.text();
        const internalLinks = extractInternalLinks(html, pageUrl);
        for (const link of internalLinks) {
          const linkInfo = await fetchInfo(link);
          const linkRecord = {
            sourcePage: pageUrl,
            href: link,
            status: linkInfo.status,
            timeMs: linkInfo.timeMs,
          };
          if (!linkInfo.status || (linkInfo.status >= 400 && linkInfo.status < 600)) {
            linkRecord.error = linkInfo.error || `HTTP ${linkInfo.status}`;
          }
          report.links.push(linkRecord);
        }
      } catch (_) {
        // ignore HTML parsing errors – they will be reflected in link fetches later
      }
    }
  }

  // Write report to reports/ folder
  const datePart = report.generatedAt.slice(0, 10).replace(/-/g, '');
  const fileName = `site-health-${datePart}.json`;
  const reportsDir = fileURLToPath(new URL('../reports', import.meta.url));
  await mkdir(reportsDir, { recursive: true });
  const filePath = `${reportsDir}/${fileName}`;
  await writeFile(filePath, JSON.stringify(report, null, 2), 'utf8');

  return report;
}

// If executed directly, run with defaults
if (import.meta.main) {
  run()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('Site health watcher failed:', e);
      process.exit(1);
    });
}
