/* Reference conditioning: retrieves original assets, then sends them through
 * the existing director/renderer. This does not fine-tune any model. */
(function(root){
'use strict';
const julius=Object.freeze({id:'infinity-julius-miller-v1',version:1,assetUrl:'/assets/julius-style-reference.jpg',exampleUrl:'/assets/julius-balloon-001.jpg',instructions:'Preserve the provided Julius Miller cartoon character: wild swept white hair, narrow lined face, heavy brows, long nose, glasses, red bow tie, teal dark academic suit. Vintage hand-painted educational animation, ink and parchment texture. Original Infinity branding; ivory border and teal-gold frame for collectible physics cards. Keep real experiment mechanisms accurate, hands anatomically correct and text readable. Use reference conditioning; do not claim model training or affiliation with another studio.'});
root.PhiGenerationReferences=Object.freeze({match:text=>/julius\s+(?:sumner\s+)?miller|professor\s+j\.?\s*s\.?\s*miller|infinity\s+physics/i.test(String(text||''))?julius:null,packs:[julius]});
})(window);
