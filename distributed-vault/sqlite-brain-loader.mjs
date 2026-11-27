// Node-only compatibility for the existing Brain class. Authentication and
// runner handlers are imported unchanged; the HTTP host supplies serialization.
const worker=new URL('../workers/infinity-brain-clock/worker.js',import.meta.url).href;
const shim='data:text/javascript,'+encodeURIComponent('export class DurableObject { constructor(ctx,env) { this.ctx=ctx; this.env=env; } }');
export async function resolve(specifier,context,next){
 if(specifier==='cloudflare:workers'&&context.parentURL===worker)return {url:shim,shortCircuit:true};
 return next(specifier,context);
}
