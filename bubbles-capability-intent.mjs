/**
 * Public, non-authorizing intent detector shared by the Bubbles page and
 * its Cloudflare tool gateway. A capability question describes tools; it
 * never reads private data, calls an owner writer or performs a code change.
 */
export function isCapabilityDiscoveryQuestion(input){
 const raw=typeof input==='string'?input.trim().slice(0,600):'';
 if(!raw)return false;
 const q=raw.replace(/^(?:(?:please|hey|hi|hello|okay|ok|bubbles)[\s,:]+)+/i,'').trim();
 if(!q||/^(?:build|create|fix|repair|modify|delete|install|deploy|merge|commit|run)\b/i.test(q))return false;
 if(/^what can you do(?: for me)?[.!?]*$/i.test(q))return true;

 // Explicit source requests always retain the existing file/web readers.
 // Merely containing "tools" in a filename or source URL is not inventory.
 const file=/\b[A-Za-z0-9_.-]+\.(?:js|mjs|jsx|ts|tsx|json|html|css|md|markdown|txt|ya?ml|py|sh|go|rs)\b/i.test(q);
 const readVerb=/^(?:show|read|open|inspect|view|fetch|find|list|summari[sz]e|describe)\b/i.test(q);
 if(file&&readVerb)return false;
 const url=/https?:\/\/[^\s"'<>]+/i.test(q);
 const asksToReadSource=/\b(?:read|summari[sz]e|inspect|fetch|described|describe|review|open|at|from)\b/i.test(q);
 const asksWhichReader=/^(?:which|what)\s+(?:tools?|skills?)\s+can\s+(?:you\s+)?(?:read|open|inspect)\b/i.test(q);
 if(url&&asksToReadSource&&!asksWhichReader)return false;

 // Questions ABOUT a restricted capability are not commands to perform it.
 // Route them to the source-backed directory, not a GitHub commit reader.
 if(/^(?:explain|tell me)\s+which\b.{0,120}\b(?:tools?|adapters?|capabilities)\b.{0,90}\b(?:can|could|would)\s+(?:commit|merge|deploy|save)\b/i.test(q))return true;
 if(/^(?:what|which)\s+(?:real|existing|registered)?\s*tools?\s+(?:would|can|could)\b.{0,100}\b(?:verify|test|check)\b/i.test(q))return true;
 if(/^(?:explain|tell me)\s+whether\s+(?:this\s+)?chat\s+can\s+(?:verify|read|check)\b.{0,160}\b(?:wallet|ledger|starcoin|quants?)\b/i.test(q))return true;
 if(!/\b(?:tools?|skills?|capabilities|abilities)\b/i.test(q))return false;
 return /^(?:(?:what|which)\s+(?:(?:are|is|do)\s+)?(?:(?:your|the|available|existing|registered)\s+)?(?:tools?|skills?|capabilities|abilities)\b|(?:where|how)\b.{0,75}\b(?:your|bubbles|available|existing)\b.{0,50}\b(?:tools?|skills?|capabilities|abilities)\b|(?:show|list|find|discover|locate)\s+(?:(?:me|us)\s+)?(?:(?:your|existing|available|registered|bubbles)\s+){0,3}(?:tools?|skills?|capabilities|abilities)\b|(?:can|could|would)\s+you\s+(?:show|list|find|locate|describe|tell)\b.{0,55}\b(?:your|existing|available)\s+(?:tools?|skills?|capabilities|abilities)\b|do\s+you\s+have\s+(?:tools?|skills?|capabilities|abilities)\b)/i.test(q);
}
