/* Power Chain bulk component: exact-quantity, integer-cent proposals only.
 * This module has no network, wallet, storage, ordering or charging capability.
 */
const MAX=BigInt(Number.MAX_SAFE_INTEGER);
const integer=(value,name,min=0)=>{
 if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min)throw new TypeError(name+' must be a safe integer of at least '+min+'.');
 return value;
};
const safe=(value,name)=>{
 if(value<0n||value>MAX)throw new RangeError(name+' exceeds safe integer arithmetic.');
 return Number(value);
};
const add=(a,b,name)=>safe(BigInt(a)+BigInt(b),name);
const multiply=(a,b,name)=>safe(BigInt(a)*BigInt(b),name);
const identity=value=>{
 if(typeof value!=='string'||!value.trim()||value.length>80||/[\u0000-\u001f\u007f]/.test(value))throw new TypeError('Buyer ID must be a nonempty string of at most 80 characters without control characters.');
 return value.trim();
};

/** Format safe integer USD cents without converting the fractional amount to a
 * floating point dollar value. Large exact totals must keep their final cent. */
export function formatUsdMinor(value){
 if(typeof value!=='number'||!Number.isSafeInteger(value))throw new TypeError('USD cents must be a safe integer.');
 const exact=BigInt(value),magnitude=exact<0n?-exact:exact;
 const dollars=new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(magnitude/100n);
 return (exact<0n?'-':'')+'$'+dollars+'.'+String(magnitude%100n).padStart(2,'0');
}

/** Share extras over the complete case, including an explicit unallocated-stock
 * bucket. Largest remainders receive the remaining cents, with input order as
 * the stable tie breaker. BigInt keeps intermediate products exact.
 */
function costShares(extraCostMinor,quantities,totalQuantity){
 const divisor=BigInt(totalQuantity),extra=BigInt(extraCostMinor);
 const parts=quantities.map((quantity,index)=>{
  const product=extra*BigInt(quantity);
  return {index,amount:Number(product/divisor),remainder:product%divisor};
 });
 let remaining=extraCostMinor-parts.reduce((sum,p)=>sum+p.amount,0);
 const ranked=[...parts].sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1);
 for(let i=0;i<remaining;i++)ranked[i].amount++;
 return parts.map(p=>p.amount);
}

/**
 * Build a proposal for one indivisible supplier offer.
 * offer.packSize is the smallest whole quantity that can be assigned to a buyer.
 * Oversubscribed or pack-incompatible demand is left unresolved, not silently
 * trimmed or prioritized. Unallocated stock retains its own share of costs.
 * A complete allocation remains a proposal; canOrder is always false.
 */
