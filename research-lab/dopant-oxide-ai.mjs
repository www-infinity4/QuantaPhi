/* A static, local terminology/diagnostic helper; no model telemetry or network calls. */
export function classifyMaterialsTerm(input){
 const words=String(input??'').toLowerCase().normalize('NFKC').match(/[a-z0-9]+/g)||[];
 const q=' '+words.join(' ')+' ';
 if(/\bdopant oxide ai\b/.test(q))return 'dopant-oxide-ai';
 if(/\bdopant ai\b/.test(q))return 'dopant-ai-ambiguous';
 if(words.some(w=>['oxide','oxides','vacancy','vacancies'].includes(w)))return 'oxide-materials';
 return 'unrelated';
}
export function checkSync84(input){
 return {code:84,matched:String(input??'').trim()==='84',scope:'local-demo',brainTelemetry:false};
}
