/* QuantaPhi: infer literal display words from an ordinary image request.
   Never ask a model to respell a customer's brand, headline or slogan.
   A normal illustration prompt has no lettering; opt-in advanced words win. */
(function(root){
'use strict';
const LIMIT=120;
const CLEAN=s=>String(s||'').replace(/[\u201c\u201d]/g,'"').trim();
const phrase=s=>String(s||'').replace(/^[\s"'“”'«»]+|[\s"'“”'«»]+$/g,'').replace(/\s+/g,' ').trim();
const noWords=/\b(?:without|no|avoid|exclude|omit|don't (?:add|include|print|show)|do not (?:add|include|print|show))\s+(?:any\s+)?(?:text|lettering|words?|captions?|titles?|writing)\b/i;
const presentation=/\b(?:poster|billboard|advertisement|advert|ad|banner|cover|flyer|trading card|logo|title card|promo|brand|headline|slogan|tagline|subtitle|phrase|words?|lettering|typography|written|print|says|reads)\b/i;
const startVerb=/^(?:please\s+)?(?:create|make|draw|generate|show|illustrate|paint|render|design|visualize|depict|build|turn|use|imagine|produce)\b/i;
function infer(description,mode='Image',manual=''){
 const wanted=String(manual||'').trim();
 if(wanted)return {text:wanted,length:wanted.length,source:'advanced',error:wanted.length>LIMIT?'exact_words_too_long':null};
 const request=CLEAN(description);
 if(!request||noWords.test(request))return {text:'',source:'none'};
 const labels=[];const add=(value,role)=>{const t=phrase(value).replace(/[.;,:]\s*$/,'');if(!t||t.length>105||labels.some(x=>x.text.toLowerCase()===t.toLowerCase()))return;labels.push({text:t,role})};
 const lines=request.split(/\n+/).map(x=>x.trim()).filter(Boolean);
 // Explicit lines are the highest-confidence case. Literal characters come
 // directly from what the user typed, with no AI paraphrasing.
 for(const line of lines){
  const named=line.match(/^(?:[-*]\s*)?(title|heading|headline|brand(?:\s+name)?|name|subtitle|tagline|slogan|phrase|caption|words?(?:\s+on\s+(?:the\s+)?image)?)\s*:\s*(.+)$/i);
  if(named)add(named[2],/tagline|subtitle|slogan|phrase|caption/i.test(named[1])?'tagline':'title');
 }
 const quotes=[...request.matchAll(/["“]([^"”\n]{1,105})["”]/g)].map(m=>({text:m[1],index:m.index}));
 for(const q of quotes){
  const prev=request.slice(Math.max(0,q.index-90),q.index);
  if(/\b(?:slogan|tagline|subtitle|phrase|quote|words?|says|reads|prints?|lettering|title|heading|headline|called|named|brand|caption)\b/i.test(prev)||presentation.test(request)&&/\b(?:poster|billboard|advertisement|flyer|banner|cover|card)\b/i.test(request))
   add(q.text,/\b(?:slogan|tagline|subtitle|phrase|quote|caption)\b/i.test(prev)?'tagline':'title');
 }
 // Unquoted direction: "title Oracle AI Studio - Mosaic" or "slogan: ..."
 const explicit=/\b(title|heading|headline|brand(?:\s+name)?|tagline|subtitle|slogan|phrase|words?)\s+(?:is|of|reading|that\s+says|should\s+(?:say|read)|as|:)?\s*([A-Z][^.,;!?\n"“”]{3,85}?)(?=\s+(?:with|and\s+(?:the|a)|plus|using|in\s+(?:the|a)\s+style)|[.,;!?\n]|$)/g;
 for(const match of request.matchAll(explicit))add(match[2],/tagline|subtitle|slogan|phrase/i.test(match[1])?'tagline':'title');
 // An explicitly named poster/product: "poster for Oracle AI Studio - Mosaic".
 const brand=/(?:\b(?:poster|billboard|advertisement|ad|banner|flyer|cover|promotion|promo|trading card)\s+(?:for|promoting)\s+)([A-Z][^.,;!?\n"“”]{2,75}?)(?=\s+(?:with|featuring|showing|using|in\s+(?:a|the)|and\s+(?:a|the))|[.,;!?\n]|$)/i;
 const found=request.match(brand);if(found)add(found[1],'title');
 // A two-line design brief can itself be the requested copy.
 const titleCase=s=>/^[A-Z][^.!?]{2,65}$/.test(s)&&!startVerb.test(s)&&!/\b(?:with|under|beside|holding|walking|standing|reading|looking)\b/i.test(s);
 if(!labels.length&&lines.length<=2&&lines.length>0){
  const design=/Poster|Cover Art|Advertisement|Billboard|Trading Card/.test(mode);
  if(titleCase(lines[0])&&(design||lines[0].includes(' - ')||lines[0].includes(' — '))){
   add(lines[0],'title');
   if(lines[1]&&titleCase(lines[1]))add(lines[1],'tagline');
  }
 }
 if(!labels.length)return {text:'',source:'none'};
 // An explicit title takes precedence over a separately quoted tagline,
 // regardless of the order in which they appeared in the request.
 const selected=[...labels.filter(x=>x.role==='title'),...labels.filter(x=>x.role!=='title')].slice(0,2);
 const text=selected.map(x=>x.text).join('\n');
 if(text.length>LIMIT)return {text:'',source:'too_long',error:'exact_words_too_long',requested:text};
 return {text,source:'inferred',parts:selected};
}
root.PhiImageLanguage={infer,limit:LIMIT};
if(typeof module!=='undefined')module.exports={infer,limit:LIMIT};
})(typeof window!=='undefined'?window:{});
