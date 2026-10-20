/* QuantaPhi Bubbles: first bounded semantic-to-tool plan.
 * This does NOT replace Grammar Phi, QuantaPhi retrieval or the owner Brain.
 * It joins the conversational model's typed intent with explicit user evidence
 * before an existing read-only tool runs. No phrase-to-command table.
 */
import {parseMcpFunctionCall} from './mcp.mjs';
import {parseResonanceSpeech} from './resonance.mjs';

const normalize=text=>String(text||'').normalize('NFKC').toLowerCase()
  .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const STOP=new Set(['the','and','for','with','what','when','where','which','that',
 'this','there','they','about','would','could','please','should','have',
 'from','into','some','give','tell','find','show','search','look','online',
 'latest','current','more','information','anything','something','it']);
const terms=value=>normalize(value).split(' ').filter(w=>w.length>2&&!STOP.has(w));
const matches=(a,b)=>Math.abs(Number(a)-Number(b))<1e-9*Math.max(1,Math.abs(a),Math.abs(b));
const requestHasCall=result=>{
 const calls=result?.choices?.[0]?.message?.tool_calls||result?.tool_calls||
   result?.output?.filter?.(x=>x.type==='function_call');
 return Array.isArray(calls)&&calls.length>0;
};
const needs=(reason,output)=>Object.freeze({
 status:'needs_input',reason,output,
 proof:{source:'user_utterance',validated:false},
 action:null
});

/** The model proposes an intent; this compiler never supplies guessed arguments. */
export function compileSemanticReadPlan(utterance,decision){
 const proposal=parseMcpFunctionCall(decision);
 if(!proposal){
  if(requestHasCall(decision))return needs('unresolved_or_invalid_tool_request',
   'I need a clearer target or the missing values before I can use that tool. No action was taken.');
  return Object.freeze({status:'conversation',action:null});
 }
 const question=String(utterance||'').slice(0,2500);
 if(!question.trim())return needs('request_missing','Tell me what you would like to find or calculate.');
 // For physical quantities require that the source text itself supplies
 // both values and their units, not merely model-invented parameters.
 if(proposal.name==='resonance_calculate'){
  const source=parseResonanceSpeech(question);
  if(!source)return needs('resonance_values_not_grounded',
   'What inductance and capacitance should I use? Include both values and units.');
  if(!matches(source.inductance,proposal.l)||
     !matches(source.capacitance,proposal.c)||
     source.inductanceUnit!==proposal.lUnit||
     source.capacitanceUnit!==proposal.cUnit)
   return needs('resonance_parameters_mismatch',
    'I found conflicting component values or units. Please confirm both quantities.');
 }
 if(proposal.name==='weather_current'){
  // A city guessed by the model cannot stand in for a remembered or
  // geolocated city. Future scoped memory must carry its own provenance.
  const city=normalize(proposal.location),source=normalize(question);
  if(!city||!(source===''+city||(' '+source+' ').includes(' '+city+' ')))
   return needs('weather_location_not_grounded',
    'Which town and state should I use? I will not guess your location.');
 }
 if(proposal.name==='web_search'){
  // Semantic reformulation is allowed, but at least one meaningful topic
  // token must be present in the original utterance. "Search that" cannot
  // become a model-invented person, city, or website.
  const source=new Set(terms(question)),topic=terms(proposal.query);
  if(!topic.length||!topic.some(word=>source.has(word)))
   return needs('search_subject_not_grounded',
    'What subject would you like me to search for?');
 }
 return Object.freeze({
  status:'ready',goal:proposal.name,scope:'read_only',
  relation:'user_goal_to_verified_capability',
  proof:{source:'user_utterance',validated:true},
  action:Object.freeze(proposal)
 });
}
