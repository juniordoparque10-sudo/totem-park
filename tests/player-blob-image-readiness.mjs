import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
const args=process.argv.slice(2), verify=args[0]==='--verify',variant=verify?args[1]:(args[0]||'fixed');
if(!verify){const code=await new Promise(resolve=>{const c=spawn(process.execPath,['artifacts/homologacao-2a1/fix-diagnostic.mjs',variant],{stdio:'inherit',windowsHide:true});c.on('exit',resolve);});assert.equal(code,0);}
const r=JSON.parse(fs.readFileSync(`artifacts/homologacao-2a1/fix/${variant}.json`));assert.ok(!r.error,r.error);
for(const phase of ['online','offline',...(variant==='fixed'?['offline-second-restart','scheduled-online']:[])]){const p=r.phases[phase];assert.ok(p.fullImageIntervals>=5,`${phase}: five complete image intervals required`);assert.equal(p.visibleImageIntervals,p.fullImageIntervals,`${phase}: every complete Blob image interval must be visually ready`);assert.ok(p.videoEnded>=5,`${phase}: five completed videos required`);assert.ok(p.samples.filter(x=>x.tag==='IMG').every(x=>x.complete&&x.width>0&&x.height>0));assert.ok(!p.events.some(x=>x.event==='error'),`${phase}: media error`);}
assert.match(r.offlineProbe,/ERR_INTERNET_DISCONNECTED/);assert.deepEqual(r.after,r.before);assert.deepEqual(r.offlineCache,r.before);assert.ok(r.closures.every(x=>x.terminated));
if(variant==='fixed'){assert.deepEqual(r.afterSecondRestart,r.before);for(const old of r.ownership.withB)assert.ok(r.ownership.after.some(x=>x.key===old.key&&x.hash===old.hash),'Other client/screen media must survive');assert.ok(r.ownership.withB.length>=6);for(const row of r.network.filter(x=>x.at>r.cachedAt&&x.encodedBodyBytes!==undefined&&/video01|imagem01/.test(x.url)))assert.equal(row.encodedBodyBytes,0,'Cached original media must not be downloaded again');}
console.log('PASS: real Chrome Blob image visibility, cycles, persistence and cache ownership');
