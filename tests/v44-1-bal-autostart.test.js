import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const receiver = fs.readFileSync(new URL("../android/app/src/main/java/br/com/parksolutions/totempark/BootReceiver.java", import.meta.url), "utf8");
const manifest = fs.readFileSync(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");

test("LOCKED_BOOT_COMPLETED aguarda BOOT_COMPLETED sem abrir Activity", () => {
  const guard = receiver.indexOf("Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(intent.getAction())");
  const launch = receiver.indexOf("launchPlayer(context, IMMEDIATE_LAUNCH_REQUEST_CODE)");
  const bootLikeStart = receiver.indexOf("private boolean isBootLikeEvent");
  const bootLikeEnd = receiver.indexOf("private PendingIntent createLaunchPendingIntent", bootLikeStart);
  assert.ok(guard >= 0 && launch > guard);
  assert.match(receiver.slice(guard, launch), /return;/);
  assert.doesNotMatch(receiver.slice(bootLikeStart, bootLikeEnd), /ACTION_LOCKED_BOOT_COMPLETED/);
});

test("BOOT_COMPLETED mantém tentativa imediata e retries controlados", () => {
  assert.match(receiver, /ACTION_BOOT_COMPLETED/);
  assert.match(receiver, /launchPlayer\(context, IMMEDIATE_LAUNCH_REQUEST_CODE\)/);
  for (const delay of ["3_000", "10_000", "25_000", "45_000"]) {
    assert.match(receiver, new RegExp(`schedulePlayerLaunch\\(context, ${delay},`));
  }
});

test("helper concede BAL creator-side somente em API 34+", () => {
  assert.match(receiver, /Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.UPSIDE_DOWN_CAKE/);
  assert.match(receiver, /setPendingIntentCreatorBackgroundActivityStartMode\(\s*ActivityOptions\.MODE_BACKGROUND_ACTIVITY_START_ALLOWED/);
  assert.match(receiver, /PendingIntent\.getActivity\([\s\S]*creatorOptions\.toBundle\(\)/);
});

test("tentativa imediata concede BAL sender-side e trata cancelamento", () => {
  assert.match(receiver, /setPendingIntentBackgroundActivityStartMode\(\s*ActivityOptions\.MODE_BACKGROUND_ACTIVITY_START_ALLOWED/);
  assert.match(receiver, /launchPendingIntent\.send\(context, 0, null, null, null, null, sendOptions\.toBundle\(\)\)/);
  assert.match(receiver, /catch \(PendingIntent\.CanceledException \| RuntimeException error\)/);
  assert.doesNotMatch(receiver, /context\.startActivity/);
});

test("retries reutilizam helper BAL e PendingIntent permanece immutable", () => {
  assert.match(receiver, /schedulePlayerLaunch[\s\S]*createLaunchPendingIntent\(context, requestCode\)/);
  assert.match(receiver, /flags \|= PendingIntent\.FLAG_IMMUTABLE/);
  assert.doesNotMatch(receiver, /FLAG_MUTABLE/);
});

test("eventos existentes permanecem suportados", () => {
  for (const action of ["ACTION_BOOT_COMPLETED", "ACTION_LOCKED_BOOT_COMPLETED", "ACTION_MY_PACKAGE_REPLACED", "ACTION_SCREEN_ON", "ACTION_USER_PRESENT", "ACTION_DREAMING_STOPPED", "QUICKBOOT_POWERON"]) {
    assert.match(receiver, new RegExp(action));
  }
});

test("PlayerBootService segue sem uso e sem registro", () => {
  assert.doesNotMatch(receiver, /PlayerBootService|startForegroundService|startBootService/);
  assert.doesNotMatch(manifest, /PlayerBootService|android\.permission\.FOREGROUND_SERVICE/);
});
