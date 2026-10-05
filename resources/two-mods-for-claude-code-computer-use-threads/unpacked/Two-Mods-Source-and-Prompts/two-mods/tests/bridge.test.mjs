// Tests the actual daemon with a fake local MCP child, never real desktop apps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
const fake = `import { createInterface } from 'node:readline';
let n=0, seq=900, pending=new Map();
const send=m=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',...m})+'\\n');
createInterface({input:process.stdin}).on('line',l=>{
 const m=JSON.parse(l);
 if(m.method==='initialize') return send({id:m.id,result:{}});
 if(m.method==='tools/call') {
  if(m.params.name==='js_reset'){n=0;return send({id:m.id,result:{content:[{type:'text',text:'reset'}]}});}
  const code=m.params.arguments.code;
  if(code.startsWith('app:')) {const id=++seq;pending.set(id,m.id);return send({id,method:'elicitation/create',params:{message:'May I use "'+code.slice(4)+'"?'}});}
  return send({id:m.id,result:{content:[{type:'text',text:String(++n)}]}});
 }
 if(pending.has(m.id)){const id=pending.get(m.id);pending.delete(m.id);send({id,result:{content:[{type:'text',text:m.result.action}],isError:m.result.action!=='accept'}});}
});`;
async function fixture(t) {
 const dir=await mkdtemp(join(tmpdir(),'cu-test-'));await copyFile(new URL('../bridge/daemon.mjs',import.meta.url),join(dir,'daemon.mjs'));await writeFile(join(dir,'launch.mjs'),fake);
 const child=spawn(process.execPath,[join(dir,'daemon.mjs')],{stdio:'ignore'});
 const call=(path,body={})=>new Promise((resolve,reject)=>{
  const req=http.request({socketPath:join(dir,'daemon.sock'),path,method:'POST'},res=>{let text='';res.on('data',x=>text+=x);res.on('end',()=>resolve({text,headers:res.headers,status:res.statusCode}));});
  req.setTimeout(3000,()=>req.destroy(new Error('timeout')));req.on('error',reject);req.end(JSON.stringify(body));
 });
 t.after(async()=>{try{await call('/quit');}catch{}await new Promise(r=>setTimeout(r,100));child.kill();await rm(dir,{recursive:true,force:true});});
 for(let i=0;i<100;i++){try{await call('/health');return {call,dir};}catch{await new Promise(r=>setTimeout(r,20));}}
 throw Error('daemon did not start');
}
test('separate caller state survives calls and reset clears it',async t=>{
 const {call}=await fixture(t);
 assert.equal((await call('/js',{session:'a',code:'count'})).text,'1');
 assert.equal((await call('/js',{session:'a',code:'count'})).text,'2');
 assert.equal((await call('/js',{session:'b',code:'count'})).text,'1');
 await call('/reset',{session:'a'});
 assert.equal((await call('/js',{session:'a',code:'count'})).text,'1');
});
test('approval denial, explicit approval, app lease and release',async t=>{
 const {call}=await fixture(t);
 let r=await call('/js',{session:'a',code:'app:Calculator'});assert.equal(r.status,422);assert.deepEqual(JSON.parse(r.headers['x-codex-declined']),['Calculator']);
 r=await call('/js',{session:'a',code:'app:Calculator',approve:['Calculator']});assert.equal(r.text,'accept');
 r=await call('/js',{session:'b',code:'app:Calculator',approve:['Calculator']});assert.equal(r.text,'decline');assert.equal(JSON.parse(r.headers['x-codex-busy'])[0].holder,'a');
 await call('/end',{session:'a'});
 assert.equal((await call('/js',{session:'b',code:'app:Calculator',approve:['Calculator']})).text,'accept');
});
test('standing approvals do not grant unrelated apps',async t=>{
 const {call,dir}=await fixture(t);await writeFile(join(dir,'always-allowed.json'),JSON.stringify({apps:['TextEdit'],autoApproveAll:false}));
 assert.equal((await call('/js',{session:'a',code:'app:TextEdit'})).text,'accept');
 assert.equal((await call('/js',{session:'a',code:'app:Calculator'})).text,'decline');
});
