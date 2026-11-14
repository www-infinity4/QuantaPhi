/* Verifiable public build-source seed. Additional history requires authenticated incremental scanning.
 * Links and evidence record source usage, not licensing or a contractual relationship.
 */
export const SOURCE_STATUSES=Object.freeze({
 'source-backed':'Referenced in QuantaPhi code',
 'script-present':'Integration script in source; no paid/connected proof',
 'linked-source':'Original website link, not provider API access',
 'catalog-only':'Named in metadata, not executable account access',
 'independent-spotlight':'Featured without proven paid sponsorship',
 'concept-only':'Proposed creative concept, not an advertiser relationship',
 'parent-verified':'GitHub public fork ancestry verified'
});
export const SOURCES=Object.freeze([
  {
    "id": "tinyfish",
    "name": "TinyFish",
    "category": "automation",
    "status": "source-backed",
    "detail": "Browser/source lookup modules, selective authorized site actions",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/quick-card-tinyfish-actions.mjs",
    "website": "https://www.tinyfish.ai/"
  },
  {
    "id": "cloudflare",
    "name": "Cloudflare Workers",
    "category": "infrastructure",
    "status": "source-backed",
    "detail": "QuantaPhi service bindings, deployment and D1/Worker architecture",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/workers/infinity-brain-clock/wrangler.toml",
    "website": "https://developers.cloudflare.com/workers/"
  },
  {
    "id": "github",
    "name": "GitHub",
    "category": "infrastructure",
    "status": "source-backed",
    "detail": "Code, Issues, pull requests and Actions build/review history",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/AGENTS.md",
    "website": "https://github.com/www-infinity4/QuantaPhi"
  },
  {
    "id": "bubbles",
    "name": "Bubbles skills catalog",
    "category": "automation",
    "status": "catalog-only",
    "detail": "Imported skill metadata: names and descriptions do not grant provider API access",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/docs/BUBBLES-SKILLS-PLUGIN-CATALOG.md",
    "website": "https://github.com/www-infinity4/QuantaPhi"
  },
  {
    "id": "xgrok",
    "name": "X / Grok",
    "category": "automation",
    "status": "source-backed",
    "detail": "Native X guide, authorized-post handoff and consent-aware automation plans; not a live Grok model API",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/quanta-integra-x-tour.mjs",
    "website": "https://x.com/"
  },
  {
    "id": "googleanalytics",
    "name": "Google Analytics",
    "category": "infrastructure",
    "status": "script-present",
    "detail": "GA4 measurement tag present on homepage; account metrics and payments not verified",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/index.html",
    "website": "https://analytics.google.com/"
  },
  {
    "id": "adsense",
    "name": "Google AdSense",
    "category": "advertising",
    "status": "script-present",
    "detail": "Ad-serving script present on homepage; no revenue amount or campaign contract inferred",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/index.html",
    "website": "https://www.google.com/adsense/"
  },
  {
    "id": "mlb",
    "name": "MLB StatsAPI",
    "category": "information",
    "status": "source-backed",
    "detail": "Score and schedule data endpoint in World Series code",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/world-series-score.mjs",
    "website": "https://statsapi.mlb.com/"
  },
  {
    "id": "fox",
    "name": "FOX / FOX Sports",
    "category": "information",
    "status": "linked-source",
    "detail": "Official watch and sports links; QuantaPhi does not acquire broadcast rights",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/world-series-score.mjs",
    "website": "https://www.foxsports.com/mlb"
  },
  {
    "id": "gutenberg",
    "name": "Project Gutenberg",
    "category": "information",
    "status": "source-backed",
    "detail": "Public-domain book/source discovery link in Infinity Stories",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/infinity-story-channels.mjs",
    "website": "https://www.gutenberg.org/"
  },
  {
    "id": "gutendex",
    "name": "Gutendex",
    "category": "information",
    "status": "source-backed",
    "detail": "Books catalog search adapter referenced in Infinity Stories",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/infinity-story-channels.mjs",
    "website": "https://gutendex.com/"
  },
  {
    "id": "wikipedia",
    "name": "Wikipedia",
    "category": "information",
    "status": "source-backed",
    "detail": "Article/API discovery for stories and research; attribution remains with sources",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/infinity-story-channels.mjs",
    "website": "https://en.wikipedia.org/"
  },
  {
    "id": "ebay",
    "name": "eBay",
    "category": "information",
    "status": "linked-source",
    "detail": "Public auction/product lookup links, not authenticated purchasing",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/quanta-feed-catalog.mjs",
    "website": "https://www.ebay.com/"
  },
  {
    "id": "pcgs",
    "name": "PCGS",
    "category": "information",
    "status": "linked-source",
    "detail": "Original coin grading/reference links",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/quanta-feed-catalog.mjs",
    "website": "https://www.pcgs.com/photograde"
  },
  {
    "id": "ngc",
    "name": "NGC",
    "category": "information",
    "status": "linked-source",
    "detail": "Coin Explorer official reference links",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/quanta-feed-catalog.mjs",
    "website": "https://www.ngccoin.com/coin-explorer/"
  },
  {
    "id": "radiomuseum",
    "name": "RadioMuseum",
    "category": "information",
    "status": "linked-source",
    "detail": "Historical radio product and documentation pages",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/quanta-feed-catalog.mjs",
    "website": "https://www.radiomuseum.org/"
  },
  {
    "id": "accepted",
    "name": "Infinity Accepted brands",
    "category": "advertising",
    "status": "independent-spotlight",
    "detail": "Owner-curated brands in QuantaPhi; not verified affiliate/sponsor approvals",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/infinity-accepted-catalog.mjs",
    "website": "https://quantaphi.org/infinity-accepted.html"
  },
  {
    "id": "quickads",
    "name": "Quick Ads brands",
    "category": "advertising",
    "status": "independent-spotlight",
    "detail": "Independent site spotlights are not paid cooperative advertisers",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/quick-ads-core.mjs",
    "website": "https://quantaphi.org/"
  },
  {
    "id": "bubbleyum",
    "name": "BUBBLE YUM / Hershey",
    "category": "advertising",
    "status": "concept-only",
    "detail": "Owner-requested micro-ad concept; no sponsor, creative or resale agreement verified",
    "evidence": "https://github.com/www-infinity4/QuantaPhi/blob/main/work/unfinished/TICKET-1320.md",
    "website": "https://www.hersheyland.com/bubbleyum"
  },
  {
    "id": "fork-moltnook",
    "name": "Moltnook",
    "category": "github-fork",
    "status": "parent-verified",
    "detail": "Public fork of www-infinity/Moltnook, verified by GitHub repo metadata",
    "evidence": "https://github.com/www-infinity4/Moltnook",
    "website": "https://github.com/www-infinity/Moltnook"
  },
  {
    "id": "fork-infinity-synapses",
    "name": "Infinity-Synapses",
    "category": "github-fork",
    "status": "parent-verified",
    "detail": "Public fork of www-infinity/Infinity-Synapses, verified by GitHub repo metadata",
    "evidence": "https://github.com/www-infinity4/Infinity-Synapses",
    "website": "https://github.com/www-infinity/Infinity-Synapses"
  },
  {
    "id": "fork-c13b0",
    "name": "C13b0",
    "category": "github-fork",
    "status": "parent-verified",
    "detail": "Public fork of www-infinity/C13b0, verified by GitHub repo metadata",
    "evidence": "https://github.com/www-infinity4/C13b0",
    "website": "https://github.com/www-infinity/C13b0"
  },
  {
    "id": "fork-hydrogen-radio",
    "name": "Hydrogen-Radio",
    "category": "github-fork",
    "status": "parent-verified",
    "detail": "Public fork of www-infinity/Hydrogen-Radio, verified by GitHub repo metadata",
    "evidence": "https://github.com/www-infinity4/Hydrogen-Radio",
    "website": "https://github.com/www-infinity/Hydrogen-Radio"
  },
  {
    "id": "fork-r2d2",
    "name": "R2D2",
    "category": "github-fork",
    "status": "parent-verified",
    "detail": "Public fork of www-infinity/R2D2, verified by GitHub repo metadata",
    "evidence": "https://github.com/www-infinity4/R2D2",
    "website": "https://github.com/www-infinity/R2D2"
  },
  {
    "id": "fork-zelda-nes",
    "name": "Zelda-NES",
    "category": "github-fork",
    "status": "parent-verified",
    "detail": "Public fork of www-infinity/Zelda-NES, verified by GitHub repo metadata",
    "evidence": "https://github.com/www-infinity4/Zelda-NES",
    "website": "https://github.com/www-infinity/Zelda-NES"
  }
].map(row=>Object.freeze(row)));
export function filterSources({category='all',query=''}={}){
 const needle=String(query||'').trim().toLowerCase().slice(0,100);
 return SOURCES.filter(row=>(category==='all'||row.category===category)&&(!needle||[row.name,row.detail,row.status,row.category].join(' ').toLowerCase().includes(needle)));
}
export const VERIFIED_COOPERATIVE_ADVERTISERS=Object.freeze([]);
// Empty by design: do not infer partner payment, license or platform endorsement from a source link.
