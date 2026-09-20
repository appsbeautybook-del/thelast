import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const skip=new Set(['node_modules','.git','dist','build','android','ios','.vercel','scripts']);
let total=0;
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 if(skip.has(item.name)||item.name.startsWith('.env'))continue;
 const file=path.join(dir,item.name);
 if(item.isDirectory()){walk(file);continue;}
 if(!/\.[cm]?[jt]sx?$/.test(file))continue;
 let text=fs.readFileSync(file,'utf8'),count=0;
 text=text.replace(/(['"])([A-Za-z0-9_.:+/=-]{30,})\1/g,(match,quote,value)=>{
  let secret=/^sk-(?:or-v1-|proj-)?[A-Za-z0-9_-]{20,}$/.test(value)||/^[a-f0-9]{8}-[a-f0-9-]{27}:[a-f0-9]{28,}$/.test(value);
  if(value.startsWith('eyJ')){try{secret ||= JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString()).role==='service_role';}catch{}}
  try{secret ||= /^sk-(?:or-v1-|proj-)?[A-Za-z0-9_-]{20,}$/.test(Buffer.from(value,'base64').toString());}catch{}
  if(secret){count++;return quote+quote;}return match;
 });
 if(count){fs.writeFileSync(file,text);total+=count;console.log(path.relative(root,file)+': '+count+' secret literal(s) removed');}
}}
walk(root);console.log('Total removed: '+total);
