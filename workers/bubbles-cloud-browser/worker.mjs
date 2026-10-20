import {browserTool} from '../bubbles-tools/browser.mjs';
const origins=new Set(['https://quantaphi.org','https://www.quantaphi.org','https://www-infinity4.github.io']);
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(path==='/health')return Response.json({ok:true,service:'bubbles-cloud-browser',browserBound:!!env.BROWSER,ownerGate:!!env.BRAIN},
   {headers:{'Cache-Control':'no-store'}});
  if(path!=='/v1/browser')return new Response('Not found',{status:404});
  if(!origins.has(request.headers.get('Origin')))return new Response('Not found',{status:403});
  return browserTool(request,env);
 }
};
