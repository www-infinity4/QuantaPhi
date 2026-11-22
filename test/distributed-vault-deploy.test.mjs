import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../distributed-vault/deploy/'+name,import.meta.url),'utf8');
test('repository host systemd service keeps localhost-only and secret env file',()=>{
 const s=read('quantaphi-mesh.service');
 assert.match(s,/ExecStart=\/usr\/bin\/node .*distributed-vault\/mesh-runner\.mjs/);
 assert.match(s,/EnvironmentFile=\/etc\/quantaphi\/mesh\.env/);
 assert.match(s,/MESH_HOST=127\.0\.0\.1/);
 assert.match(s,/MESH_DB=\/var\/lib\/quantaphi-mesh\/mesh\.sqlite/);
 assert.match(s,/User=quantamesh/);
 for(const setting of ['NoNewPrivileges=true','ProtectSystem=strict','ProtectHome=true','UMask=0077','StateDirectory=quantaphi-mesh','Restart=on-failure'])
  assert.ok(s.includes(setting),setting);
 assert.doesNotMatch(s,/MESH_OWNER_TOKEN\s*=/);
 assert.doesNotMatch(s,/0\.0\.0\.0|cloudflare|api[_-]?key/i);
});
test('example HTTPS reverse proxy forwards only to loopback and needs real host',()=>{
 const cfg=read('Caddyfile.example');
 assert.match(cfg,/mesh\.example\.org/);
 assert.match(cfg,/reverse_proxy 127\.0\.0\.1:8789/);
 assert.doesNotMatch(cfg,/http:\/\/mesh\.example\.org/);
 assert.doesNotMatch(cfg,/cloudflare|tls_insecure_skip_verify|\*/i);
});
test('deployment runbook never claims repos provide always-on compute or D1 data migration complete',()=>{
 const cfg=read('README.md');
 assert.match(cfg,/systemd/i);
 assert.match(cfg,/D1.*remains.*authoritative/i);
 assert.match(cfg,/https/i);
 assert.match(cfg,/not.*production.*cutover/i);
 assert.match(cfg,/separate.*permanent.*host/i);
});
