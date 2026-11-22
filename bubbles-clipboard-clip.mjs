// Explicit owner-approved intake of the current clipboard text.
// Never enumerate Android clipboard history or grant execution authority.
// BubblesMemory indexes only after the user approves the visible save prompt.
const TOKEN=/\b(?:ghp_|gho_|ghu_|ghs_|ghr_|github_pat_)[A-Za-z0-9_]{15,}\b|\bsk-[A-Za-z0-9_-]{24,}\b/i;
const PRIVATE_KEY=/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i;
export function prepareClipboardClip(value){
 if(typeof value!=='string')return {ok:false,reason:'not_text'};
 const text=value.replace(/\r\n?/g,'\n').trim();
 if(!text)return {ok:false,reason:'empty'};
 if(text.length<12)return {ok:false,reason:'too_short'};
 if(text.length>6000)return {ok:false,reason:'too_long'};
 if(TOKEN.test(text)||PRIVATE_KEY.test(text))return {ok:false,reason:'sensitive'};
 return {ok:true,text};
}
