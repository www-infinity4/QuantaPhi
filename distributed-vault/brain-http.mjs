// Node transport only. Authentication, body limits and leases stay in the
// original Brain Worker; the mesh coordinator must not reinterpret them.
import {PassThrough,Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

export async function serveBrainRequest(brain,req,res){
 let input;
 const stopBody=()=>{if(input){req.unpipe(input);if(!req.readableEnded)req.pause();input.destroy();}};
 const unfinishedBody=()=>!req.readableEnded&&Boolean(input||req.headers['transfer-encoding']||Number(req.headers['content-length'])>0);
 try{
  const options={method:req.method,headers:req.headers};
  if(!['GET','HEAD'].includes(req.method)){
   // Cancelling a Web reader must not destroy the HTTP socket before the
   // Worker's 413 can be sent. Bound both bridge and Web queues in bytes.
   input=new PassThrough({highWaterMark:64*1024});
   input.once('close',()=>{req.unpipe(input);if(!req.readableEnded)req.pause();});
   req.once('error',error=>input.destroy(error));
   req.pipe(input);
   options.body=Readable.toWeb(input,{strategy:{highWaterMark:64*1024,size:chunk=>chunk.byteLength}});options.duplex='half';
  }
  const response=await brain.fetch(new Request('http://localhost'+req.url,options));
  const closeConnection=unfinishedBody();stopBody();
  if(res.destroyed){await response.body?.cancel();return;}
  // Early rejection must not leave a paused upload on a reusable socket.
  const headers=Object.fromEntries(response.headers);if(closeConnection)headers.connection='close';
  res.writeHead(response.status,headers);
  if(response.body)await pipeline(Readable.fromWeb(response.body),res);
  else res.end();
 }catch{
  if(res.destroyed)return;
  if(res.headersSent){res.destroy();return;}
  res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store',...(unfinishedBody()?{Connection:'close'}:{})});
  res.end('{"ok":false,"error":"local_brain_unavailable"}');
 }finally{stopBody();}
}
