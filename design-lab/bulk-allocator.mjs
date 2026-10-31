/* Power Chain component 002: offline, exact-quantity bulk allocation.
 * Money is integer cents. This prepares a proposal, never a purchase or wallet charge.
 */
const whole=(value,name,min,max)=>{
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<min||n>max)throw new RangeError(name+' must be an integer from '+min+' to '+max+'.');
 return n;
};
export function moneyCents(value,name='Amount'){
 const text=String(value??'').trim();
 if(!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(text))throw new RangeError(name+' must be a nonnegative amount with at most two decimal places.');
 const [d,c='']=text.split('.');
 return Number(d)*100+Number(c.padEnd(2,'0'));
}
export function formatCents(cents){
 if(!Number.isSafeInteger(cents)||cents<0)throw new RangeError('Invalid cents');
 return '$'+Math.floor(cents/100)+'.'+String(cents%100).padStart(2,'0');
}
export function planBulkAllocation({quantity,unitPrice,buyers,shipping='0',tax='0',storage='0'}={}){
 const units=whole(quantity,'Quantity',1,10000);
 const count=whole(buyers,'Buyers',1,100);
 if(count>units)throw new RangeError('Buyers cannot exceed available units.');
 const unitCents=moneyCents(unitPrice,'Unit price');
 const shippingCents=moneyCents(shipping,'Shipping');
 const taxCents=moneyCents(tax,'Tax');
 const storageCents=moneyCents(storage,'Storage');
 const goodsCents=units*unitCents;
 const sharedCents=shippingCents+taxCents+storageCents;
 const deliveredCents=goodsCents+sharedCents;
 if(!Number.isSafeInteger(deliveredCents))throw new RangeError('Total exceeds safe integer cents.');
 const base=Math.floor(units/count),extra=units%count;
 const rows=Array.from({length:count},(_,i)=>{
  const allocated=base+(i<extra?1:0);
  const goods=allocated*unitCents;
  const fee=Math.floor(sharedCents*allocated/units);
  return {buyer:i+1,units:allocated,goodsCents:goods,sharedCents:fee};
 });
 let remainder=sharedCents-rows.reduce((sum,r)=>sum+r.sharedCents,0);
 for(let i=0;remainder>0;i=(i+1)%rows.length,remainder--)rows[i].sharedCents++;
 for(const row of rows){row.deliveredCents=row.goodsCents+row.sharedCents;Object.freeze(row);}
 if(rows.reduce((sum,r)=>sum+r.units,0)!==units||rows.reduce((sum,r)=>sum+r.deliveredCents,0)!==deliveredCents)throw Error('Allocation invariant failed');
 return Object.freeze({quantity:units,buyers:count,unitPriceCents:unitCents,goodsCents,shippingCents,taxCents,storageCents,sharedCents,deliveredCents,allocatedUnits:units,unallocatedUnits:0,rows:Object.freeze(rows),
  status:'proposal_only',purchaseAuthorized:false,ordersPlaced:0,currency:'USD'});
}
