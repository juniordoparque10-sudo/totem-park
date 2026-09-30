import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'file:///C:/Users/centr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const profile = path.join(root, 'chrome-profile-gate');
const origin = 'http://127.0.0.1:5199';
const target = origin + '/player/A/TESTA1';
const evidence = { started: new Date().toISOString(), profile, network: [], console: [], closures: [] };
const save = () => fs.writeFileSync(path.join(root, 'automated-gate.json'), JSON.stringify(evidence, null, 2));
let context;
let phase = 'first-launch';
const children = [];
async function ensureServer(port, script) {
  try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return; } catch {}
  const child = spawn(process.execPath, [path.join(root, script)], { cwd: path.resolve(root, '../..'), windowsHide: true, stdio: ['ignore','pipe','pipe'] });
  const log = fs.createWriteStream(path.join(root, `gate-server-${port}.log`));
  child.stdout.pipe(log); child.stderr.pipe(log); children.push(child);
  for (let i=0;i<100;i++) {
    if (child.exitCode !== null) throw new Error(`Test server ${port} exited: ${child.exitCode}`);
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return; } catch {}
    await new Promise(r=>setTimeout(r,200));
  }
  throw new Error(`Test server ${port} unavailable`);
}
async function launch(offline = false) {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, viewport: { width: 1280, height: 720 },
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-networking'],
  });
  evidence.version = context.browser().version();
  const browserCDP = await context.browser().newBrowserCDPSession();
  const processes = await browserCDP.send('SystemInfo.getProcessInfo');
  context.gatePid = processes.processInfo.find(p => p.type === 'browser').id;
  console.log('LAUNCH', phase, 'PID', context.gatePid, evidence.version);
  await context.setOffline(offline);
  await context.addInitScript(() => {
    window.gate = { samples: [], events: [] };
    for (const event of ['play', 'ended', 'loadeddata', 'error']) {
      document.addEventListener(event, e => {
        if (!e.target.matches?.('.player-media')) return;
        window.gate.events.push({ at: Date.now(), event, tag: e.target.tagName, src: e.target.currentSrc || e.target.src, current: !!e.target.closest('.is-current'), code: e.target.error?.code || null });
      }, true);
    }
    setInterval(() => {
      const el = document.querySelector('.is-current .player-media');
      const parent = el?.closest('.is-current');
      window.gate.samples.push({ at: Date.now(), tag: el?.tagName || null, src: el?.currentSrc || el?.src || '',
        time: el?.currentTime, ready: el?.readyState, width: el?.naturalWidth,
        error: el?.error?.code || null, classes: parent?.className || '',
        visible: !!el && el.getBoundingClientRect().width > 0 && getComputedStyle(parent).opacity !== '0' });
    }, 100);
  });
  const page = context.pages()[0] || await context.newPage();
  await instrument(page);
  return page;
}
async function instrument(page) {
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) evidence.console.push({ phase, at: new Date().toISOString(), type: message.type(), text: message.text() });
  });
  page.on('pageerror', error => evidence.console.push({ phase, at: new Date().toISOString(), type: 'pageerror', text: String(error) }));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  const rows = new Map();
  cdp.on('Network.requestWillBeSent', p => {
    if (!p.request.url.includes('/media/')) return;
    const row = { phase, requestId: p.requestId, url: p.request.url, method: p.request.method, requestHeaders: p.request.headers, encodedBodyBytes: 0, decodedBodyBytes: 0 };
    rows.set(p.requestId, row); evidence.network.push(row);
  });
  cdp.on('Network.responseReceived', p => { const r = rows.get(p.requestId); if (r) Object.assign(r, { status: p.response.status, fromDiskCache: p.response.fromDiskCache, fromServiceWorker: p.response.fromServiceWorker, protocol: p.response.protocol, responseHeaders: p.response.headers }); });
  cdp.on('Network.responseReceivedExtraInfo', p => { const r = rows.get(p.requestId); if (r) r.wireStatus = p.statusCode; });
  cdp.on('Network.requestServedFromCache', p => { const r = rows.get(p.requestId); if (r) r.browserCache = true; });
  cdp.on('Network.dataReceived', p => { const r = rows.get(p.requestId); if (r) { r.encodedBodyBytes += p.encodedDataLength; r.decodedBodyBytes += p.dataLength; } });
  cdp.on('Network.loadingFinished', p => { const r = rows.get(p.requestId); if (r) r.encodedTransferBytes = p.encodedDataLength; });
  cdp.on('Network.loadingFailed', p => { const r = rows.get(p.requestId); if (r) r.failure = p.errorText; });
}
async function inventory(page) {
  return page.evaluate(async () => {
    const names = await caches.keys();
    const entries = [];
    if (names.includes('totempark-player-media-v1')) {
      const cache = await caches.open('totempark-player-media-v1');
      for (const key of await cache.keys()) {
        const bytes = await (await cache.match(key)).arrayBuffer();
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2,'0')).join('');
        entries.push({ key: key.url, bytes: bytes.byteLength, sha256: hash });
      }
    }
    entries.sort((a,b)=>a.key.localeCompare(b.key));
    const reg = await navigator.serviceWorker.getRegistration();
    return { names, entries, count: entries.length, bytes: entries.reduce((s,e)=>s+e.bytes,0), worker: { registered: !!reg, active: reg?.active?.state, waiting: reg?.waiting?.state, script: reg?.active?.scriptURL } };
  });
}
async function prepared(page) {
  await page.waitForFunction(async () => {
    if (!(await caches.keys()).includes('totempark-player-media-v1')) return false;
    return (await (await caches.open('totempark-player-media-v1')).keys()).length >= 2 && !!document.querySelector('.is-current .player-media[src^="blob:"]');
  }, null, { timeout: 45000 });
}
async function close() {
  const pid = context.gatePid;
  await context.close(); context = null;
  let alive = true;
  for (let i=0;i<30;i++) {
    try { process.kill(pid, 0); } catch (e) { if (e.code==='ESRCH') { alive=false; break; } throw e; }
    await new Promise(r=>setTimeout(r,100));
  }
  evidence.closures.push({ phase, pid, exited: !alive, at: new Date().toISOString() });
  assert.equal(alive, false, 'Browser process must exit completely');
  console.log('CLOSED',pid,'process confirmed terminated'); save();
}
try {
  await ensureServer(5198, 'server.mjs'); await ensureServer(5199, 'app-server.mjs');
  let page = await launch();
  await page.goto(target);
  await prepared(page);
  await page.waitForTimeout(8000);
  evidence.before = await inventory(page);
  evidence.singleTab = await page.evaluate(()=>window.gate);
  await page.screenshot({path:path.join(root,'gate-before.png')});
  assert.ok(evidence.before.count >= 2, 'Exclusive profile must contain the video and image; prior local diagnostics may have added entries');
  console.log('BEFORE',JSON.stringify(evidence.before)); save();
  await close();

  phase = 'reopened-before-player';
  page = await launch();
  // An image document establishes the origin without executing the app or downloading campaigns.
  await page.goto(origin + '/favicon.png');
  evidence.after = await inventory(page);
  assert.deepEqual(evidence.after.entries, evidence.before.entries, 'Cache bytes/keys must survive process exit');
  evidence.persistence = 'PASSOU';
  console.log('PERSISTENCE PASS',JSON.stringify(evidence.after)); save();
  phase = 'reopened-player';
  evidence.reopenNetworkStart = new Date().toISOString();
  await page.goto(target); await prepared(page); await page.waitForTimeout(7000);
  assert.ok(await page.locator('.is-current .player-media[src^="blob:"]').count(), 'Player must still be rendering cached media BEFORE offline');
  evidence.beforeOfflineDOM = await page.locator('body').innerText();
  evidence.reopenNetworkEnd = new Date().toISOString();
  evidence.afterPlayer = await inventory(page);
  await page.screenshot({path:path.join(root,'gate-reopened.png')});
  phase = 'offline';
  await context.setOffline(true);
  const probes = [];
  for (const url of [origin+'/media/video01.webm?offline-probe='+Date.now(), 'http://127.0.0.1:8288/v1/projects/demo-totem-homolog/databases/(default)/documents/clients/A?offline='+Date.now()]) {
    probes.push(await page.evaluate(async url => { try { const r=await fetch(url,{cache:'no-store'});return {url,failed:false,status:r.status}; } catch(e) {return {url,failed:true,error:String(e)};} },url));
  }
  const external = await context.newPage();
  try { await external.goto('https://example.com/?offline-gate='+Date.now(),{timeout:10000}); probes.push({url:'https://example.com',failed:false}); }
  catch(e) { probes.push({url:'https://example.com',failed:true,error:String(e)}); }
  await external.close();
  assert.ok(probes.every(p=>p.failed), 'Offline probes must all fail');
  evidence.offlineProbes=probes;
  const start = Date.now();
  await page.waitForTimeout(22000);
  evidence.offlineObservation=await page.evaluate(start=>({samples:window.gate.samples.filter(x=>x.at>=start),events:window.gate.events.filter(x=>x.at>=start),online:navigator.onLine}),start);
  evidence.offlineCache=await inventory(page);
  const obs=evidence.offlineObservation;
  const runs=[];
  for(const s of obs.samples) {const prev=runs.at(-1);if(prev?.tag===s.tag)prev.end=s.at;else runs.push({tag:s.tag,start:s.at,end:s.at});}
  evidence.offlineRuns=runs;
  await page.screenshot({path:path.join(root,'gate-offline.png')});
  evidence.offlineVisibility = { images: obs.samples.filter(x=>x.tag==='IMG').length, visibleImages: obs.samples.filter(x=>x.tag==='IMG'&&x.visible).length, videos: obs.samples.filter(x=>x.tag==='VIDEO').length, visibleVideos: obs.samples.filter(x=>x.tag==='VIDEO'&&x.visible).length };
  const imageRuns = runs.filter(x=>x.tag==='IMG'&&x.end-x.start>=2700);
  evidence.offline='FALHOU';
  assert.ok(imageRuns.filter(run=>obs.samples.some(x=>x.tag==='IMG'&&x.visible&&x.at>=run.start&&x.at<=run.end)).length>=2,'At least two complete image intervals must actually be visible, not only decoded');
  assert.ok(obs.events.filter(x=>x.event==='ended'&&x.current&&x.tag==='VIDEO').length>=2,'At least two completed videos');
  assert.ok(runs.filter(x=>x.tag==='IMG'&&x.end-x.start>=2700).length>=2,'At least two image intervals close to 3 seconds');
  assert.ok(obs.samples.filter(x=>x.tag).every(x=>x.src.startsWith('blob:')&&!x.error),'All campaign samples must be local and error-free');
  assert.ok(!obs.events.some(x=>x.event==='error'),'No media error offline');
  assert.deepEqual(evidence.offlineCache.entries,evidence.before.entries);
  evidence.offline='PASSOU';
  console.log('OFFLINE PASS',JSON.stringify({probes,runs}));save();

  phase='multiple-tabs'; await context.setOffline(false);
  const second=await context.newPage();await instrument(second);await second.goto(origin+'/player/A/TESTA2');
  await second.waitForTimeout(12000);
  evidence.multipleTabs={leaseErrors:evidence.console.filter(x=>x.phase===phase&&/lease/i.test(x.text)),firstMedia:await page.locator('.is-current .player-media').count(),secondMedia:await second.locator('.is-current .player-media').count()};
  await context.setOffline(true);await close();
  phase='cold-start-offline';page=await launch(true);
  try {await page.goto(target,{timeout:15000,waitUntil:'domcontentloaded'});await page.waitForTimeout(6000);
    evidence.coldStart={result:(await page.locator('.is-current .player-media').count())?'FUNCIONOU':'PARCIAL',body:(await page.locator('body').innerText()).slice(0,1200)};
  } catch(e) {evidence.coldStart={result:'NÃO FUNCIONOU',error:String(e)};}
  await page.screenshot({path:path.join(root,'gate-cold-offline.png')});
  await close();evidence.decision='APROVADO PARA PUBLICAÇÃO DA 2A.1';
} catch(error) { evidence.error=String(error.stack||error);console.error(error);if(context){await context.pages()[0]?.screenshot({path:path.join(root,'gate-failure.png')}).catch(()=>{});await close().catch(e=>{evidence.closeError=String(e)});}process.exitCode=1; }
finally {evidence.finished=new Date().toISOString();save();for(const child of children)child.kill();}
