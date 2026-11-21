import {spawn} from "node:child_process";
import assert from "node:assert/strict";
const port=Number(process.env.BARBERNEX_TEST_PORT||32847);
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p",String(port)],{stdio:"pipe",env:{...process.env,NODE_ENV:"production"}});
let logs="";child.stdout.on("data",d=>logs+=String(d).slice(-3000));child.stderr.on("data",d=>logs+=String(d).slice(-3000));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function request(path){return fetch(base+path,{redirect:"manual",signal:AbortSignal.timeout(4000)});}
try{
 let ready=false;
 for(let n=0;n<40;n++){
  if(child.exitCode!==null)throw Error("Servidor encerrou: "+logs);
  try{const response=await request("/api/health");if(response.status===200){ready=true;break;}}catch{}
  await sleep(1000);
 }
 assert.ok(ready,"GET /api/health deve conectar ao banco. Saída: "+logs);
 const paths=[["/",200],["/login",200],["/master/login",200],["/assinar",200],["/api/horarios?slug=nao-existe&date=2030-01-01",404]];
 for(const [path,status] of paths){const response=await request(path);assert.equal(response.status,status,`GET ${path}`);}
 const protectedPage=await request("/admin");assert.ok([302,303,307,308].includes(protectedPage.status),"admin exige login");
 console.log("HTTP SMOKE OK — banco, páginas, rotas e proteção básica.");
}catch(error){console.error("HTTP SMOKE FALHOU",error);console.error(logs.slice(-3000));process.exitCode=1;}
finally{child.kill("SIGTERM");}
