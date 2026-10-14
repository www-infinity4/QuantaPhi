/**
 * Owner-only GPT-Live 1 session broker for Bubbles. THIS IS NOT a public
 * subscription proxy. Set OPENAI_API_KEY and BUBBLES_LIVE_OWNER_TOKEN as
 * Cloudflare Worker secrets before connecting. Fail closed without either.
 *
 * The OpenAI key never reaches QuantaPhi webpages or the Android app.
 * A single Live conversation is billed by OpenAI at its published rate.
 */
const ORIGIN = "https://quantaphi.org";
const path = "/v1/live/session";
function reply(status, data, origin) {
  return new Response(JSON.stringify(data), {
    status, headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Cache-Control":"no-store",
      "X-Content-Type-Options":"nosniff",
      ...(origin===ORIGIN ? {
        "Access-Control-Allow-Origin":ORIGIN,
        "Access-Control-Allow-Headers":"Authorization, Content-Type",
        "Access-Control-Allow-Methods":"POST, OPTIONS",
        "Vary":"Origin"
      } : {})
    }
  });
}
async function equalTokens(actual, expected) {
  const encoder=new TextEncoder();
  const [a,b]=await Promise.all([
    crypto.subtle.digest("SHA-256",encoder.encode(actual)),
    crypto.subtle.digest("SHA-256",encoder.encode(expected))
  ]);
  const left=new Uint8Array(a),right=new Uint8Array(b);
  let delta=0;for(let i=0;i<left.length;i++)delta|=left[i]^right[i];
  return delta===0;
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url),origin=request.headers.get("Origin");
    if(request.method==="GET" && url.pathname==="/health")
      return reply(200,{ok:true,configured:Boolean(env.OPENAI_API_KEY&&env.BUBBLES_LIVE_OWNER_TOKEN)},null);
    if(url.pathname!==path)return reply(404,{error:"Not found"},origin);
    if(origin!==ORIGIN)return reply(403,{error:"Origin denied"},origin);
    if(request.method==="OPTIONS")return new Response(null,{
      status:204,headers:{
        "Access-Control-Allow-Origin":ORIGIN,
        "Access-Control-Allow-Headers":"Authorization, Content-Type",
        "Access-Control-Allow-Methods":"POST, OPTIONS",
        "Access-Control-Max-Age":"3600",
        "Vary":"Origin"
      }
    });
    if(request.method!=="POST")return reply(405,{error:"Method not allowed"},origin);
    if(!env.OPENAI_API_KEY||!env.BUBBLES_LIVE_OWNER_TOKEN)
      return reply(503,{error:"GPT-Live is not configured. Project API key and owner authorization are required."},origin);
    const expected=String(env.BUBBLES_LIVE_OWNER_TOKEN);
    if(expected.length<32)return reply(503,{error:"Owner authorization secret is misconfigured"},origin);
    const authorization=request.headers.get("Authorization")||"";
    const submitted=authorization.startsWith("Bearer ")?authorization.slice(7):"";
    if(!submitted||submitted.length>512||!(await equalTokens(submitted,expected)))
      return reply(401,{error:"Owner authorization required"},origin);
    if(!(request.headers.get("Content-Type")||"").startsWith("application/json"))
      return reply(415,{error:"Expected JSON"},origin);
    const length=Number(request.headers.get("Content-Length")||0);
    if(length>65536)return reply(413,{error:"Offer too large"},origin);
    let payload;
    try {
      const raw=await request.text();
      if(raw.length>65536)return reply(413,{error:"Offer too large"},origin);
      payload=JSON.parse(raw);
    } catch{return reply(400,{error:"Invalid request"},origin)}
    if(typeof payload?.sdp!=="string"||!payload.sdp.startsWith("v=0")||payload.sdp.length>64000)
      return reply(400,{error:"Valid WebRTC SDP offer required"},origin);
    // Explicit client delegation: Bubbles owns its robot brain and must not
    // claim a task was executed until independently authorized and receipted.
    const session={
      model:"gpt-live-1",
      instructions:"You are Bubbles, a concise and natural voice assistant. Speak clearly, conversationally, and without robotic scripts. Listen to interruptions. Explain your capabilities accurately. Do not claim to have performed actions in QuantaPhi, the user's wallet, or robot brain. Any action must be delegated to an authenticated owner tool that provides a verified receipt.",
      audio:{output:{voice:"marin"}},
      delegation:{type:"client"},
      store:false
    };
    let upstream;
    try {
      upstream=await fetch("https://api.openai.com/v1/live/sessions",{
        method:"POST",
        headers:{
          "Authorization":"Bearer "+env.OPENAI_API_KEY,
          "Content-Type":"application/json",
        },
        body:JSON.stringify({session,transport:{type:"webrtc",sdp:payload.sdp}}),
        signal:AbortSignal.timeout(20000)
      });
    }catch{return reply(502,{error:"GPT-Live session provider connection failed"},origin)}
    if(!upstream.ok)return reply(502,{error:"GPT-Live session unavailable",upstream_status:upstream.status},origin);
    try {
      const live=await upstream.json();
      if(typeof live?.session?.id!=="string"||typeof live?.transport?.sdp!=="string")
        throw Error("Incomplete provider result");
      return reply(201,{
        session:{id:live.session.id},
        transport:{type:"webrtc",sdp:live.transport.sdp}
      },origin);
    }catch{return reply(502,{error:"Incomplete GPT-Live session response"},origin)}
  }
};
