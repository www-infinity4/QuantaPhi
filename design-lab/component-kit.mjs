import {COMPONENTS,RECIPES,validateRecipe} from './component-kit-core.mjs';
import {planCoinResearch,groupCoinResults,assessCoinEvidence} from './coin-evidence-core.mjs';
import {runPowerChain} from './power-chain-core.mjs';
import {allocateBulkPool,formatUsdMinor} from './bulk-pool-core.mjs';

const $=id=>document.getElementById(id);
const make=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const parts=new Map(COMPONENTS.map(part=>[part.id,part]));
const requestedRecipe=new URLSearchParams(window.location.search).get('kit');
let recipeId=RECIPES.some(recipe=>recipe.id===requestedRecipe)?requestedRecipe:'coin-research',controller=null,lastReceipt=null,lastCoinPlan=null;
const money=formatUsdMinor;
function whole(value,label){if(!/^[1-9]\d{0,6}$/.test(String(value).trim()))throw Error(label+' must be a positive whole number, up to 9,999,999.');return Number(value);}
function cents(value,label){const text=String(value).trim();if(!/^\d{1,12}(?:\.\d{1,2})?$/.test(text))throw Error(label+' must be a nonnegative dollar amount with at most two decimal places.');const [a,b='']=text.split('.');const exact=BigInt(a)*100n+BigInt(b.padEnd(2,'0'));if(exact>BigInt(Number.MAX_SAFE_INTEGER))throw Error(label+' is too large.');return Number(exact);}
function setReceipt(receipt){lastReceipt=receipt;$('kitCopy').disabled=!receipt;$('kitCopy').textContent='Copy receipt';}
function clearResults(){setReceipt(null);$('kitResults').replaceChildren();$('kitEvidence').hidden=true;lastCoinPlan=null;}
function selectedRecipe(){return RECIPES.find(recipe=>recipe.id===recipeId);}
function paintRecipe(){
 const recipe=selectedRecipe(),check=validateRecipe(recipe);clearResults();
 for(const button of document.querySelectorAll('[data-kit-recipe]'))button.setAttribute('aria-pressed',String(button.dataset.kitRecipe===recipeId));
 $('kitCoinPanel').hidden=recipeId!=='coin-research';$('kitBulkPanel').hidden=recipeId!=='bulk-pool';
 $('kitRun').textContent=recipeId==='coin-research'?'⏻ Search coin evidence':'⏻ Calculate buying pool';$('kitRun').disabled=!check.valid;
 $('kitStatus').textContent=recipeId==='coin-research'?'Enter diagnostic features, then run the coin research kit.':'Enter the offer and buyer quantities, then calculate the complete allocation.';
 $('kitWiringStatus').textContent=check.valid?check.componentCount+' parts · '+check.wireCount+' typed connections · read-only wiring checked':check.errors.join(' ');
 $('kitPurpose').textContent=recipe.purpose;$('kitParts').replaceChildren();$('kitWires').replaceChildren();
 for(const id of recipe.components){const part=parts.get(id),item=make('li'),title=make('div',undefined,'kit-part-title');title.append(make('span',part.label),make('small',part.radioPart));item.append(title,make('p',part.purpose,'kit-part-purpose'),make('p','Inputs: '+(part.inputs.join(', ')||'user entry')+' · Outputs: '+part.outputs.join(', '),'kit-part-pins'),make('p',part.limit,'kit-part-limit'));$('kitParts').append(item);}
 for(const wire of recipe.wires)$('kitWires').append(make('li',parts.get(wire.from).label+' → '+parts.get(wire.to).label+' · '+wire.type));
}
function busy(active){
 for(const input of document.querySelectorAll('[data-kit-input], [data-kit-recipe], [data-kit-example]'))input.disabled=active;
 $('kitRun').disabled=active;$('kitStop').disabled=!active;
}
function addSources(title,leads){
 $('kitResults').append(make('h4',title+' · '+leads.length));
 if(!leads.length){$('kitResults').append(make('p','No indexed leads returned for this group.','kit-help'));return;}
 for(const lead of leads){const article=make('article',undefined,'kit-source'),link=make('a',lead.title);link.href=lead.url;link.target='_blank';link.rel='noopener noreferrer';article.append(make('small',lead.target+' · unverified search lead'),link,make('p',lead.snippet||'Open the original page to inspect its evidence.'));$('kitResults').append(article);}
}
function prepareEvidence(plan){
 lastCoinPlan=plan;$('kitEvidenceTarget').textContent='Your checks for '+plan.subject+'. These observations are user-recorded; this kit has not inspected the photographs.';
 $('kitCandidateUrl').value='';$('kitCheckRows').replaceChildren();$('kitAssessment').textContent='No diagnostic observations recorded.';
 plan.diagnostics.forEach((diagnostic,index)=>{const row=make('div',undefined,'kit-check-row');row.dataset.diagnostic=diagnostic;const select=make('select');select.id='kitCheckState'+index;select.setAttribute('aria-label',diagnostic+' observation');for(const [value,label]of [['not_visible','Not visible / unknown'],['supported','I can see supporting evidence'],['contradicted','I can see a contradiction']]){const option=make('option',label);option.value=value;select.append(option);}const reference=make('input');reference.type='url';reference.id='kitCheckReference'+index;reference.placeholder='https://www.pcgs.com/…';reference.setAttribute('aria-label',diagnostic+' reference URL');row.append(make('strong',diagnostic));const stateLabel=make('label','Your observation');stateLabel.htmlFor=select.id;const refLabel=make('label','Reference page supporting this check');refLabel.htmlFor=reference.id;row.append(stateLabel,select,refLabel,reference);$('kitCheckRows').append(row);});
 $('kitEvidence').hidden=false;
}
async function coinRun(){
 const diagnostics=$('kitDiagnostics').value.split('\n').map(text=>text.trim()).filter(Boolean);
 const plan=planCoinResearch({query:$('kitCoinQuery').value,diagnostics,limit:10});
 controller=new AbortController();busy(true);$('kitStatus').textContent='Checking 10 approved reference and marketplace source domains…';
 try{const receipt=await runPowerChain(plan,{signal:controller.signal,onStep:(_step,progress)=>{$('kitStatus').textContent=progress.completed+' / '+progress.total+' source checks · '+progress.matches+' indexed links';}});
  const grouped=groupCoinResults(receipt);addSources('Reference leads',grouped.references);addSources('Candidate listing leads',grouped.candidates);
  $('kitStatus').textContent=(receipt.stopped?'Stopped. ':'Search finished. ')+receipt.checked+' / '+receipt.targets+' source checks, '+receipt.found+' indexed leads, '+receipt.failed+' unavailable sources. Images inspected: 0. Diagnostic matches remain unverified.';
  prepareEvidence(plan);setReceipt({type:'Power-Chain-Coin-Research',version:1,subject:plan.subject,diagnostics:plan.diagnostics,coverage:grouped.coverage,finishedAt:receipt.finishedAt,references:grouped.references,candidates:grouped.candidates,assessment:null,canOrder:false});
 }finally{controller=null;busy(false);}
}
function buyerInputs(){
 const rows=$('kitBuyers').value.split('\n').map(text=>text.trim()).filter(Boolean);if(rows.length>1000)throw Error('Use at most 1,000 buyer rows.');
 return rows.map((row,index)=>{const columns=row.split(',').map(text=>text.trim());if(columns.length<2||columns.length>3||!columns[0])throw Error('Buyer row '+(index+1)+' needs a name, quantity, and optional maximum total.');const buyer={id:columns[0],quantity:whole(columns[1],'Buyer quantity')};if(columns[2])buyer.maxTotalMinor=cents(columns[2],'Buyer maximum total');return buyer;});
}
function metric(value,label){const box=make('div',undefined,'kit-total');box.append(make('strong',String(value)),make('span',label));return box;}
function bulkRun(){
 const input={offer:{quantity:whole($('kitOfferQuantity').value,'Offer quantity'),unitPriceMinor:cents($('kitUnitPrice').value,'Item price'),extraCostMinor:cents($('kitExtraCost').value,'Extra costs'),packSize:whole($('kitPackSize').value,'Minimum pack'),currency:'USD'},buyers:buyerInputs(),baselineUnitPriceMinor:cents($('kitBaselinePrice').value,'Current item price')};
 const result=allocateBulkPool(input),messages={allocated:'Fully allocated proposal. Buyer commitments and fulfillment are still unverified.',underfilled:'Incomplete pool. The remaining stock needs an explicit buyer or inventory owner.',overcommitted:'Demand exceeds the offer. No quantities were assigned; revise the requests.',incompatible_pack:'Buyer quantities do not fit the minimum pack. No quantities were assigned.',over_budget:'One or more buyers exceed their maximum total. Revise the proposal.'};
 $('kitStatus').textContent=messages[result.status]+' No order or charge was made.';
 const totals=make('div',undefined,'kit-totals');totals.append(metric(result.allocatedQuantity,'items allocated'),metric(result.unallocatedQuantity,'items unallocated'),metric(money(result.totalMinor),'total delivered input cost'));$('kitResults').append(totals);
 if(result.excessDemand)$('kitResults').append(make('p',result.excessDemand+' requested items exceed the available offer.','kit-negative'));
 if(result.unallocatedQuantity)$('kitResults').append(make('p','Unallocated stock retains '+money(result.unallocatedCostMinor)+' of the offer cost.','kit-help'));
 const wrapper=make('div',undefined,'kit-table-wrap');wrapper.tabIndex=0;wrapper.setAttribute('aria-label','Buyer allocation table');const table=make('table'),caption=make('caption','Proposed allocation by buyer');table.append(caption);const head=make('thead'),heading=make('tr');for(const title of ['Buyer','Requested','Allocated','Total','Budget']){const th=make('th',title);th.scope='col';heading.append(th);}head.append(heading);table.append(head);const body=make('tbody');for(const buyer of result.allocations){const row=make('tr');for(const value of [buyer.id,buyer.requestedQuantity,buyer.quantity,money(buyer.totalMinor),buyer.underBudget===null?'Unassigned':buyer.maxTotalMinor===null?'Not provided':buyer.underBudget?'Within limit':'Over limit'])row.append(make('td',String(value)));if(buyer.underBudget===false)row.className='kit-negative';body.append(row);}table.append(body);wrapper.append(table);$('kitResults').append(wrapper);
 const comparison=result.baselineComparison;if(comparison)$('kitResults').append(make('p',comparison.savingsMinor>0?'Equal-quantity comparison: '+money(comparison.savingsMinor)+' lower cost for '+comparison.quantity+' items, using your supplied inputs.':comparison.savingsMinor===0?'Equal-quantity comparison: no cash savings at the supplied prices. Portion size and product fit need separate evidence.':'Equal-quantity comparison: '+money(-comparison.savingsMinor)+' higher cost for '+comparison.quantity+' items, using your supplied inputs.','kit-help'));
 setReceipt({type:'Power-Chain-Bulk-Proposal',version:1,createdAt:new Date().toISOString(),input,result});
}
async function run(){if(controller)return;clearResults();try{const check=validateRecipe(selectedRecipe());if(!check.valid)throw Error(check.errors.join(' '));if(recipeId==='coin-research')await coinRun();else bulkRun();}catch(error){setReceipt(null);$('kitStatus').textContent=String(error?.message||'The kit could not complete.');}}
for(const button of document.querySelectorAll('[data-kit-recipe]'))button.addEventListener('click',()=>{if(controller)return;recipeId=button.dataset.kitRecipe;paintRecipe();});
for(const button of document.querySelectorAll('[data-kit-example]'))button.addEventListener('click',()=>{const [count,quantity]=button.dataset.kitExample.split(',').map(Number);$('kitBuyers').value=Array.from({length:count},(_,index)=>'Buyer '+(index+1)+', '+quantity).join('\n');clearResults();$('kitStatus').textContent='Example quantities filled. Calculate to check them against your current offer and costs.';});
for(const field of document.querySelectorAll('[data-kit-input]'))field.addEventListener('input',()=>{clearResults();$('kitStatus').textContent='Inputs changed. Run the kit to produce a current result.';});
$('kitRun').addEventListener('click',()=>void run());$('kitStop').addEventListener('click',()=>controller?.abort());
function invalidateAssessment(event){if(event?.target?.id==='kitCandidateUrl')for(const select of $('kitCheckRows').querySelectorAll('select'))select.value='not_visible';if(lastReceipt?.type==='Power-Chain-Coin-Research')setReceipt({...lastReceipt,assessment:null});$('kitAssessment').textContent='Checks changed. Assess the current evidence before copying an assessment.';}
$('kitEvidence').addEventListener('input',invalidateAssessment);
$('kitEvidence').addEventListener('change',invalidateAssessment);
$('kitAssess').addEventListener('click',()=>{if(!lastCoinPlan)return;invalidateAssessment();try{const observations=[...$('kitCheckRows').children].map(row=>({diagnostic:row.dataset.diagnostic,state:row.querySelector('select').value,evidenceUrl:row.querySelector('input').value}));const assessment=assessCoinEvidence({diagnostics:lastCoinPlan.diagnostics,observations,candidateUrl:$('kitCandidateUrl').value});$('kitAssessment').textContent=assessment.status.replaceAll('_',' ')+' · '+assessment.supported+' / '+assessment.required+' supported. '+assessment.explanation;if(lastReceipt?.type==='Power-Chain-Coin-Research')setReceipt({...lastReceipt,assessment});}catch(error){$('kitAssessment').textContent=error.message;}});
$('kitCopy').addEventListener('click',async()=>{if(!lastReceipt)return;try{await navigator.clipboard.writeText(JSON.stringify(lastReceipt,null,2));$('kitCopy').textContent='Receipt copied';}catch{$('kitCopy').textContent='Copy unavailable';}});
paintRecipe();
