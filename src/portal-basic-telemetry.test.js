import test from "node:test";
import assert from "node:assert/strict";
import { isBasicTelemetry,isBasicIdentityValid,isBasicFresh } from "./portal-basic-telemetry.js";
import { getPortalScreenStatus,getTelemetryVisualState } from "./portal-status.js";
import { reportedAppVersion,getCurrentSourceGroup,isSchema4Traffic,getTelemetryCardData } from "./telemetry-card-data.js";
import { getPortalCurrentMediaSource } from "./operational-telemetry.js";

const now=Date.parse("2026-11-20T12:00:00.000Z");
const screen=()=>({
  id:"s",clientId:"c",connectedDeviceId:"d",portalStatus:"ONLINE",lastSeenAt:now-200000,
  playerVersionName:"v73-antiga",playerVersionCode:73,currentMediaSource:"REMOTE",cacheStatus:"pronto",cachedItems:9,
  telemetryUpdatedAt:now-10000,telemetry:{schemaVersion:5,profile:"BASIC",
    identity:{screenId:"s",clientId:"c",deviceId:"d"},
    installation:{installationId:"inst",installationEpoch:2,packageName:"br.com.parksolutions.totempark.player.rcsecurelink",versionName:"1.0.0-v74-basic",versionCode:74,buildId:"build",buildTimestamp:"2026-11-20"},
    session:{sessionId:"session",startedAt:new Date(now-60000).toISOString(),lastHeartbeatAt:new Date(now-10000).toISOString()},
    connection:{state:"ONLINE"},playback:{state:"PLAYING",activeType:"PLAYLIST",activeId:"p"},
    traffic:{appInternetReceivedBytes:99999}}});

test("BASIC fresco usa identidade nativa e nunca contadores anteriores",()=>{
  const s=screen();
  assert.equal(isBasicTelemetry(s.telemetry),true);
  assert.equal(isBasicIdentityValid(s),true);
  assert.equal(isBasicFresh(s,now),true);
  assert.equal(reportedAppVersion(s,now),"1.0.0-v74-basic (74)");
  assert.equal(getPortalScreenStatus(s,now),"ONLINE");
  assert.equal(isSchema4Traffic(s),false);
  assert.equal(getCurrentSourceGroup(s).key,"unknown");
  assert.equal(getPortalCurrentMediaSource(s,now),"");
  const cards=getTelemetryCardData([s],now);
  assert.equal(cards.activeScreens,0);
  assert.equal(cards.cacheScreens,0);
});

test("BASIC com identity diferente não herda versão nem presença antiga",()=>{
  const s=screen();s.telemetry.identity.deviceId="outro";
  assert.equal(isBasicIdentityValid(s),false);
  assert.equal(reportedAppVersion(s,now),null);
  assert.equal(getPortalScreenStatus(s,now),"OFFLINE");
  assert.equal(getTelemetryVisualState({screen:s,now,config:{enabled:true,screenIds:["s"]}}),"STALE");
});

test("BASIC obsoleto não retorna versão antiga de topo",()=>{
  const s=screen();s.telemetry.session.lastHeartbeatAt=new Date(now-120000).toISOString();
  assert.equal(reportedAppVersion(s,now),null);
  assert.equal(getPortalScreenStatus(s,now),"OFFLINE");
});

test("schema legado não recebe classificação BASIC",()=>{
  const s=screen();s.telemetry={schemaVersion:4,traffic:{appInternetReceivedBytes:100}};
  assert.equal(isBasicTelemetry(s.telemetry),false);
  assert.equal(isSchema4Traffic(s),true);
  assert.equal(reportedAppVersion(s,now),"v73-antiga (73)");
});
