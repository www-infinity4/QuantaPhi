import {readFileSync,writeFileSync} from 'node:fs';
const file=new URL('../workers/business-directory/page-worker.mjs',import.meta.url);
const html=readFileSync(new URL('../businesses/index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../businesses/directory-app.mjs',import.meta.url),'utf8');
function generate(html,script){return "/* Built from businesses/index.html + businesses/directory-app.mjs. Do not hand-edit. */\\n" .replace('\\n','\n')+
  'const HTML='+JSON.stringify(html)+';\\n' +
  'const SCRIPT='+JSON.stringify(script)+';\\n' +
  "export default{async fetch(request){\n const url=new URL(request.url),path=url.pathname;\n if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method Not Allowed',{status:405,headers:{Allow:'GET, HEAD'}});\n if(path==='/businesses')return Response.redirect('https://quantaphi.org/businesses/'+url.search,308);\n const common={'Cache-Control':'public, max-age=120','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};\n if(path==='/businesses/'||path==='/businesses/index.html')return new Response(request.method==='HEAD'?null:HTML,{headers:{...common,'Content-Type':'text/html; charset=utf-8'}});\n if(path==='/businesses/directory-app.mjs')return new Response(request.method==='HEAD'?null:SCRIPT,{headers:{...common,'Content-Type':'application/javascript; charset=utf-8'}});\n return new Response('Not Found',{status:404,headers:{...common,'Content-Type':'text/plain; charset=utf-8'}});\n}};\n";
}
const built=generate(html,script);
if(process.argv.includes('--check')){
 const current=readFileSync(file,'utf8');
 if(current!==built){console.error('Business page Worker snapshot is stale; run node scripts/build-business-directory-page-worker.mjs');process.exitCode=1;}
 else console.log('Business page Worker matches public page assets');
}else{writeFileSync(file,built,'utf8');console.log('Business directory page Worker generated');}
