// Owner-only conversation relevance guard. This does not delete memory,
// rewrite work tickets, grant privileges or certify current production state.
const CARDONE=/(?:\bcardon(?:e|ay)\b|\bchurch of i am\b|\bwestshore south\b|\b10x westshore\b)/i;
const closedRepair=/(?:\b(?:already|now|was|were|is|are|has been|have been|we['’]ve|we have)\s+(?:fixed|resolved|completed|repaired|working)\b|\b(?:fixed|resolved|completed|repaired)\s+(?:already|before)\b|\bstop\s+(?:reopening|repairing|fixing|repeating|opening)\b|\bno longer broken\b)/i;
const clean=s=>typeof s==='string'?s:'';
const noOldCardone=row=>!CARDONE.test(clean(row?.text));
export function hasResolvedWorkNotice(text){return closedRepair.test(clean(text))&&!/\b(?:not|never)\s+(?:fixed|resolved|repaired|completed)\b/i.test(clean(text));}
/**
 * Preserve owner history in storage, but do not feed a past Cardone complaint
 * into a different current task as if it were still open work. Only the most
 * recent owner's actual words may authorize new Cardone repairs.
 */
// Old private transcripts are still retrievable on explicit request, but
// past app failures and passive room/playback observations cannot masquerade
// as today's owner commands. No stored messages are deleted or changed.
const FRESH_WINDOW_MS=7*24*60*60*1000;
const RECALL_REQUEST=/\b(?:remember|recall|history|historical|archiv(?:e|ed)|earlier|previous|two weeks ago|last week|last month|what did (?:i|we|someone) say|recorded|recording|old complaint|past complaint)\b/i;
const PAST_FAILURE=/\b(?:broken|buggy|bugs?|crash(?:ed|ing|es)?|fail(?:ed|ing|ure)?|not working|doesn['’]t work|didn['’]t work|stuck|unusable|stupid|screaming|angry|upset)\b/i;
const PASSIVE_SOURCE=/\b(?:room[_ -]?notes?|ambient(?:[_ -]?(?:speech|audio|voice))?|background[_ -]?(?:speech|audio|voice)|phone[_ -]?playback|media[_ -]?notes?|unaddressed)\b/i;
function rowTime(row){
 const raw=row?.at??row?.createdAt??row?.timestamp??null;
 if(typeof raw==='number')return Number.isFinite(raw)&&raw>0?raw:null;
 if(typeof raw==='string'){const ms=Date.parse(raw);return Number.isFinite(ms)?ms:null;}
 return null;
}
function passiveSpeech(row){
 const metadata=[row?.source,row?.origin,row?.kind,row?.channel].filter(x=>typeof x==='string').join(' ');
 return PASSIVE_SOURCE.test(metadata)||/^\s*(?:room notes?|phone playback|background speech|overheard)\s*:/i.test(clean(row?.text));
}
function staleComplaint(row,now){
 const at=rowTime(row);
 return at!==null&&at<=now&&now-at>FRESH_WINDOW_MS&&PAST_FAILURE.test(clean(row?.text));
}
function archiveLineIsStale(line,now){
 const match=/\bArchived \[(\d{4}-\d{2}-\d{2})\]/i.exec(line);
 if(!match)return false;
 const at=Date.parse(match[1]+'T00:00:00Z');
 return Number.isFinite(at)&&at<=now&&now-at>FRESH_WINDOW_MS&&PAST_FAILURE.test(line);
}

export function curateOwnerTaskContext(request,{related=[],recent=[],indexedHistory='',instructions=[],now=Date.now()}={}){
 const wantsCardone=CARDONE.test(clean(request));
 const currentClosure=wantsCardone&&hasResolvedWorkNotice(request);
 const recall=RECALL_REQUEST.test(clean(request));
 const safeRows=rows=>Array.isArray(rows)?rows.filter(row=>
  (wantsCardone||noOldCardone(row))&&
  (recall||(!passiveSpeech(row)&&!staleComplaint(row,now)))):[];
 const history=clean(indexedHistory).split('\n').filter(line=>
  (wantsCardone||!CARDONE.test(line))&&
  (recall||(!/^\s*(?:Room Notes?|Phone playback|Background speech|Overheard)\s*:/i.test(line)&&!archiveLineIsStale(line,now)))).join('\n');
 const capitalRequest=/\b(?:cardone capital|grant cardone|westshore south|10x westshore)\b/i.test(clean(request));
 const note=wantsCardone
  ?(capitalRequest?'Historical Cardone Capital property visibility and action work was merged in QuantaPhi PR #964 and PR #1035; this is distinct from Gary Cardone / Church of I AM carousel work.':
   'Historical project correction: the previously reported Gary Cardone / Church of I AM carousel and routing repairs were merged in QuantaPhi PR #964, PR #1035 and PR #1079.')+'  Cardonay is a nickname for Gary Cardone, not a different card or a new defect. A merge does not prove today’s production or device behavior. Never reopen those old complaints from retrieved memory, old anger, or assistant suggestions alone. Only inspect or submit a new repair in response to the CURRENT owner request and fresh, independently verified evidence.'+
   (currentClosure?' The latest owner message says the old repair is resolved: do not dispatch a Cardone repair.':'')
  :'';
 return {related:safeRows(related),recent:safeRows(recent),instructions:safeRows(instructions),
  indexedHistory:history,note};
}
