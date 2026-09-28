param([switch]$FinalizeOnly)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$source = Join-Path $repo 'artifacts/v12-operational-telemetry/stage/android'
$baselineApk = Join-Path $repo 'artifacts/v12-operational-telemetry/Totem-Park-Player-V12-Operational-Telemetry-V1-Candidate-v13.apk'
$output = Join-Path $repo 'artifacts/v14-field-candidate'
$stage = Join-Path $output 'stage/android'
$public = Join-Path $stage 'app/src/main/assets/public'
$oldVersion = '1.0.0-v12-operational-telemetry-v1-candidate'
$newVersion = '1.0.0-v13-operational-telemetry-field-candidate'
$expectedApkHash = '6C6E47166D761ABD4711B43FC109AA8961DF6777EE4B8A203FF17955BD55C139'
$expectedBundleHash = '709BA00A7DC29932AB917EA4617829D9C2E6548BA9232490A5173CE373CF95C0'

function Replace-Once([string]$path, [string]$before, [string]$after) {
  $text = [IO.File]::ReadAllText($path)
  if (($text.Split(@($before), [StringSplitOptions]::None).Length - 1) -ne 1) { throw "Expected one match in $path" }
  [IO.File]::WriteAllText($path, $text.Replace($before, $after))
}

if ((Get-FileHash -LiteralPath $baselineApk -Algorithm SHA256).Hash -ne $expectedApkHash) { throw 'v13 APK baseline mismatch' }
if (-not $FinalizeOnly) {
if (Test-Path -LiteralPath $stage) { throw 'v14 stage already exists; refusing another candidate' }
New-Item -ItemType Directory -Path $stage -Force | Out-Null
foreach ($file in @('build.gradle', 'settings.gradle', 'variables.gradle', 'gradle.properties', 'gradlew', 'gradlew.bat', 'capacitor.settings.gradle', 'local.properties')) {
  Copy-Item -LiteralPath (Join-Path $source $file) -Destination (Join-Path $stage $file)
}
Copy-Item -LiteralPath (Join-Path $source 'gradle') -Destination (Join-Path $stage 'gradle') -Recurse
New-Item -ItemType Directory -Path (Join-Path $stage 'app') -Force | Out-Null
foreach ($file in @('build.gradle', 'capacitor.build.gradle', 'proguard-rules.pro')) {
  Copy-Item -LiteralPath (Join-Path $source "app/$file") -Destination (Join-Path $stage "app/$file")
}
Copy-Item -LiteralPath (Join-Path $source 'app/src') -Destination (Join-Path $stage 'app/src') -Recurse
Copy-Item -LiteralPath (Join-Path $source 'capacitor-cordova-android-plugins') -Destination (Join-Path $stage 'capacitor-cordova-android-plugins') -Recurse

$gradlePath = Join-Path $stage 'app/build.gradle'
Replace-Once $gradlePath ('versionCode 13' + "`n" + '            versionName "' + $oldVersion + '"') ('versionCode 14' + "`n" + '            versionName "' + $newVersion + '"')
$bundle = Join-Path $public 'assets/index-C8VMWlD5-hotfix.js'
if ((Get-FileHash -LiteralPath $bundle -Algorithm SHA256).Hash -ne $expectedBundleHash) { throw 'v13 Player bundle mismatch' }
$patchedBundle = Join-Path $public 'assets/index-C8VMWlD5-field.js'
$patchReport = & node (Join-Path $repo 'scripts/patch-v13-field-overlay.mjs') $bundle $patchedBundle
if ($LASTEXITCODE -ne 0) { throw 'Player overlay patch failed' }
$patchReport | Set-Content -LiteralPath (Join-Path $output 'player-patch-report.json')
Remove-Item -LiteralPath $bundle
Replace-Once (Join-Path $public 'index.html') 'index-C8VMWlD5-hotfix.js' 'index-C8VMWlD5-field.js'
Replace-Once (Join-Path $public 'index.html') 'telemetry-observer.js?v=13' 'telemetry-observer.js?v=14'
Replace-Once (Join-Path $public 'telemetry-observer.js') $oldVersion $newVersion
Replace-Once (Join-Path $public 'sw.js') 'totem-park-pwa-v3-v12-operational-v1' 'totem-park-pwa-v3-v14-field'
} else {
  if (-not (Test-Path -LiteralPath $stage)) { throw 'Prepared v14 stage missing' }
  if (-not (Test-Path -LiteralPath (Join-Path $output 'player-patch-report.json'))) { throw 'Player patch report missing' }
  $patchedBundle = Join-Path $public 'assets/index-C8VMWlD5-field.js'
  $report = Get-Content -LiteralPath (Join-Path $output 'player-patch-report.json') -Raw | ConvertFrom-Json
  if ((Get-FileHash -LiteralPath $patchedBundle -Algorithm SHA256).Hash -ne $report.outputSha256) { throw 'Prepared Player patch changed' }
}

$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Push-Location $stage
try {
  & '.\gradlew.bat' ':app:assemblePlayerRollbackDebug'
  if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
} finally { Pop-Location }

$apk = Join-Path $output 'Totem-Park-Player-V14-Field-Candidate.apk'
Copy-Item -LiteralPath (Join-Path $stage 'app/build/outputs/apk/playerRollback/debug/app-playerRollback-debug.apk') -Destination $apk
[PSCustomObject]@{
  Apk = $apk
  ApkSha256 = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
  BaselineApkSha256 = $expectedApkHash
  Package = 'br.com.parksolutions.totempark'
  VersionCode = 14
  VersionName = $newVersion
  PlayerBundleSha256 = (Get-FileHash -LiteralPath $patchedBundle -Algorithm SHA256).Hash
  SidecarSha256 = (Get-FileHash -LiteralPath (Join-Path $public 'telemetry-observer.js') -Algorithm SHA256).Hash
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'build-report.json')
Get-Content -LiteralPath (Join-Path $output 'build-report.json')
