// Compact presentation of a registered same-origin application. Keep its live
// nodes and listeners intact; never clone media or execute fetched HTML.
export function compactCardDocument(doc,card){
 if(!doc?.body||!doc.createElement)return {supported:false}; // minimal unit transports
 const roots=[...doc.querySelectorAll(card.surface||'main, [role="main"]')];
 if(!roots.length)throw Error('This tool has no registered compact surface. Use Open webpage to work with its full page.');
 for(const root of roots){
  root.classList.add('bubbles-card-root');
  for(let parent=root.parentElement;parent&&parent!==doc.body;parent=parent.parentElement)parent.classList.add('bubbles-card-path');
 }
 const style=doc.createElement('style');style.id='bubbles-compact-surface';
 style.textContent=`
 html,body{margin:0!important;padding:0!important;min-width:0!important;min-height:0!important;background:#fff!important;color:#231c3c!important}
 body > :not(.bubbles-card-root):not(.bubbles-card-path),.bubbles-card-path > :not(.bubbles-card-root):not(.bubbles-card-path){display:none!important}
 .bubbles-card-path{margin:0!important;padding:0!important;min-height:0!important;max-width:100%!important;width:auto!important}
 .bubbles-card-root{box-sizing:border-box!important;margin:0!important;padding:16px!important;max-width:100%!important;width:100%!important;min-height:0!important;background:#fff!important;border:0!important;box-shadow:none!important}
 `;
 doc.head.append(style);
 return {supported:true,roots:roots.length};
}
