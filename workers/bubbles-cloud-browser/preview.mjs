const PREFIX='/bubbles-continuity-preview/';
const asset=/^bubbles(?:-[a-zA-Z0-9_-]+)?\.(?:html|js|mjs|css)$/;

// A first-party preview uses the owner's existing QuantaPhi authentication.
// Public source is pinned at packaging time; query parameters cannot select code.
export async function continuityPreview(request,sourceSha,{fetcher=fetch}={}){
 const url=new URL(request.url);
 if(!url.pathname.startsWith(PREFIX))return null;
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers});
 if(!/^[a-f0-9]{40}$/.test(sourceSha||''))return new Response('Preview source not configured',{status:503,headers});
 const path=url.pathname.slice(PREFIX.length)||'bubbles.html';
 if(!asset.test(path))return new Response('Not found',{status:404,headers});
 const response=await fetcher('https://raw.githubusercontent.com/www-infinity4/QuantaPhi/'+sourceSha+'/'+path,
  {redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!response.ok)return new Response('Preview source unavailable',{status:502,headers});
 if(Number(response.headers.get('content-length')||0)>1500000)return new Response('Preview source too large',{status:502,headers});
 const reader=response.body.getReader();let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;
  size+=value.length;if(size>1500000){await reader.cancel();return new Response('Preview source too large',{status:502,headers});}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const text=new TextDecoder().decode(bytes).replace(/(["'(])\/(bubbles(?:-[a-zA-Z0-9_-]+)?\.(?:html|js|mjs|css))\b/g,
  (_,quote,file)=>quote+PREFIX+file);
 const type=path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':'application/javascript';
 return new Response(text,{headers:{...headers,'Content-Type':type+'; charset=utf-8','X-Preview-Source':sourceSha}});
}
