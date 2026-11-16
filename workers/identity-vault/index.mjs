/* Reserved private Cloudflare service for the first-party Bubbles verifier.
 * Deliberately no public enrollment, SSN upload or approval endpoint.
 * Remains closed until authenticated review and evidence validation are tested. */
const headers={'Cache-Control':'no-store, private','Content-Type':'application/json','X-Robots-Tag':'noindex'};
export default {
 async fetch(request){
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/v1/session/eligibility'){
   return Response.json({error:'identity_review_not_enabled'},{status:503,headers});
  }
  return Response.json({error:'not_found'},{status:404,headers});
 }
};
