/* Public, read-only GitHub source evidence for Bubbles.
 * Never infer authorship, owner permission, browser memory, tests, or deployment
 * from a commit or a proposed PR. No owner token or wallet data is sent.
 */
const BASE='https://api.github.com/repos/www-infinity4/QuantaPhi/';
const SHA=/^[a-f0-9]{40}$/i;
const day=date=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const clean=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,125);
export function isBuildHistoryQuestion(value){
 const q=String(value||'').trim().toLowerCase();
 if(/^(?:please\s+)?(?:continue|build|create|implement|add|fix|repair|merge|push|publish|deploy)\b/.test(q))return false;
 const about=/\b(?:work|built|builds?|changed|changes?|added|merged|merges?|commits?|pull requests?|prs?|finished|completed)\b/;
 const retrospective=/\b(?:what|which|show|list|recap|remember|summari[sz]e|tell me|review|check)\b/;
 return retrospective.test(q)&&about.test(q)&&
   /\b(?:tonight|today|recent(?:ly)?|latest|already|done|finished|completed|merged|added|changed|since|so far|last night|history|status)\b/.test(q);
}
export async function readRecentBuildHistory({question='',fetcher=fetch,now=new Date()}={}){
 const urls=[BASE+'commits?per_page=30',BASE+'pulls?state=open&sort=updated&direction=desc&per_page=20'];
 const replies=await Promise.all(urls.map(async url=>{
  try{const r=await fetcher(url,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
   if(!r.ok)throw Error('http_'+r.status);
   const rows=await r.json();return Array.isArray(rows)?rows:null;
  }catch{return null}
 }));
 if(!replies[0])throw Error('Public GitHub build history unavailable; no commit or deployment status can be inferred.');
 const selectedDay=day(now);
 const scoped=/\b(?:today|tonight|this evening)\b/i.test(question);
 const eligible=item=>{
  if(!scoped)return true;
  const t=Date.parse(item.date||'');
  return Number.isFinite(t)&&day(new Date(t))===selectedDay;
 };
 const commits=replies[0].map(row=>{
  const sha=String(row?.sha||'');
  return SHA.test(sha)&&row?.commit?.message?{
   date:row.commit?.committer?.date||row.commit?.author?.date,
   title:clean(row.commit.message.split('\n')[0]),
   url:'https://github.com/www-infinity4/QuantaPhi/commit/'+sha
  }:null;
 }).filter(Boolean).filter(eligible).slice(0,6);
 const prs=(replies[1]||[]).map(row=>{
  const number=Number(row?.number);
  return Number.isSafeInteger(number)&&number>0&&row?.state==='open'?{
   date:row.updated_at,title:clean(row.title),
   number,draft:row.draft===true,
   url:'https://github.com/www-infinity4/QuantaPhi/pull/'+number
  }:null;
 }).filter(Boolean).filter(eligible).slice(0,5);
 const lines=['Public QuantaPhi GitHub '+(scoped?'changes dated '+selectedDay+' Central Time':'recent build-source activity')+':'];
 lines.push('Commits on main (source changes, not live deployment):');
 lines.push(...(commits.length?commits.map(x=>'- '+x.title+' — '+x.url):['- No matching commits among the newest 30 examined; this is not proof that no other work occurred.']));
 lines.push('Open PRs (proposed changes, NOT merged):');
 lines.push(...(replies[1]===null?['- PR feed unavailable.']:prs.length?prs.map(x=>'- PR #'+x.number+(x.draft?' [draft]':'')+': '+x.title+' — '+x.url):['- No matching open PRs among the newest 20 examined.']));
 lines.push('This is public source evidence, not a memory or authorship record. A commit or merged PR is not proof of Cloudflare deployment, successful Android playback, or Bubbles tool execution. Private ChatGPT conversations are not automatically imported.');
 return lines.join('\n');
}
