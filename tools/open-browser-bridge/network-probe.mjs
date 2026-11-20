// Run ONLY inside the browser service. Kernel-level egress probe, not a mock.
import {connect} from 'node:net';
import {readFile} from 'node:fs/promises';
import {torTransport} from './transport.mjs';

torTransport(process.env,{
  ipv4:await readFile('/proc/net/route','utf8'),
  ipv6:await readFile('/proc/net/ipv6_route','utf8')
});
function probe(host,port,timeout=1600){
  return new Promise(resolve=>{
    const socket=connect({host,port});
    let done=false;
    const finish=ok=>{if(done)return;done=true;socket.destroy();resolve(ok)};
    socket.once('connect',()=>finish(true));
    socket.once('error',()=>finish(false));
    socket.setTimeout(timeout,()=>finish(false));
  });
}
let tor=false;
for(let attempt=0;attempt<12&&!tor;attempt++){
  tor=await probe('172.30.211.2',9050,500);
  if(!tor)await new Promise(resolve=>setTimeout(resolve,350));
}
if(!tor)throw Error('Tor SOCKS port not reachable on isolated bridge');
const denied=[
  ['1.1.1.1',443],
  ['8.8.8.8',53],
  ['169.254.169.254',80],
  ['192.168.1.1',80],
  ['2606:4700:4700::1111',443]
];
for(const [host,port] of denied){
  if(await probe(host,port))throw Error('DIRECT EGRESS LEAK: '+host+':'+port);
  console.log('DENIED direct TCP '+host+':'+port);
}
console.log('PASS Tor SOCKS sidecar reachable; tested direct IPv4/IPv6/metadata egress denied');
