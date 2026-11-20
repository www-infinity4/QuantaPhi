// Enforced Docker internal-network profile for the Tor-routed research bridge.
// This guard is defense in depth; Docker's internal bridge is the egress boundary.
const SOCKS='socks5://172.30.211.2:9050';
function lines(value,kind){
  if(typeof value!=='string'||!value.trim())throw Error(kind+' route table unavailable; isolation unverified');
  return value.trim().split(/\r?\n/).map(l=>l.trim().split(/\s+/));
}
export function assertNoDefaultRoute(ipv4,ipv6) {
  const v4=lines(ipv4,'IPv4');
  if(v4[0][0]!=='Iface'||v4[0][1]!=='Destination')throw Error('IPv4 route table malformed');
  if(v4.slice(1).some(row=>row[1]==='00000000'&&row[7]==='00000000'))
    throw Error('IPv4 default route detected: Tor isolation refused');
  const v6=lines(ipv6,'IPv6');
  if(v6.some(row=>row.length>=10&&row[0]==='0'.repeat(32)&&row[1]==='00'&&row[9]!=='lo'))
    throw Error('IPv6 default route detected: Tor isolation refused');
}
export function torTransport(env,routes){
  if(env.BROWSER_TRANSPORT!=='tor')throw Error('Tor transport not selected');
  if(env.BROWSER_NETWORK_ISOLATED!=='true')throw Error('Tor network isolation not asserted');
  if(env.BROWSER_TOR_PROXY!==SOCKS)throw Error('Tor proxy endpoint must be the isolated sidecar');
  assertNoDefaultRoute(routes?.ipv4,routes?.ipv6);
  return {mode:'tor',proxy:SOCKS};
}
