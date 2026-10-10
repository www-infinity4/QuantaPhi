const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const acorn=require('acorn'),postcss=require('postcss');
const targets=['robot-directions.js','quanta-agent-iterations.js','robot-directions.css','quanta-agent-iterations.css'];
function validate(source,file){
 try{if(file.endsWith('.css'))postcss.parse(source,{from:file});else acorn.parse(source,{ecmaVersion:'latest',sourceType:'script',locations:true});return {ok:true}}
 catch(e){return {ok:false,message:e.message,line:e.loc?.line||e.line,column:e.loc?.column??e.column,offset:e.pos??e.offset}}
}
class SyntaxEradicator{
 constructor(root){this.root=path.resolve(root)}
 async execute({file_path,candidate,verify}){
  if(!targets.includes(file_path))throw Error('Target outside syntax matrix');
  const file=path.join(this.root,file_path),buffer=await fs.readFile(file),source=buffer.toString('utf8');
  const evidence={file:file_path,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),buffer_base64:buffer.toString('base64'),bytes:buffer.length,original:validate(source,file_path)};
  if(candidate===undefined)return {...evidence,status:evidence.original.ok?'validated':'blocked',strategy:'read-only AST inspection'};
  const check=validate(candidate,file_path);if(!check.ok)return {...evidence,status:'blocked',candidate:check};
  if(typeof verify!=='function'||await verify(candidate,file_path)!==true)return {...evidence,status:'blocked',reason:'Regression sign-off required'};
  const current=await fs.readFile(file);if(!current.equals(buffer))return {...evidence,status:'blocked',reason:'Source changed since inspection'};
  // Preserve exact original buffers; syntax validity alone is not a runtime pass.
  const temporary=file+'.syntax-'+crypto.randomUUID();
  await fs.writeFile(temporary,candidate,{flag:'wx',mode:(await fs.stat(file)).mode});
  try{await fs.rename(temporary,file)}finally{await fs.rm(temporary,{force:true})}
  return {...evidence,status:'written',candidate:check,regression:'passed'};
 }
}
async function main(){
 const engine=new SyntaxEradicator(path.join(__dirname,'..')),results=[];
 for(const file_path of targets)results.push(await engine.execute({file_path}));
 await fs.mkdir(path.join(__dirname,'../syntax-evidence'),{recursive:true});
 await fs.writeFile(path.join(__dirname,'../syntax-evidence/report.json'),JSON.stringify({job_id:'IW-20261010-SYNTAX-ERADICATE',at:new Date().toISOString(),results},null,2));
 console.log(results.map(x=>({file:x.file,status:x.status,error:x.original.ok?null:x.original})));
 if(results.some(x=>x.status==='blocked'))process.exitCode=1;
}
module.exports={SyntaxEradicator,validate};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
