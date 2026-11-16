// Bubbles Family Safety Watch: deliberately scoped to public civilian safety sources.
export const SOURCES=Object.freeze([
 {id:'us-qatar',title:'U.S. State Department · Qatar',region:'Qatar',url:'https://travel.state.gov/en/international-travel/travel-advisories/qatar.html'},
 {id:'us-israel',title:'U.S. State Department · Israel',region:'Israel',url:'https://travel.state.gov/en/international-travel/travel-advisories/israel.html'},
 {id:'uk-qatar',title:'UK FCDO · Qatar',region:'Qatar',url:'https://www.gov.uk/foreign-travel-advice/qatar'},
 {id:'uk-israel',title:'UK FCDO · Israel',region:'Israel',url:'https://www.gov.uk/foreign-travel-advice/israel'}
].map(value=>Object.freeze(value)));
const instant=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
export function parseWatchFeed(feed,nowMs=Date.now()){
 if(feed?.schema_version!==1||feed.monitor_kind!=='official_civilian_safety_sources'||!Array.isArray(feed.sources))throw Error('invalid_public_receipt');
 const run=instant(feed.last_run_utc);
 const current=Number.isFinite(nowMs)?nowMs:Date.now();
 const sources=SOURCES.map(source=>{
  const matches=feed.sources.filter(row=>row?.id===source.id);
  const row=matches.length===1?matches[0]:null;
  const success=instant(row?.last_success_utc),checked=instant(row?.last_checked_utc),change=instant(row?.last_change_utc);
  let status='pending';
  if(row&&row.url!==source.url)status='unavailable';
  else if(!row||!['pending','ok','review_required','unavailable'].includes(row.status))status='unavailable';
  else if(row.status==='unavailable')status='unavailable';
  else if(!run||row.status==='pending')status='pending';
  else if(!success||success>current+5*60_000||run>current+5*60_000)status='unavailable';
  else if(current-success>36*60*60_000||current-run>36*60*60_000)status='stale';
  else if(row.status==='review_required'&&change)status='changed';
  else status='checked';
  return {...source,status,lastSuccessUtc:success?new Date(success).toISOString():null,
    lastCheckedUtc:checked?new Date(checked).toISOString():null,
    lastChangeUtc:change?new Date(change).toISOString():null};
 });
 return {lastRunUtc:run?new Date(run).toISOString():null,sources};
}
