/** Read-only software-memory benchmark for Bubbles; no biological materials or external I/O.
 *  The algorithms follow www-infinity4/Organic-Computation's fixed two-prototype toy task.
 *  This Workers JavaScript implementation uses its own seeded LCG sample sequence; its
 *  exact trial percentages are not interchangeable with Python's seeded results.
 */
const PATTERNS=Object.freeze([[1,1,-1,-1,1,-1],[-1,1,-1,1,-1,1]]);
const N=PATTERNS[0].length;
export function organicArgs(raw={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('invalid_arguments');
 if(Object.keys(raw).some(k=>!['seed','trials','flippedBits'].includes(k)))throw Error('invalid_arguments');
 const seed=raw.seed??111,trials=raw.trials??250,flippedBits=raw.flippedBits??1;
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||
    !Number.isSafeInteger(trials)||trials<1||trials>1000||
    !Number.isSafeInteger(flippedBits)||flippedBits<0||flippedBits>N)throw Error('invalid_arguments');
 return {seed,trials,flippedBits};
}
function train(){
 return PATTERNS[0].map((_,i)=>PATTERNS[0].map((_,j)=>
  i===j?0:PATTERNS.reduce((s,p)=>s+p[i]*p[j],0)));
}
function recall(start,weights){
 const state=[...start];
 for(let round=0;round<12;round++){
  const previous=state.join(',');
  for(let i=0;i<state.length;i++){
   const score=weights[i].reduce((s,w,j)=>s+w*state[j],0);
   if(score)state[i]=score>0?1:-1;
  }
  if(previous===state.join(','))break;
 }
 return state;
}
const hamming=(a,b)=>a.reduce((n,x,i)=>n+(x!==b[i]?1:0),0);
function nearest(state){
 return PATTERNS.reduce((winner,p)=>
   hamming(state,p)<hamming(state,winner)?p:winner,PATTERNS[0]);
}
function wilson(successes,trials){
 const z=1.96,p=successes/trials,d=1+z*z/trials;
 const center=(p+z*z/(2*trials))/d;
 const half=z*Math.sqrt(p*(1-p)/trials+z*z/(4*trials*trials))/d;
 return [successes===0?0:Math.max(0,center-half),successes===trials?1:Math.min(1,center+half)].map(n=>Number(n.toFixed(6)));
}
export function calculateOrganicBenchmark(options={}){
 const {seed,trials,flippedBits}=organicArgs(options);
 let state=seed>>>0;
 // The LCG is deterministic, not cryptographic and not Python's random.Random.
 const next=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
 const weights=train(),counts={hopfield:0,nearest_template:0,identity:0};
 for(let trial=0;trial<trials;trial++){
  const target=PATTERNS[Math.floor(next()*PATTERNS.length)];
  const observation=[...target];
  const available=Array.from({length:N},(_,i)=>i);
  for(let j=0;j<flippedBits;j++){
   const k=j+Math.floor(next()*(N-j));
   [available[j],available[k]]=[available[k],available[j]];
   const position=available[j];observation[position]=-observation[position];
  }
  const predictions={hopfield:recall(observation,weights),nearest_template:nearest(observation),identity:observation};
  for(const [name,prediction] of Object.entries(predictions))
   if(prediction.every((bit,i)=>bit===target[i]))counts[name]++;
 }
 const metrics=Object.fromEntries(Object.entries(counts).map(([name,correct])=>
  [name,{correct,total:trials,accuracy:Number((correct/trials).toFixed(6)),wilson95:wilson(correct,trials)}]));
 return {schema_version:1,model_type:'toy_binary_associative_memory',
  implementation:'bubbles_cloudflare_workers_javascript',random_generator:'lcg32_not_python_mt',
  task:'recall_original_pattern_after_bit_flips',seed,trials,flippedBits,patternCount:PATTERNS.length,patternBits:N,
  metrics,sourceRepository:'https://github.com/www-infinity4/Organic-Computation',
  limitations:['Software-only fixed two-pattern toy; no biological tissue, learning or organoid experiment',
   'Training and test use the same known prototypes; no generalization beyond this fixed task',
   'No end-to-end energy measurement or evidence for time travel or molecular computation',
   'Wilson intervals describe only artificial trial sampling uncertainty']};
}
export function organicSpeechArgs(question=''){
 const q=String(question||'').toLowerCase();
 const word={zero:0,one:1,two:2,three:3,four:4,five:5,six:6};
 const flips=/\\b([0-6]|zero|one|two|three|four|five|six)\\s+(?:flipped?\\s+bits?|bit\\s+flips?|bits?\\s+of\\s+noise)\\b/.exec(q);
 const count=/\\b(\\d{1,5})\\s+trials?\\b/.exec(q);
 const seeded=/\\bseed\\s*(?:of|=|:)?\\s*(\\d{1,10})\\b/.exec(q);
 return organicArgs({...(flips?{flippedBits:Object.hasOwn(word,flips[1])?word[flips[1]]:Number(flips[1])}:{}),
  ...(count?{trials:Number(count[1])}:{}),...(seeded?{seed:Number(seeded[1])}:{})});
}
export function describeOrganic(result){
 const percent=n=>(n*100).toFixed(1)+'%';
 return 'Digital-only Organic Computation recall test: '+result.flippedBits+' flipped bits, '+result.trials+
  ' matched trials, seed '+result.seed+'. Hopfield-style '+percent(result.metrics.hopfield.accuracy)+
  '; nearest stored-template '+percent(result.metrics.nearest_template.accuracy)+
  '; unchanged input '+percent(result.metrics.identity.accuracy)+
  '. The three methods saw identical corrupted examples. This is a software simulation, not a living biological processor or an energy-efficiency measurement. Source: '+result.sourceRepository;
}
