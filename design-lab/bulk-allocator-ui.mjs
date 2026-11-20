/* Power Chain bulk-buy component: local calculation only, no checkout or wallet calls. */
import {planBulkAllocation,formatCents} from './bulk-allocator.mjs';
const form=document.getElementById('bulkAllocatorForm');
if(form){
 const output=document.getElementById('bulkAllocationResults');
 const status=document.getElementById('bulkAllocationStatus');
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 form.addEventListener('submit',event=>{
  event.preventDefault();
  output.replaceChildren();
  try{
   const fields=Object.fromEntries(new FormData(form).entries());
   const plan=planBulkAllocation(fields);
   status.textContent=plan.quantity+' units fully allocated across '+plan.buyers+' proposed buyers. Delivered total '+formatCents(plan.deliveredCents)+'. No orders placed.';
   const summary=el('p','Goods '+formatCents(plan.goodsCents)+' · Shipping '+formatCents(plan.shippingCents)+' · Tax '+formatCents(plan.taxCents)+' · Storage '+formatCents(plan.storageCents)+' · Total '+formatCents(plan.deliveredCents));
   summary.className='bulk-summary';
   const table=el('table');table.className='bulk-table';
   const caption=el('caption','Exact-quantity allocation proposal · no purchase authorization');
   const head=el('thead'),header=el('tr');
   for(const name of ['Buyer','Units','Goods','Shared costs','Delivered'])header.append(el('th',name));
   head.append(header);table.append(caption,head);
   const body=el('tbody');
   for(const row of plan.rows){
    const tr=el('tr');
    for(const value of [String(row.buyer),String(row.units),formatCents(row.goodsCents),formatCents(row.sharedCents),formatCents(row.deliveredCents)])tr.append(el('td',value));
    body.append(tr);
   }
   table.append(body);
   const wrap=el('div');wrap.className='bulk-table-scroll';wrap.tabIndex=0;wrap.setAttribute('aria-label','Scroll proposed buyer allocations horizontally if needed');wrap.append(table);
   const receipt=el('p','Receipt: '+plan.allocatedUnits+' allocated · '+plan.unallocatedUnits+' unallocated · '+plan.ordersPlaced+' orders · '+plan.status.replace('_',' ')+'. Buyer participation, actual delivered quotes, taxes and storage terms must be confirmed before any transaction.');
   receipt.className='bulk-disclosure';
   output.append(summary,wrap,receipt);
  }catch(error){
   status.textContent=error.message||'Invalid allocation inputs.';
  }
 });
 form.requestSubmit();
}
