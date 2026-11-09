/* In-chat Bubbles Bits evidence candidates. This is NOT an asset ledger.
 * Only the owner-authenticated backend can settle spendable wallet credits.
 * Frontend events, even real tool receipts, do not mint or transfer anything.
 */
const TOOLS=new Set(['web.search','web.read_page','google.search','github.read_file','github.search','github.read_repository','github.read_repo','bubbles.image_read',
 'github.commit','github.update_file','github.workflow_checks','github.test_result','github.merge_pull_request','github.pr_merge_receipt',
 'cloudflare.d1.create','cloudflare.d1.query','cloudflare.d1.write','cloudflare.worker.stage','cloudflare.worker.deploy','cloudflare.worker.verify','brain.runner_receipt']);
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(value);
export function newBitSession(){
 return {contextReady:false,candidateCount:0,duplicates:0,seenReceiptIds:[],creditedReceiptIds:[],recent:[],creditedBits:0,spendableBits:0,walletWrites:0};
}
export function applyBitObservation(previous,event){
 if(!event||typeof event!=='object')return previous;
 if(event.type==='session_changed')return newBitSession();
 const state={...previous,seenReceiptIds:[...previous.seenReceiptIds],creditedReceiptIds:[...(previous.creditedReceiptIds||[])],recent:[...previous.recent]};
 if(event.type==='turn_started'){state.contextReady=false;return state;}
 if(event.type==='memory'){
  state.contextReady=event.state==='retrieved';return state;
 }
 if(event.type!=='tool_receipt'||event.status!=='complete'||!TOOLS.has(event.tool)||!validId(event.receiptId)||!state.contextReady)return state;
 const credit=event.credit;
 // Display only a receipt-matched wallet confirmation delivered by the adapter.
 // This is a projection of a server credit, never an instruction to mint one.
 if(credit?.status==='credited'&&credit.asset==='BUBBLE_BIT'&&credit.amount===1&&
    credit.receiptId===event.receiptId&&credit.creditId===event.receiptId&&
    !state.creditedReceiptIds.includes(event.receiptId)&&state.creditedReceiptIds.length<500){
  state.creditedReceiptIds.push(event.receiptId);state.creditedBits++;
 }
 if(state.seenReceiptIds.includes(event.receiptId)){state.duplicates++;return state;}
 // Bounded, private-memory-free projection. Backend receipt ID is for display,
 // not a financial capability or a proof that a wallet has settled.
 if(state.seenReceiptIds.length>=500)return state;
 state.seenReceiptIds.push(event.receiptId);
 // Bound the view: never evict an ID and accidentally count a replay later.
 state.candidateCount++;
 state.recent.unshift({tool:event.tool,receiptTail:event.receiptId.slice(-8)});
 state.recent=state.recent.slice(0,6);
 return state;
}
