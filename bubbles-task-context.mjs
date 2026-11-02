// Owner-only conversation relevance guard. This does not delete memory,
// rewrite work tickets, grant privileges or certify current production state.
const CARDONE=/(?:\bcardon(?:e|ay)\b|\bchurch of i am\b|\bwestshore south\b|\b10x westshore\b)/i;
const closedRepair=/(?:\b(?:already|now|was|were|has been|have been)\s+(?:fixed|resolved|completed|repaired|working)\b|\b(?:fixed|resolved|completed|repaired)\s+(?:already|before)\b|\bstop\s+(?:reopening|repairing|fixing|repeating)\b|\bno longer broken\b)/i;
const clean=s=>typeof s==='string'?s:'';
const noOldCardone=row=>!CARDONE.test(clean(row?.text));
/**
 * Preserve owner history in storage, but do not feed a past Cardone complaint
 * into a different current task as if it were still open work. Only the most
 * recent owner's actual words may authorize new Cardone repairs.
 */
export function curateOwnerTaskContext(request,{related=[],recent=[],indexedHistory='',instructions=[]}={}){
 const wantsCardone=CARDONE.test(clean(request));
 const currentClosure=wantsCardone&&closedRepair.test(clean(request));
 const safeRows=rows=>Array.isArray(rows)?(wantsCardone?rows:rows.filter(noOldCardone)):[];
 const history=clean(indexedHistory).split('\n').filter(line=>wantsCardone||!CARDONE.test(line)).join('\n');
 const note=wantsCardone
  ?'Historical project correction: the previously reported Gary Cardone / Church of I AM carousel and routing repairs were merged in QuantaPhi PR #964, PR #1035 and PR #1079. Cardonay is a nickname for Gary Cardone, not a different card or a new defect. A merge does not prove today’s production or device behavior. Never reopen those old complaints from retrieved memory, old anger, or assistant suggestions alone. Only inspect or submit a new repair in response to the CURRENT owner request and fresh, independently verified evidence.'+
   (currentClosure?' The latest owner message says the old repair is resolved: do not dispatch a Cardone repair.':'')
  :'';
 return {related:safeRows(related),recent:safeRows(recent),instructions:safeRows(instructions),
  indexedHistory:history,note};
}
