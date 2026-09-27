import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPECTED_SHA256 = 'E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB';
const [inputArg, outputArg, reportArg] = process.argv.slice(2);
if (!inputArg || !outputArg || !reportArg) {
  throw new Error('Usage: node scripts/patch-v11-hotfix.mjs input.js output.js report.json');
}
const input = resolve(inputArg);
const output = resolve(outputArg);
if (input === output) throw new Error('Input and output must differ; the v11 bundle stays immutable');
const sha256 = (value) => createHash('sha256').update(value).digest('hex').toUpperCase();
const original = readFileSync(input);
if (sha256(original) !== EXPECTED_SHA256) throw new Error(`Unexpected v11 bundle SHA-256: ${sha256(original)}`);
let bundle = original.toString('utf8');
const changes = [];
function replaceExact(label, before, after, expected = 1) {
  const count = bundle.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} exact match(es), got ${count}`);
  bundle = bundle.replace(before, after);
  changes.push({ label, matches: count, beforeBytes: Buffer.byteLength(before), afterBytes: Buffer.byteLength(after) });
}

// Only the PlayerPage closure is touched. Names prefixed tpV11 are unique to
// this patch and deliberately remain readable in the generated bundle.
replaceExact('lifecycle/watchdog hooks',
  '[Ce,we]=(0,_.useState)(0),[Te,Ee]=(0,_.useState)(Hk.VALIDATION_START)',
  '[Ce,we]=(0,_.useState)(0),[tpV11Release,tpV11SetRelease]=(0,_.useState)(!1),tpV11Released=(0,_.useRef)(new WeakSet),[Te,Ee]=(0,_.useState)(Hk.VALIDATION_START)');

const fastBoot = `(0,_.useEffect)(()=>{if(!jA()||!e||!t)return;let tpCancelled=!1;async function tpStart(){try{let tpLink=Gk(),tpSaved=JSON.parse(localStorage.getItem('totempark-v11-hotfix-boot')||'null'),tpRaw=JSON.parse(localStorage.getItem(i)||'{}');if(!tpLink||!tpSaved||tpSaved.version!==1||tpSaved.clientId!==e||tpSaved.code!==t.toUpperCase()||tpSaved.screen?.id!==tpLink.screenId||tpLink.clientId!==e||tpLink.deviceId!==PA()||tpSaved.screen.connectedDeviceId&&tpSaved.screen.connectedDeviceId!==tpLink.deviceId||tpSaved.playlist?.id!==tpSaved.screen.playlistId||!Array.isArray(tpSaved.playlist.items)||!tpSaved.playlist.items.length)return;let tpItems=tpSaved.playlist.items,tpChecks=tpItems.map(async tpItem=>{let tpUrl=tpItem.remotePreview||tpItem.preview||tpItem.imageUrl||'';if(!/^https?:\\/\\//i.test(tpUrl)||!tpRaw[tpUrl])return!1;let tpStat=await DO.stat({path:jk(o,tpUrl),directory:TO.Data});return rk(tpStat.size,Number(tpItem.sizeBytes||0)).valid});if(!(await Promise.all(tpChecks)).every(Boolean)||tpCancelled)return;c(tpSaved.screen);u(tpSaved.client||null);m(tpSaved.playlist);C(tpSaved.playlist);Ee(Hk.OFFLINE);f(!1);ue(!1);console.info('[V11_HOTFIX] FAST_BOOT_LOCAL',{screenId:tpSaved.screen.id,items:tpItems.length})}catch(tpError){console.info('[V11_HOTFIX] FAST_BOOT_UNAVAILABLE',tpError?.message||String(tpError))}}tpStart();return()=>{tpCancelled=!0}},[e,t,s?.id]),(0,_.useEffect)(()=>{if(!jA()||!s?.id||!l||!S?.id||!S?.items?.length||Te!==Hk.VALIDATED)return;try{let tpLink=Gk(),tpRaw=JSON.parse(localStorage.getItem(i)||'{}');if(tpLink?.screenId!==s.id||tpLink.deviceId!==PA()||S.id!==s.playlistId||!S.items.every(tpItem=>tpRaw[tpItem.remotePreview||tpItem.preview||tpItem.imageUrl||'']))return;localStorage.setItem('totempark-v11-hotfix-boot',JSON.stringify({version:1,clientId:e,code:t.toUpperCase(),screen:s,client:l,playlist:S}))}catch(tpError){console.info('[V11_HOTFIX] BOOT_SNAPSHOT_UNAVAILABLE',tpError?.message||String(tpError))}},[s,l,S,M,Te,e,t]);`;
replaceExact('fast boot with native file validation', 'function bt(){if(He.current)return;', fastBoot + 'function bt(){if(He.current)return;');

replaceExact('release decoder before VIDEO to VIDEO transition',
  'He.current=!0,clearTimeout(Re.current),Re.current=null,ee(t=>{let n=t>=e.length?0:t,r=n+1>=e.length?0:n+1;return Ae.current=!0,k(n),',
  `let tpFrom=O>=e.length?0:O,tpTo=(tpFrom+1)%e.length,tpV2V=e[tpFrom]?.type===\x60Vídeo\x60&&e[tpTo]?.type===\x60Vídeo\x60,tpOld=tpV2V?document.querySelector('.player-transition-layer.is-current video.player-media'):null;He.current=!0,clearTimeout(Re.current),Re.current=null;if(tpV2V){clearTimeout(je.current);if(tpOld){tpV11Released.current.add(tpOld);try{tpOld.pause();tpOld.removeAttribute('src');tpOld.load()}catch(tpError){console.info('[V11_HOTFIX] DECODER_RELEASE_ERROR',tpError?.message||String(tpError))}}tpV11SetRelease(!0);k(null);console.info('[V11_HOTFIX] DECODER_RELEASE_START',{from:tpFrom,to:tpTo})}ee(t=>{let n=t>=e.length?0:t,r=n+1>=e.length?0:n+1;return Ae.current=!0,k(tpV2V?null:n),`);

replaceExact('mount only after previous decoder unmount',
  'te!==null&&te!==Ft&&ot[te]&&Ut.push({item:ot[te],index:te,state:`is-previous`}),Ut.push({item:It,index:Ft,state:Rt?`is-current is-ready ${zt?`transition-active`:``}`:`is-current is-pending`});',
  'tpV11Release||(te!==null&&te!==Ft&&ot[te]&&Ut.push({item:ot[te],index:te,state:`is-previous`}),Ut.push({item:It,index:Ft,state:Rt?`is-current is-ready ${zt?`transition-active`:``}`:`is-current is-pending`}));');

replaceExact('decoder release completion gate',
  'function xt(e,t){let n=vt(e,t);',
  `(0,_.useLayoutEffect)(()=>{if(!tpV11Release)return;let tpRemaining=document.querySelectorAll('.player-transition-layer video.player-media').length;if(tpRemaining===0){console.info('[V11_HOTFIX] DECODER_RELEASE_END',{remainingVideoCount:0,index:O});tpV11SetRelease(!1)}},[tpV11Release,O]);function xt(e,t){let n=vt(e,t);`);

replaceExact('ignore stale playing event during release',
  'onPlaying:()=>{n&&qe&&xt(e,t),n&&QO(`PLAYBACK_START`,i,a)}',
  'onPlaying:tpEvent=>{if(tpV11Released.current.has(tpEvent.currentTarget))return;n&&qe&&xt(e,t),n&&QO(`PLAYBACK_START`,i,a)}');
replaceExact('ignore stale error event during release',
  'onError:()=>{n&&(QO(`PLAYBACK_ERROR`,i,{...a,message:`Erro ao carregar vídeo`}),!tt(e)&&(console.log(`Erro ao carregar video. Pulando midia.`),St()))}',
  'onError:tpEvent=>{if(tpV11Released.current.has(tpEvent.currentTarget))return;n&&(QO(`PLAYBACK_ERROR`,i,{...a,message:`Erro ao carregar vídeo`}),!tt(e)&&(console.log(`Erro ao carregar video. Pulando midia.`),St()))}');

const watchdog = `(0,_.useEffect)(()=>{if(!s?.id||xe||tpV11Release)return;let tpSeen=null,tpLastTime=0,tpLastProgress=Date.now(),tpAttemptAt=0;let tpTimer=setInterval(()=>{if(document.visibilityState!=='visible'||xe||tpV11Release||Ae.current)return;let tpVideo=document.querySelector('.player-transition-layer.is-current video.player-media');if(!tpVideo||tpVideo.paused||tpVideo.ended||tpVideo.seeking){tpSeen=tpVideo;tpLastTime=tpVideo?.currentTime||0;tpLastProgress=Date.now();tpAttemptAt=0;return}if(tpVideo.readyState<2&&!tpAttemptAt){tpSeen=tpVideo;tpLastTime=tpVideo.currentTime;tpLastProgress=Date.now();return}if(tpSeen!==tpVideo||(tpVideo.currentTime>.2&&(tpLastTime<0||tpVideo.currentTime>tpLastTime+.15))){tpSeen=tpVideo;tpLastTime=tpVideo.currentTime;tpLastProgress=Date.now();tpAttemptAt=0;return}let tpNow=Date.now();if(tpNow-tpLastProgress<3e4)return;if(!tpAttemptAt){tpAttemptAt=tpNow;tpLastTime=-1;console.info('[V11_HOTFIX] VIDEO_STALL_RECOVERY',{index:O,currentTime:tpVideo.currentTime});try{tpVideo.load();tpVideo.play().catch(()=>{})}catch(tpError){console.info('[V11_HOTFIX] VIDEO_RECOVERY_ERROR',tpError?.message||String(tpError))}return}if(tpNow-tpAttemptAt<3e4)return;let tpLastReload=Number(localStorage.getItem('totempark-v11-hotfix-watchdog-reload')||0);if(tpNow-tpLastReload>36e5){localStorage.setItem('totempark-v11-hotfix-watchdog-reload',String(tpNow));console.info('[V11_HOTFIX] VIDEO_STALL_RELOAD',{index:O});window.location.reload()}else{console.info('[V11_HOTFIX] VIDEO_STALL_RELOAD_SUPPRESSED',{index:O});tpLastProgress=tpNow;tpAttemptAt=0}},4e3);return()=>clearInterval(tpTimer)},[s?.id,O,xe,tpV11Release]);`;
replaceExact('video only watchdog', 'let kt=_N(l),At=', watchdog + 'let kt=_N(l),At=');

replaceExact('stop local playback after confirmed screen removal',
  'if(!r.exists()){s(`screen-document-not-confirmed`);return}',
  'if(!r.exists()){if(!r.metadata.fromCache&&navigator.onLine){c(null);console.info(`[V11_HOTFIX] SCREEN_REMOVED_BY_SERVER`)}s(`screen-document-not-confirmed`);return}');
replaceExact('stop local playback after confirmed device conflict',
  'Ee(e.state),Uk(e.state,{connectedDeviceId:l,localDeviceId:i}),ue(!1);return}',
  'Ee(e.state),Uk(e.state,{connectedDeviceId:l,localDeviceId:i}),c(null),ue(!1);return}');

const patched = Buffer.from(bundle, 'utf8');
writeFileSync(output, patched);
const report = {
  input,
  inputSha256: EXPECTED_SHA256,
  output,
  outputSha256: sha256(patched),
  changes,
};
writeFileSync(resolve(reportArg), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
