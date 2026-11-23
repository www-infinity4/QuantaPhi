/* Bubbles word-byte orbs & first-letter training wheels.
 * UTF-8 byte mass is a size cue, not a linguistic quality rating, token count,
 * model prediction, identity key, or a measure of a person's intent.
 * Pure local helper: no recording, network, wallet I/O or automatic typing.
 */
import {colorWindowsAlign} from './workers/unified-wallet/device-color-graph.mjs';

const enc=new TextEncoder();
const safeMode=x=>['off','training','fade'].includes(x)?x:'off';
const SECRET=/\b(?:password|passphrase|secret|api[-_ ]?key|private[-_ ]?key|token|otp|pin|recovery[-_ ]?code)\b/i;
const EXAMPLES=Object.freeze([
 'Build and test the next change in the existing repository.',
 'Check the latest GitHub workflow and show its actual result.',
 'Continue my saved project without repeating the same questions.',
 'Explain the source evidence and the remaining blockers.',
 'Find the existing issue before starting a duplicate ticket.',
 'Give me a clear plan with the smallest safe next step.',
 'Help me understand the result before making changes.',
 'Investigate the failed test and preserve the current work.',
 'Make a reviewed draft and wait for my decision.',
 'Review the actual code and do not invent receipts.',
 'Show what Bubbles can verify right now.',
 'Test the Android interface and report what is still unverified.'
]);
const graphemes=s=>{
 if(!s)return [];
 if(typeof Intl.Segmenter==='function')
  return [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(s)].map(x=>x.segment);
 return Array.from(s);
};
export function measureWordOrb(draft){
 const firstWord=typeof draft==='string'?(draft.trim().match(/^[^\s]+/u)?.[0]||'').slice(0,96):'';
 const bytes=enc.encode(firstWord).byteLength;
 const segments=graphemes(firstWord);
 const byteWeight=Math.min(100,Math.round(bytes*2.5));
 const orbSizePx=Math.min(62,20+Math.round(Math.sqrt(bytes)*7));
 return {firstWord,firstLetter:segments[0]||'',bytes,graphemes:segments.length,
  byteWeight,orbSizePx,unit:'utf8_bytes',isAuthentication:false};
}
export function suggestFirstWord(draft,{mode='off',accepted=0,skipped=0}={}){
 if(safeMode(mode)==='off'||typeof draft!=='string'||draft.length>72||
  /[\r\n]/.test(draft)||SECRET.test(draft)||Number(skipped)>=3||
  (mode==='fade'&&Number(accepted)>=5))return [];
 const prefix=draft.trim();
 // Never rewrite a composed sentence or an embedded password. The user
 // explicitly taps a full local example; typing alone does not change input.
 if(!prefix||/\s/.test(prefix)||prefix.length>22||
  !/^[\p{L}]+$/u.test(prefix))return [];
 return EXAMPLES.filter(s=>s.slice(0,prefix.length).toLocaleLowerCase()===prefix.toLocaleLowerCase())
  .slice(0,3).map(text=>({text,source:'local_examples',requiresTap:true,
   status:'possible_example_not_model_prediction'}));
}
export function acceptWordSuggestion(draft,suggestion,{explicitTap=false,caretAtEnd=false}={}){
 if(!explicitTap||!caretAtEnd||typeof draft!=='string'||typeof suggestion!=='string')return draft;
 if(!draft||draft.length>22||/\s/.test(draft)||!EXAMPLES.includes(suggestion)||
  !suggestion.toLocaleLowerCase().startsWith(draft.toLocaleLowerCase()))return draft;
 return suggestion;
}
export function nextAssistMode(mode,action){
 const current=safeMode(mode);
 if(action==='ease_off')return 'off';
 if(action==='fade'&&current==='training')return 'fade';
 if(action==='training'&&current==='off')return 'training';
 return current;
}
export function colorPassageStatus(expected,observed,byteCount=0){
 const COLOR=/^#[0-9a-f]{6}$/i;
 const valid=w=>w?.format==='wallet-color-window/v1'&&w.isAuthentication===false&&
  Number.isSafeInteger(w.deviceCount)&&w.deviceCount>=0&&
  Array.isArray(w.colors)&&w.colors.length===11&&w.colors.every(c=>typeof c==='string'&&COLOR.test(c));
 const accepted=valid(expected)&&valid(observed)&&expected.deviceCount===observed.deviceCount;
 const mask=Array.from({length:11},(_,i)=>Boolean(accepted&&
  expected.colors[i].toLowerCase()===observed.colors[i].toLowerCase()));
 const matchedTiles=mask.filter(Boolean).length;
 const aligned=accepted&&matchedTiles===11&&colorWindowsAlign(expected,observed);
 const byteWeight=Number.isSafeInteger(byteCount)&&byteCount>=0?Math.min(byteCount,4096):0;
 return {format:'bubbles-color-passage-status/v1',
  passageMask:mask,matchedTiles,totalTiles:11,aligned,
  passagesOpenForDisplay:aligned,byteWeight,
  dataAccessGranted:false,requiresSignedDeviceProof:true,
  status:aligned?'visual_alignment_only':'visual_mismatch_no_passage',
  note:'A color pattern is copyable and cannot grant any data flow. A separately authenticated server session must authorize every protected read.'};
}
