/* Power Chain component contracts. This module validates a schematic only.
 * It never fetches a website, changes a follow, creates an order or moves funds.
 */
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(freeze);Object.freeze(value);
 }
 return value;
};
const AUTHORITY=Object.freeze({public_read:0,private_read:1,preference_write:2,purchase:3});
const part=(id,label,radioPart,purpose,inputs,outputs,limit,maxAuthority='public_read')=>
 ({id,label,radioPart,purpose,inputs,outputs,maxAuthority,limit});

export const COMPONENTS=freeze([
 part('goal-switch','Goal input','Power switch','Accept the user’s research goal and start a bounded plan.',[],['intent'],'One explicit goal per run; repeated taps do not imply more authority.'),
 part('source-reader','Public source reader','Antenna','Find original-domain reference and listing leads through the existing public index.',['intent'],['source-records'],'Current collect circuit: at most 10 approved domains, four requests at a time.'),
 part('normalizer','Evidence normalizer','Transformer','Keep source URLs, timestamps, missing fields and record types together.',['source-records'],['evidence-records'],'Unknown fields stay unknown; public evidence carries no purchase instruction.'),
 part('diagnostic-detector','Diagnostic checklist','Detector','Associate each required diagnostic with visible support, a contradiction or missing evidence.',['evidence-records'],['diagnostic-evidence'],'User-recorded evidence only; no automatic image attribution or certification.'),
 part('ranker','Candidate assessment','Tuner','Explain diagnostic support and identify the next verification step.',['diagnostic-evidence'],['candidate-shortlist'],'Insufficient evidence cannot be promoted to a confirmed match.'),
 part('research-meter','Research result','Meter','Return a traceable candidate research result.',['candidate-shortlist'],['research-receipt'],'Report actual search coverage; no claim to inspect every available image.'),
 part('pool-input','Offer and buyer inputs','Input terminals','Accept an explicit offer and conditional buyer quantities.',[],['offer','demand'],'Integer quantities and currency minor units; no inferred buyer commitment.'),
 part('pool-allocator','Bulk demand allocator','Pooling network','Account for complete quantities, pack sizes, budgets and delivered costs.',['offer','demand'],['allocation'],'An incomplete or incompatible pool stays a proposal; no stock purchase.'),
 part('proposal-meter','Allocation proposal','Meter','Show who would receive each quantity and pay each share.',['allocation'],['proposal'],'No charge, reservation, inventory ownership or supplier confirmation.'),
 part('purchase-relay','Purchase authority boundary','Relay and fuse','Model the separate authority a financial action would require.',['proposal'],['order-receipt'],'Contract only: no order executor is provided by this kit.','purchase')
]);

const wire=(from,to,type)=>({from,to,type});
export const RECIPES=freeze([
 {
  id:'coin-research',label:'Coin diagnostic research',
  purpose:'Connect source research to a user-recorded diagnostic evidence checklist.',
  authority:'public_read',
  components:['goal-switch','source-reader','normalizer','diagnostic-detector','ranker','research-meter'],
  wires:[
   wire('goal-switch','source-reader','intent'),
   wire('source-reader','normalizer','source-records'),
   wire('normalizer','diagnostic-detector','evidence-records'),
   wire('diagnostic-detector','ranker','diagnostic-evidence'),
   wire('ranker','research-meter','candidate-shortlist')
  ],
  output:'research-receipt'
 },
 {
  id:'bulk-pool',label:'Bulk buying allocation',
  purpose:'Calculate a complete, budget-aware bulk offer allocation without placing an order.',
  authority:'public_read',
  components:['pool-input','pool-allocator','proposal-meter'],
  wires:[
   wire('pool-input','pool-allocator','offer'),
   wire('pool-input','pool-allocator','demand'),
   wire('pool-allocator','proposal-meter','allocation')
  ],
  output:'proposal'
 }
]);

const registry=new Map(COMPONENTS.map(component=>[component.id,component]));
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const hasAuthority=x=>typeof x==='string'&&Object.hasOwn(AUTHORITY,x);

/** Validate trusted component connections before a recipe is shown as ready.
 * Registry IDs select contracts; callers cannot override component authority.
 * A valid schematic is not permission to execute it or evidence of deployment.
 */
