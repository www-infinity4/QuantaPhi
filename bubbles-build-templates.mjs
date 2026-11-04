/* Source-backed Bubbles patterns. These are planning hints, never authorization. No npm. */
const REPOSITORY='www-infinity4/QuantaPhi';
const entry=data=>Object.freeze({repository:REPOSITORY,...data});
export const BUILD_TEMPLATES=Object.freeze([
 entry({
  id:'restaurants-us',title:'U.S. restaurant directory and Quick Cards',
  sourcePaths:['workers/restaurant-directory.js','restaurant-directory.mjs','data/restaurants/city-manifest.json','docs/NATIONAL-BUSINESS-DIRECTORY.md'],
  data:{kind:'cloudflare-d1-directory',table:'restaurants',endpoint:'/api/dining/search',
   fields:['id','name','city','state','category','address','latitude','longitude','website','source_name','source_url','confidence','last_seen'],
   status:'source-backed ingestion, nationwide coverage not verified'},
  reuse:['Existing Overture snapshot validation and idempotent D1 importer','Existing dining search and mobile Quick Card; filter by city and state'],
  safeguards:['Do not mark queued metro manifests as imported rows or advertise U.S.-wide completion','Source each row with provenance and actual rights; no invented hours, booking, prices, logos or photos','Review new cities and snapshots before Cloudflare D1 writes'],
  acceptance:['Verify source release, IDs, city/state boundaries and imported row counts','Test D1 idempotence, duplicate handling, search pagination and error cases','Verify actual target-city records and image rights in a live mobile card']
 }),
 entry({
  id:'business-directory',title:'Nationwide business directory pattern',
  sourcePaths:['workers/business-directory.js','business-directory-card.mjs','docs/NATIONAL-BUSINESS-DIRECTORY.md'],
  data:{kind:'cloudflare-d1-directory',table:'businesses',endpoint:'/api/business/search',
   fields:['id','name','city','state','category','address','source_url','source_name','last_seen'],
   status:'source-backed partial coverage, queued locations are not imported'},
  reuse:['Public organic business search with paginated source records','General directory card with standard Follow/Collect actions where supported'],
  safeguards:['No fabricated business, paid sponsorship, live opening status or automatic merchant partnership','Public business listings do not authorize contact, checkout or provider writes'],
  acceptance:['Validate source provenance and deduplicate source IDs','Test pagination, state/city filters and negative-path responses','Verify real returned rows and site card rendering before publishing']
 }),
 entry({
  id:'baseball-teams',title:'Baseball team directory with source-backed cards',
  sourcePaths:['sports-card-data.mjs','verified-brand-sports-cards.mjs','verified-brand-sports-catalog.mjs'],
  data:{kind:'provider-backed-team-directory',table:'not_provisioned',endpoint:'provider approval and adapter required',
   fields:['provider_team_id','team_name','league','division','home_city','official_url','source_url','checked_at','logo_rights'],
   status:'scoreboard adapter exists; persistent nationwide/team database not verified'},
  reuse:['Existing MLB schedule/feed normalization and verified game-card presentation','Separate durable team identity/roster ingestion from time-sensitive scores'],
  safeguards:['Never treat an old schedule, game result or club roster as current','Confirm provider terms and logo usage rights before persisting team assets'],
  acceptance:['Select and verify an approved provider for the target league and level','Deduplicate team IDs and verify league/season/roster boundaries','Test provider failures, freshness and real rendered team-card content']
 }),
 entry({
  id:'radio-controls',title:'Infinity Radio play/pause/next control',
  sourcePaths:['quick-infinity-radio.js','radio-clubhouse.js','bubbles-card-catalog.mjs'],
  data:{kind:'browser-media-controller',table:'none',endpoint:'/infinity-radio/oracle-track-feed.json',
   fields:['title','url','track_index','playback_state','source_failure'],
   status:'existing player source, playback in a new target requires testing'},
  reuse:['Existing Infinity Radio catalog, player button and next-track behavior','One continuous playback owner across intra-site navigation; keep track order'],
  safeguards:['Require a user gesture for audio; never promise autoplay or non-licensed music','Never call an outbound YouTube link a confirmed internal playback stream','A failed song must not silently terminate a station; do not mint credits on failed playback'],
  acceptance:['Test initial user gesture, play/pause state and manual stop','Verify broken song skip/recovery and retention of older catalog tracks','Verify playback state across actual page navigation on target Android/browser']
 }),
 entry({
  id:'site-traffic',title:'Cloudflare cumulative site traffic counter',
  sourcePaths:['site-traffic.js','docs/SITE-TRAFFIC.md','data/site-traffic-lifetime.json'],
  data:{kind:'cloudflare-analytics-ledger',table:'traffic_daily',endpoint:'/api/site-traffic',
   fields:['since','through','requests','pageViews','recordedDays','coverageContinuous','fetchedAt','refreshStatus'],
   status:'ledger exists; live provider refresh depends on Worker secret and deployment'},
  reuse:['Existing same-origin GET /api/site-traffic and optional ?refresh=1','Use validated cumulative counts, honest timestamp and last-seven-day breakdown'],
  safeguards:['Never expose Cloudflare credentials, Worker secrets or individual visitor data','Do not call stale stored data live or requests unique visitors','A refresh button cannot claim success when refreshStatus is not_configured or failed'],
  acceptance:['Render existing verified ledger with timestamp and scope on another page','Test refreshStatus=refreshed, recent, not_configured and failed paths','Verify actual Worker binding, authorized provider readback and no double counting']
 }),
 entry({
  id:'button-logic',title:'Shared accessible action button',
  sourcePaths:['quanta-card-actions.mjs','bubbles-action-driver.mjs','quick-card-builder.js'],
  data:{kind:'ui-action',table:'none',endpoint:'typed action adapter per capability',
   fields:['label','action_id','disabled','busy','error','receipt'],
   status:'generic UI pattern; provider action requires a real adapter'},
  reuse:['Existing shared Follow, Star, Collect, Share and +1 Build controls','Existing permission-checked card action driver and response receipts'],
  safeguards:['Clicking is not proof a server action executed; wait for a verified receipt','No checkout, wallet mutation, provider write or GitHub commit without typed authorization'],
  acceptance:['Test keyboard/touch, disabled, loading and failure states','Verify unique handlers, idempotency when applicable and actual action result','Verify mobile contrast, minimum tap target and owner authorization boundaries']
 }),
 entry({
  id:'quick-card',title:'Image-first universal Quick Card',
  sourcePaths:['quanta-card-actions.mjs','quick-card-preview.mjs','bubbles-card-surface.mjs','docs/UNIVERSAL-QUICK-CARD-CONTRACT.md'],
  data:{kind:'published-interactive-card',table:'existing-publisher',endpoint:'first-party card route',
   fields:['id','title','description','official_url','image_url','image_rights','capabilities','preview_mode'],
   status:'card shell exists; each new card needs real source assets and acceptance'},
  reuse:['Existing interactive same-origin preview and small toolbar','Existing image-first compact presentation and provider-specific adapter checks'],
  safeguards:['No fabricated brand image, advertisement, price or source endorsement','Do not claim official sign-in, follow sync, playback or purchase without approved provider action'],
  acceptance:['Verify source official domain and actual image rights or report image unavailable','Test touch controls, first-party preview and card-specific action outcomes','Verify mobile card loads complete media/metadata with graceful source errors']
 })
]);
const MATCHERS=[
 ['restaurants-us',text=>/\b(?:restaurants?|dining|eateries)\b/.test(text)&&/\b(?:database|directory|all|nationwide|usa|us|states?|cards?)\b/.test(text)],
 ['baseball-teams',text=>/\b(?:baseball|mlb)\b/.test(text)&&/\b(?:teams?|clubs?|rosters?|database|directory)\b/.test(text)],
 ['business-directory',text=>/\b(?:businesses|business|shops?|stores?|companies|places)\b/.test(text)&&/\b(?:database|directory|nationwide|states?|50.state)\b/.test(text)],
 ['site-traffic',text=>/\b(?:site traffic|web traffic|cloudflare traffic|page\s*views?|visitor counter|traffic counter|traffic refresh)\b/.test(text)],
 ['radio-controls',text=>/\b(?:radio|music|audio|songs?|playlist|player)\b/.test(text)&&/\b(?:play|pause|stop|button|controls?|next|resume|song|tracks?)\b/.test(text)],
 ['button-logic',text=>/\b(?:buttons?|controls?|toggles?)\b/.test(text)&&/\b(?:logic|handler|reusable|template|click|function)\b/.test(text)],
 ['quick-card',text=>/\b(?:quick.cards?|cards?|carousel)\b/.test(text)&&/\b(?:component|element|layout|template|new|create|build|design|reuse)\b/.test(text)]
];
const ACTION=/\b(?:build|create|make|add|reuse|implement|copy|expand|convert|place|insert|generate|scaffold|template)\b/;
const NO_ACTION=/^\s*(?:(?:please|bubbles|hey bubbles)[,\s:]*)?(?:do\s+not|don't|never|stop|cancel|what|how|why|where|when|who|explain|describe|compare|show\s+me|tell\s+me)\b/;
export function findBuildTemplate(request){
 if(typeof request!=='string'||request.length>3500)return null;
 const text=request.toLowerCase().replace(/\s+/g,' ').trim();
 if(!ACTION.test(text)||NO_ACTION.test(text))return null;
 for(const [id,matches] of MATCHERS)if(matches(text))return BUILD_TEMPLATES.find(x=>x.id===id)||null;
 return null;
}
/** JSON-safe source plan. Never copy untrusted request content or claim execution. */
export function makeBuildPacket(request){
 const t=findBuildTemplate(request);if(!t)return null;
 return {
  schemaVersion:1,type:'bubbles_source_build_template',templateId:t.id,title:t.title,
  state:'plan_only',sourceReadVerified:false,writeAuthorized:false,
  deployed:false,datasetComplete:false,repository:t.repository,
  requiredSourceReads:t.sourcePaths.map(path=>({repository:t.repository,path,pinToVerifiedHead:true})),
  data:t.data,reuse:t.reuse,safeguards:t.safeguards,acceptance:t.acceptance,
  nextAction:'Read the verified repository head and source files before drafting a scoped patch and tests.'
 };
}
