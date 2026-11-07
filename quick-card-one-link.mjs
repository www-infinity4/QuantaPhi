/* Single-field, safe website draft. No site crawl or AI inference is claimed. */
const invalid = () => new Error('Enter a valid public HTTPS website, such as www.bubbleyum.com.');
export function normalizeWebsiteInput(value) {
  const input=String(value??'').trim();
  if (!input || input.length>900 || /[\s\\]/.test(input)) throw invalid();
  if (/^[a-z][a-z0-9+.-]*:/i.test(input) && !input.startsWith('https://')) throw invalid();
  let url;
  try {url=new URL(input.startsWith('https://')?input:'https://'+input);} catch {throw invalid();}
  const host=url.hostname.toLowerCase();
  const labels=host.split('.');
  if (url.protocol!=='https:' || url.username || url.password || url.port ||
      labels.length<2 || labels.some(label=>!label || label.length>63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)) ||
      !/[a-z]/i.test(labels.at(-1)) || /^(?:localhost|\d+\.\d+\.\d+\.\d+)$/.test(host) ||
      /\.(?:local|localhost|internal|test|invalid)$/i.test(host) || url.href.length>900) throw invalid();
  url.hash='';
  return url.href;
}
export function buildWebsiteCardDraft(fields) {
  const website=normalizeWebsiteInput(fields?.website);
  const host=new URL(website).hostname.replace(/^www\./i,'');
  const label=host.split('.')[0].replace(/[-_]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase()).slice(0,48);
  const title=String(fields?.title||'').trim() || (label+' · Website Quick Card').slice(0,85);
  return {
    title,website,
    description:String(fields?.description||'').trim() || ('Explore public source pages at '+host+'. Product information, images and available actions require verification.'),
    interactionRequest:String(fields?.interactionRequest||'').trim() || 'Open the source website and display only verified working interactions. Never invent playback, inventory, login, pricing or an endorsement.',
    kind:String(fields?.kind||'visit'),
    searchTemplate:String(fields?.searchTemplate||'').trim(),video:String(fields?.video||'').trim(),
    previewMode:String(fields?.previewMode||'interactive'),image:String(fields?.image||'').trim()
  };
}