/* Authenticated Brain reasoning handoffs for existing repository jobs.
 * Red/Orange/Blue are actual model inference steps; Green writes through
 * the existing runner, not this helper. Never turn a thought into a receipt. */
import {
 COLOR_MODEL,colorCoreProfile,colorCoreSystemPrompt,validateColorThoughtResponse
} from './color-core.mjs';

export function routeColorHandoffs(task){
 const s=String(task||'').trim();
 if(!s)return [];
 const importWork=/\b(?:import|ingest|sync|migrat(?:e|ion)|data\s+feed|dataset|source\s+records)\b/i.test(s);
 const broad=/\b(?:research|design|architect|compare|decide|strategy|universal|system|across\s+all|investigate|discover|find\s+sources)\b/i.test(s);
 const scopedFix=/^(?:please\s+)?(?:fix|repair|correct|update|patch|restore)\b/i.test(s);
 const sourceReady=/^(?:please\s+)?(?:import|ingest|sync)\b/i.test(s)
   && /\b(?:verified|approved|licensed|registered|existing)\b/i.test(s);
 // A specific source fix does not need a big-picture research cycle.
 if(scopedFix&&!importWork&&!broad)return [];
 // Ordinary scoped validation/build jobs also go straight to the existing
 // authorized planner. Only genuine uncertainty/import work needs extra AI
 // roles; otherwise Red/Orange calls waste model budget and break job isolation.
 if(!broad&&!importWork)return [];
 // Already approved, source-scoped imports can go directly to Blue.
 if(sourceReady&&!broad)return ['blue'];
 return ['red','orange',...(importWork?['blue']:[])];
}

export async function runColorHandoffs(ai,{task,evidence={}}={}){
 if(typeof task!=='string'||!task.trim()||task.length>12000)throw Error('color_handoff_task_invalid');
 const roles=routeColorHandoffs(task);
 // A narrow Green repair needs no extra model or credential before the regular runner.
 if(!roles.length)return [];
 if(!ai||typeof ai.run!=='function')throw Error('color_model_unavailable');
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))throw Error('color_handoff_evidence_invalid');
 // The planner already has the pinned source; keep role inference deliberately
 // bounded and do not elevate any prior model output to user instructions.
 const source=JSON.stringify(evidence);
 if(source.length>8000)throw Error('color_handoff_evidence_too_large');
 const handoffs=[];
 for(const role of roles){
  const profile=colorCoreProfile(role);
  const input={task,evidence,previousRoleFindings:handoffs.map(h=>({role:h.role,finding:h.finding,nextAction:h.nextAction}))};
  const response=await ai.run(COLOR_MODEL,{
   messages:[{role:'system',content:colorCoreSystemPrompt(profile)},
    {role:'user',content:JSON.stringify(input).slice(0,16000)}],
   max_tokens:1300,temperature:0.1
  });
  const raw=typeof response==='string'?response:response?.response||response?.choices?.[0]?.message?.content||'';
  const start=raw.indexOf('{'),end=raw.lastIndexOf('}');
  if(start<0||end<start)throw Error('color_model_json_missing');
  const parsed=validateColorThoughtResponse(JSON.parse(raw.slice(start,end+1)),profile);
  handoffs.push({role,status:'model_inference_completed',authorizedOperationsPerformed:false,...parsed});
 }
 return handoffs;
}
