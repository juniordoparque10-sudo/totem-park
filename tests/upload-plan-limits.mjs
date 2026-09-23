import assert from 'node:assert/strict';
import {uploadLimitBytes,uploadSizeNotice} from '../src/upload-plan-policy.js';
for(const [plan,v,i] of [['Start',50,5],['Business',100,10],['Professional',150,15],['Enterprise',200,20]])for(const [kind,mb] of [['video',v],['image',i]]){const limit=uploadLimitBytes(plan,kind);assert.equal(limit,mb*1024*1024);assert.equal(uploadSizeNotice(plan,kind,limit,limit),null);assert.equal(uploadSizeNotice(plan,kind,limit-1,limit),null);assert.equal(uploadSizeNotice(plan,kind,limit+1,limit).limitMb,mb);}
assert.equal(uploadSizeNotice('Start','video',140*1024*1024,50*1024*1024).upgrade,'Professional');
assert.equal(uploadSizeNotice('Enterprise','video',201*1024*1024,200*1024*1024).upgrade,undefined);
console.log('PASS: 4 plans, both media types, below/at/above limits and upgrade selection');


const {parse}=await import('espree');
const vm=await import('node:vm');
const fs=await import('node:fs');
const source=fs.readFileSync('src/App.jsx','utf8');
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module',ecmaFeatures:{jsx:true},range:true});
const names=['COMMERCIAL_PLANS','LEGACY_PLAN_NAMES'];
const funcs=['getPlanConfig','getPlanLimits','getClientMaxVideoSize','getClientMaxImageSize'];
const extracted=ast.body.filter(n=>(n.type==='VariableDeclaration'&&n.declarations.some(d=>names.includes(d.id.name)))||(n.type==='FunctionDeclaration'&&funcs.includes(n.id.name))).map(n=>source.slice(...n.range)).join('\n');
for(const player of [false,true]){
 const ctx=vm.createContext({STORAGE_MB:1024*1024,STORAGE_GB:1024*1024*1024,IS_PLAYER_BUILD:player,uploadLimitBytes});
 vm.runInContext(extracted.replaceAll('import.meta.env.VITE_APP_MODE',JSON.stringify(player?'player':'web')),ctx);
 const old={plan:'Start',maxVideoSizeBytes:100*1024*1024,maxImageSizeBytes:10*1024*1024};
 assert.equal(ctx.getClientMaxVideoSize(old),(player?100:50)*1024*1024);
 assert.equal(ctx.getClientMaxImageSize(old),(player?10:5)*1024*1024);
}
console.log('PASS: existing client overrides updated for manager/web; player values preserved');
