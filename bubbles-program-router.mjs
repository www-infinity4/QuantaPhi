// A- routing metadata only. No model, network, shell or privileged invocation.
export const programCatalog=Object.freeze([
 Object.freeze({id:'resonance.calculate',lane:'browser',repository:'www-infinity4/QuantaPhi',source:'workers/bubbles-tools/resonance.mjs',status:'route_only'}),
 Object.freeze({id:'conversation.reply',lane:'private-api',repository:'www-infinity4/QuantaPhi',source:'workers/bubbles-cloud-browser/worker.mjs',status:'host_unverified'}),
 Object.freeze({id:'repository.engineer',lane:'signed-repository',repository:'www-infinity4/Moltnook',source:'agents/repository-engine/runner.mjs',status:'authorization_required'}),
 Object.freeze({id:'repository.monitor',lane:'signed-repository',repository:'www-infinity4/Moltnook',source:'.github/workflows/moltnook-repository-engine.yml',status:'authorization_required'})
]);
export function routeProgram(id){
 const match=typeof id==='string'&&id.length<=64?programCatalog.find(p=>p.id===id):undefined;
 if(!match)return {status:'unknown_program',executionAuthorized:false};
 return {...match,executionAuthorized:false,completed:false};
}
