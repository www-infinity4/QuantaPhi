/* Small deterministic, testable suggestions; GPT is never claimed unless invoked. */
(function(root){
'use strict';
const modes=[
 ['Image','Image'],['Trading Card','Trading Card'],['Advertisement','Advertisement'],
 ['Billboard','Billboard'],['Poster','Poster'],['Cover Art','Cover Art'],
 ['Kit Illustration','Image'],['Vintage Catalog Ad','Advertisement'],
 ['Exploded Parts Diagram','Image'],['Club Badge','Image'],
 ['Logo / Wordmark','Image'],['Instruction Booklet Cover','Cover Art'],
 ['Box Art','Cover Art'],['Sticker','Image'],['Story Illustration','Image'],
 ['Thumbnail','Image']
];
const formatInstructions={
 'Kit Illustration':'Show a credible three-dimensional view of the assembled kit with visible, era-appropriate materials and no invented specifications.',
 'Vintage Catalog Ad':'Compose a period-inspired catalog advertisement with clear product imagery and reserved space for accurate typeset copy.',
 'Exploded Parts Diagram':'Create a clean exploded-parts illustration; show only components supported by the source. Avoid invented labels or safety instructions.',
 'Club Badge':'Design a simple collectible club insignia centered on the subject, without impersonating a real brand.',
 'Logo / Wordmark':'Design an original readable emblem or wordmark inspired by the subject; do not copy existing protected logos.',
 'Instruction Booklet Cover':'Design an attractive educational instruction booklet cover, not fabricated assembly directions.',
 'Box Art':'Create original packaging illustration suitable for a kit product; reserve clear space for trustworthy copy.',
 'Sticker':'Create one bold, easily identifiable die-cut sticker concept.',
 'Story Illustration':'Depict one authentic story scene with the main subject as the focus.',
 'Thumbnail':'Create a legible 16:9 image thumbnail with a clear subject and uncluttered composition.'
};
const normal=s=>String(s||'').replace(/[<>\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,140);
const has=(t,re)=>re.test(t.toLowerCase());
function ranked(topic){
 const t=normal(topic);
 let priority=['Image','Trading Card','Poster','Cover Art','Advertisement','Exploded Parts Diagram'];
 if(has(t,/radio|electronic|receiver|clubhouse|kit|circuit|shortwave|amateur|transistor/))
  priority=['Kit Illustration','Vintage Catalog Ad','Exploded Parts Diagram','Trading Card','Club Badge','Logo / Wordmark'];
 else if(has(t,/pink floyd|music|piano|album|record|guitar|song|radio station/))
  priority=['Cover Art','Poster','Story Illustration','Trading Card','Thumbnail','Logo / Wordmark'];
 else if(has(t,/ruthenium|helium|element|physics|chemistry|molecule|atom|science/))
  priority=['Exploded Parts Diagram','Image','Trading Card','Poster','Story Illustration','Cover Art'];
 else if(has(t,/story|novel|mystery|adventure|character|fiction/))
  priority=['Story Illustration','Cover Art','Poster','Trading Card','Thumbnail','Image'];
 return priority.filter((v,i,a)=>a.indexOf(v)===i);
}
function instructions(kind){return formatInstructions[kind]||''}
function renderMode(kind){return modes.find(x=>x[0]===kind)?.[1]||'Image'}
function promptFor(topic,kind='Image'){
 const t=normal(topic);if(!t)return '';
 const subject='“'+t+'”';
 const sentences={
  'Kit Illustration':'Create a polished vintage-inspired illustration of '+subject+' as a practical electronics kit, with era-appropriate parts and a welcoming workshop. Show coils and tuning controls only where historically appropriate.',
  'Vintage Catalog Ad':'Create original mid-century catalog artwork presenting '+subject+' as an educational kit. Use tasteful retro graphic design and leave editable space for accurate advertising copy.',
  'Exploded Parts Diagram':'Illustrate '+subject+' with an educational exploded view of only verified parts; use clean separation, precise shapes and blank caption areas rather than fabricated labels.',
  'Trading Card':'Create an original collector trading card featuring '+subject+', strong hero artwork, a tasteful border, and a readable title space.',
  'Club Badge':'Design a vintage-inspired club badge featuring '+subject+' with one memorable silhouette and clean, printable edges.',
  'Logo / Wordmark':'Create a distinct, original wordmark or emblem inspired by '+subject+', using clean readable typography and avoiding copied logos.',
  'Advertisement':'Create a professional product advertisement about '+subject+', with clear imagery and a space for truthful text.',
  'Poster':'Create a striking original poster based on '+subject+' with bold composition and space for a short accurate title.',
  'Cover Art':'Create refined, original cover art inspired by '+subject+' with an expressive centerpiece.',
  'Instruction Booklet Cover':'Create an original period-inspired instruction booklet cover for '+subject+', with educational aesthetics and legible title space.',
  'Box Art':'Create original packaging illustration for '+subject+', with an appealing product scene and clear information space.',
  'Sticker':'Create a simple high-contrast die-cut sticker illustration inspired by '+subject+'.',
  'Story Illustration':'Create a cinematic but faithful story illustration based on '+subject+', avoiding invented historical claims.',
  'Thumbnail':'Create an attractive subject-first thumbnail about '+subject+' with clear shapes and editable title space.'
 };
 return sentences[kind]||'Create an original, detailed illustration of '+subject+', reflecting the topic with grounded visual details and a clear focal point.';
}
root.PhiImageSuggestions={modes:modes.map(([label,base])=>({label,renderMode:base})),ranked,renderMode,instructions,promptFor};
})(window);