export function validateRecipe(recipe,options={}){
 const errors=[];
 const maxAuthority=isRecord(options)?(options.maxAuthority??'public_read'):null;
 let authority='public_read';
 const result=(componentCount=0,wireCount=0)=>freeze({valid:errors.length===0,errors,authority,componentCount,wireCount});
 if(!hasAuthority(maxAuthority))errors.push('Unknown authority limit.');
 if(!isRecord(recipe)){errors.push('Recipe must be an object.');return result();}
 if(!hasAuthority(recipe.authority))errors.push('Recipe must declare a known authority.');
 else authority=recipe.authority;
 if(!Array.isArray(recipe.components)||recipe.components.length===0||recipe.components.length>1000){
  errors.push('Recipe must contain between 1 and 1000 component IDs.');return result();
 }
 if(!Array.isArray(recipe.wires)||recipe.wires.length>1000){
  errors.push('Recipe wires must be an array with at most 1000 connections.');return result(recipe.components.length);
 }
 const selected=new Map();
 for(const id of recipe.components){
  if(typeof id!=='string'||!registry.has(id)){errors.push('Unknown component: '+String(id));continue;}
  if(selected.has(id)){errors.push('Duplicate component: '+id);continue;}
  const component=registry.get(id);selected.set(id,component);
  if(AUTHORITY[component.maxAuthority]>AUTHORITY[authority])authority=component.maxAuthority;
  if(hasAuthority(recipe.authority)&&AUTHORITY[component.maxAuthority]>AUTHORITY[recipe.authority])
   errors.push('Recipe authority does not cover component: '+id);
 }
 if(hasAuthority(maxAuthority)&&AUTHORITY[authority]>AUTHORITY[maxAuthority])errors.push('Recipe exceeds allowed authority: '+maxAuthority);
 const incoming=new Map([...selected].map(([id])=>[id,new Map()]));
 const outgoing=new Map([...selected].map(([id])=>[id,new Set()]));
 const seen=new Set();
 for(const connection of recipe.wires){
  if(!isRecord(connection)||typeof connection.from!=='string'||typeof connection.to!=='string'||typeof connection.type!=='string'){
   errors.push('Malformed wire.');continue;
  }
  const {from,to,type}=connection;
  if(!selected.has(from)||!selected.has(to)){errors.push('Wire endpoint is not in the recipe.');continue;}
  const key=JSON.stringify([from,to,type]);
  if(seen.has(key)){errors.push('Duplicate wire: '+from+' to '+to+' ('+type+').');continue;}
  seen.add(key);
  outgoing.get(from).add(to);
  if(from===to)errors.push('A component cannot wire to itself: '+from);
  if(!selected.get(from).outputs.includes(type)||!selected.get(to).inputs.includes(type)){
   errors.push('Incompatible wire type: '+from+' to '+to+' ('+type+').');continue;
  }
  const inputs=incoming.get(to);
  if(inputs.has(type))errors.push('Input has more than one producer: '+to+' ('+type+').');
  else inputs.set(type,from);
 }
 for(const [id,component] of selected){
  for(const type of component.inputs)if(!incoming.get(id).has(type))errors.push('Missing required input: '+id+' ('+type+').');
 }
 const visiting=new Set(),visited=new Set();let cycle=false;
 function visit(id){
  if(visiting.has(id)){cycle=true;return;}
  if(visited.has(id))return;
  visiting.add(id);for(const next of outgoing.get(id))visit(next);
  visiting.delete(id);visited.add(id);
 }
 for(const id of selected.keys())visit(id);
 if(cycle)errors.push('Recipe contains a cycle.');
 const sinks=[...selected].filter(([id,component])=>outgoing.get(id).size===0&&component.outputs.includes(recipe.output));
 if(typeof recipe.output!=='string'||sinks.length!==1)errors.push('Recipe needs exactly one terminal producer for its declared output.');
 else {
  const connected=new Set();
  function trace(id){if(connected.has(id))return;connected.add(id);for(const parent of incoming.get(id).values())trace(parent);}
  trace(sinks[0][0]);
  for(const id of selected.keys())if(!connected.has(id))errors.push('Component is disconnected from the declared output: '+id);
 }
 return result(recipe.components.length,recipe.wires.length);
}