export function allocateBulkPool({offer,buyers,baselineUnitPriceMinor}={}){
 if(!offer||typeof offer!=='object'||Array.isArray(offer))throw new TypeError('An offer is required.');
 const quantity=integer(offer.quantity,'Offer quantity',1);
 const unitPriceMinor=integer(offer.unitPriceMinor,'Unit price');
 const extraCostMinor=integer(offer.extraCostMinor===undefined?0:offer.extraCostMinor,'Extra cost');
 const packSize=integer(offer.packSize===undefined?1:offer.packSize,'Pack size',1);
 if(packSize>quantity||quantity%packSize!==0)throw new TypeError('Offer quantity must contain whole packs.');
 const currency=offer.currency===undefined?'USD':offer.currency;
 if(typeof currency!=='string'||!/^[A-Z]{3}$/.test(currency))throw new TypeError('Currency must be an uppercase three-letter code.');
 if(!Array.isArray(buyers)||buyers.length>1000)throw new TypeError('Buyers must be an array of at most 1000 entries.');
 if(baselineUnitPriceMinor!==undefined)integer(baselineUnitPriceMinor,'Baseline unit price');
 const seen=new Set();
 const participants=Array.from(buyers,buyer=>{
  if(!buyer||typeof buyer!=='object'||Array.isArray(buyer))throw new TypeError('Each buyer must be an object.');
  const id=identity(buyer.id);
  if(seen.has(id))throw new TypeError('Duplicate buyer ID: '+id);
  seen.add(id);
  const requestedQuantity=integer(buyer.quantity,'Buyer quantity',1);
  const maxTotalMinor=buyer.maxTotalMinor===undefined?null:integer(buyer.maxTotalMinor,'Buyer budget');
  return {id,requestedQuantity,maxTotalMinor};
 });
 const requestedQuantity=participants.reduce((sum,buyer)=>add(sum,buyer.requestedQuantity,'Total demand'),0);
 const subtotalMinor=multiply(quantity,unitPriceMinor,'Offer subtotal');
 const totalMinor=add(subtotalMinor,extraCostMinor,'Offer total');
 const incompatibleBuyerIds=participants.filter(b=>b.requestedQuantity%packSize!==0).map(b=>b.id);
 const excessDemand=Math.max(0,requestedQuantity-quantity);
 const compatible=incompatibleBuyerIds.length===0;
 const demandFits=excessDemand===0;
 const allocatedQuantity=compatible&&demandFits?requestedQuantity:0;
 const unallocatedQuantity=quantity-allocatedQuantity;
 const assigned=participants.map(b=>compatible&&demandFits?b.requestedQuantity:0);
 const extras=costShares(extraCostMinor,[...assigned,unallocatedQuantity],quantity);
 const allocations=participants.map((buyer,index)=>{
  const count=assigned[index];
  const buyerSubtotal=multiply(count,unitPriceMinor,'Buyer subtotal');
  const total=add(buyerSubtotal,extras[index],'Buyer total');
  const underBudget=count===0?null:buyer.maxTotalMinor===null||total<=buyer.maxTotalMinor;
  const baselineTotal=baselineUnitPriceMinor===undefined||count===0?null:multiply(count,baselineUnitPriceMinor,'Buyer baseline');
  return Object.freeze({
   id:buyer.id,requestedQuantity:buyer.requestedQuantity,quantity:count,
   subtotalMinor:buyerSubtotal,extraCostMinor:extras[index],totalMinor:total,
   unitPriceMinor,unitCost:Object.freeze({numeratorMinor:total,quantity:count}),
   maxTotalMinor:buyer.maxTotalMinor,underBudget,
   baselineTotalMinor:baselineTotal,savingsMinor:baselineTotal===null?null:baselineTotal-total
  });
 });
 const unallocatedCostMinor=add(multiply(unallocatedQuantity,unitPriceMinor,'Unallocated subtotal'),extras.at(-1),'Unallocated total');
 const withinBudgets=allocations.every(b=>b.underBudget!==false);
 const fullyAllocated=compatible&&demandFits&&unallocatedQuantity===0;
 let status='allocated';
 if(!compatible)status='incompatible_pack';
 else if(!demandFits)status='overcommitted';
 else if(!withinBudgets)status='over_budget';
 else if(!fullyAllocated)status='underfilled';
 const baselineTotal=baselineUnitPriceMinor===undefined?null:multiply(quantity,baselineUnitPriceMinor,'Offer baseline');
 const baselineComparison=baselineTotal===null?null:Object.freeze({
  comparison:'equal_quantity',quantity,baselineUnitPriceMinor,baselineTotalMinor:baselineTotal,
  proposedTotalMinor:totalMinor,savingsMinor:baselineTotal-totalMinor,
  improvesCashCost:baselineTotal>totalMinor
 });
 return Object.freeze({
  status,proposalOnly:true,canOrder:false,currency,offerQuantity:quantity,packSize,
  requestedQuantity,allocatedQuantity,unallocatedQuantity,excessDemand,
  fullyAllocated,withinBudgets,allocationReady:fullyAllocated&&withinBudgets,
  subtotalMinor,extraCostMinor,totalMinor,unallocatedCostMinor,
  allocations:Object.freeze(allocations),incompatibleBuyerIds:Object.freeze(incompatibleBuyerIds),baselineComparison
 });
}
