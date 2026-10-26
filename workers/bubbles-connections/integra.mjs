// Integra's first bounded responsibility: connection integrity at application
// entry. Input comes only from the authenticated user's server-side vault.
// Passing this check never authorizes repository writes, deployments or money.
export const ENTRY_REQUIREMENTS=Object.freeze({
 github:Object.freeze([]), // GitHub identity; installation permissions are separate.
 cloudflare:Object.freeze(['account.read'])
});
export function inspectConnectionIntegrity({accounts,configured,cloudflareFullReady,now=Date.now()}){
 const providers={};
 for(const id of ['github','cloudflare']){
  const candidates=Array.isArray(accounts)?accounts.filter(x=>x?.provider===id):[];
  const valid=candidates.filter(x=>x.status==='connected'&&x.integrityVerified===true&&
   Number.isFinite(x.expiresAt)&&x.expiresAt>now+30000);
  const required=ENTRY_REQUIREMENTS[id];
  const matching=valid.find(x=>required.every(a=>x.grantedActions?.includes(a)))||valid[0];
  const available=configured[id]===true;
  const missingActions=matching?required.filter(a=>!matching.grantedActions?.includes(a)):[];
  const scopeSetupRequired=id==='cloudflare'&&available&&!cloudflareFullReady;
  const permissionsApproved=Boolean(available&&matching&&missingActions.length===0);
  // Full project permissions are a separate, optional elevation; they are not
  // required to prove Cloudflare identity or open the Bubbles application.
  const projectPermissionsApproved=id==='cloudflare'&&Boolean(available&&matching&&cloudflareFullReady&&
    ['projects.build','ledger.read','projects.full'].every(a=>matching.grantedActions?.includes(a)));
  providers[id]={configured:available,connected:Boolean(available&&matching),permissionsApproved,
   label:permissionsApproved&&typeof matching?.label==='string'?matching.label.slice(0,160):null,
   missingActions,reconnectRequired:candidates.length>0&&!matching,
   ...(id==='cloudflare'?{fullProjectConfigured:cloudflareFullReady===true,projectPermissionsApproved,scopeSetupRequired}:{}),
   integrity:permissionsApproved?'passed':!available?'provider_setup_required':
    !matching?'verified_connection_required':'consent_required'};
 }
 const ready=providers.github.permissionsApproved&&providers.cloudflare.permissionsApproved;
 return {ok:true,mode:'required',enforced:false,enforcement:'application-entry',ready,providers,
  integra:{version:1,status:ready?'passed':'blocked',checkedAt:now,
   checks:['wallet_identity','provider_configuration','credential_integrity','credential_expiry','approved_scopes'],
   blockers:Object.entries(providers).filter(([,p])=>p.integrity!=='passed').map(([provider,p])=>({provider,reason:p.integrity})),
   executionAuthorized:false}};
}
