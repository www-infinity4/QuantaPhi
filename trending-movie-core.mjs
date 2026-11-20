/* Stable, provenance-checked movie cards. No made-up Google ranking or video IDs. */
const VIDEO=/^[A-Za-z0-9_-]{11}$/;
const SOURCE='https://trends.google.com/trending/rss?geo=US';
const LABEL='Google Trends RSS + publisher trailer RSS';
const days=n=>n*86400000;
export const movieCardId=id=>VIDEO.test(String(id||''))?'trendMovie'+id:'';
export const MOVIE_FEED='/data/trending-movies-latest.json';
export const MOVIE_FEED_BACKUP='https://raw.githubusercontent.com/www-infinity4/QuantaPhi/trends-rss-data/data/trending-movies-latest.json';
export function validateMovieSnapshot(value,clock=Date.now()){
 if(!value||value.schema_version!==1||value.source!==LABEL||value.source_url!==SOURCE||!Array.isArray(value.items))return false;
 const time=Date.parse(value.checked_at),now=Number(clock);
 return Number.isFinite(time)&&Number.isFinite(now)&&time<=now+300000&&now-time<=days(3);
}
function safeEntry(row,now){
 if(!row||row.kind!=='trailer'||!VIDEO.test(row.video_id)||!movieCardId(row.video_id))return false;
 if(!/^[\p{L}\p{N}][\p{L}\p{N}\s:,'&().!?–—-]{1,100}$/u.test(row.title||''))return false;
 if(!String(row.video_title||'').toLowerCase().includes(String(row.title).toLowerCase())&&
    !String(row.video_title||'').toLowerCase().replace(/[^a-z0-9]/g,'').includes(String(row.title||'').toLowerCase().replace(/[^a-z0-9]/g,'')))return false;
 if(!['Rotten Tomatoes Trailers','Warner Bros. Pictures'].includes(row.publisher))return false;
 if(row.source_url!=='https://www.youtube.com/watch?v='+row.video_id)return false;
 if(row.poster!=='https://i.ytimg.com/vi/'+row.video_id+'/hqdefault.jpg')return false;
 const published=Date.parse(row.published_at);
 if(!Number.isFinite(published)||published>now+300000||now-published>days(90))return false;
 if(row.google_trending===true){
  if(typeof row.trend_query!=='string'||row.trend_query.trim().length<4||!/^(\d+(?:,\d+)*(?:\.\d+)?[KMB]?\+)$/.test(row.approx_searches||''))return false;
  const checked=Date.parse(row.trend_checked_at);
  if(!Number.isFinite(checked)||checked>now+300000||now-checked>days(21))return false;
 }else if(row.google_trending!==false)return false;
 return true;
}
export function selectTrendMovieCards(snapshot,clock=Date.now()){
 if(!validateMovieSnapshot(snapshot,clock))return [];
 const now=Number(clock),seen=new Set();
 const out=[];
 for(const row of snapshot.items.slice(0,100)){
  if(!safeEntry(row,now)||seen.has(row.video_id))continue;
  seen.add(row.video_id);
  out.push({...row});
 }
 out.sort((a,b)=>Number(b.google_trending)-Number(a.google_trending)||
  Date.parse(b.trend_published_at||b.published_at)-Date.parse(a.trend_published_at||a.published_at));
 return out.slice(0,12);
}
