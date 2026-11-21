// Only Worker service bindings receive the bridge credential. Never a browser.
export function authorized(request,env){
 const expected=env.TINYFISH_BRIDGE_TOKEN||'',given=request.headers.get('X-Tinyfish-Bridge-Token')||'';
 if(!/^[a-f0-9]{64}$/.test(expected)||given.length!==expected.length)return false;
 let difference=0;
 for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^given.charCodeAt(i);
 return difference===0;
}
