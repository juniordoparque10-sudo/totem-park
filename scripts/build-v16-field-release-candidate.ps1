param([switch]$FinalizeOnly)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$source = Join-Path $repo 'artifacts/v15-field-release-candidate/stage/android'
$baselineApk = Join-Path $repo 'artifacts/v15-field-release-candidate/Totem-Park-Player-V15-Field-Release-Candidate.apk'
$output = Join-Path $repo 'artifacts/v16-field-release-candidate'
$stage = Join-Path $output 'stage/android'
$public = Join-Path $stage 'app/src/main/assets/public'
$oldVersion = '1.0.0-v15-field-release-candidate'
$newVersion = '1.0.0-v16-field-release-candidate'
$expectedApkHash = '12AEBA1F1529AC9311732F773383C99E4076FE5DBC399EB23B5C04B399561A6A'

function Replace-Once([string]$path, [string]$before, [string]$after) {
  $text = [IO.File]::ReadAllText($path)
  if (($text.Split(@($before), [StringSplitOptions]::None).Length - 1) -ne 1) { throw "Expected one match in $path" }
  [IO.File]::WriteAllText($path, $text.Replace($before, $after))
}

if ((Get-FileHash -LiteralPath $baselineApk -Algorithm SHA256).Hash -ne $expectedApkHash) { throw 'v15 APK baseline mismatch' }
if (-not $FinalizeOnly) {
  if (Test-Path -LiteralPath $stage) { throw 'v16 stage already exists; refusing another candidate' }
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

  Replace-Once (Join-Path $stage 'app/build.gradle') ('versionCode 15' + "`n" + '            versionName "' + $oldVersion + '"') ('versionCode 16' + "`n" + '            versionName "' + $newVersion + '"')
  $oldJs = Join-Path $public 'assets/index-C8VMWlD5-v15-field.js'
  $newJs = Join-Path $public 'assets/index-C8VMWlD5-v16-field.js'
  $patchReport = & node (Join-Path $repo 'scripts/patch-v15-field-feedback.mjs') $oldJs $newJs
  if ($LASTEXITCODE -ne 0) { throw 'v15 feedback patch failed' }
  $patchReport | Set-Content -LiteralPath (Join-Path $output 'feedback-patch-report.json')
  Remove-Item -LiteralPath $oldJs
  Replace-Once (Join-Path $public 'index.html') 'index-C8VMWlD5-v15-field.js' 'index-C8VMWlD5-v16-field.js'
  Replace-Once (Join-Path $public 'index.html') 'telemetry-observer.js?v=15' 'telemetry-observer.js?v=16'
  Replace-Once (Join-Path $public 'telemetry-observer.js') $oldVersion $newVersion
  Replace-Once (Join-Path $public 'sw.js') 'totem-park-pwa-v3-v15-field' 'totem-park-pwa-v3-v16-field'
} else {
  if (-not (Test-Path -LiteralPath $stage)) { throw 'Prepared v16 stage missing' }
  $report = Get-Content -LiteralPath (Join-Path $output 'feedback-patch-report.json') -Raw | ConvertFrom-Json
  if ((Get-FileHash -LiteralPath (Join-Path $public 'assets/index-C8VMWlD5-v16-field.js') -Algorithm SHA256).Hash -ne $report.outputJsSha256) { throw 'Prepared Player patch changed' }
}

$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Push-Location $stage
try {
  & '.\gradlew.bat' ':app:assemblePlayerRollbackDebug'
  if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
} finally { Pop-Location }

$apk = Join-Path $output 'Totem-Park-Player-V16-Field-Release-Candidate.apk'
Copy-Item -LiteralPath (Join-Path $stage 'app/build/outputs/apk/playerRollback/debug/app-playerRollback-debug.apk') -Destination $apk
[PSCustomObject]@{
  Apk = $apk
  ApkSha256 = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
  BaselineApkSha256 = $expectedApkHash
  Package = 'br.com.parksolutions.totempark'
  VersionCode = 16
  VersionName = $newVersion
  PlayerBundleSha256 = (Get-FileHash -LiteralPath (Join-Path $public 'assets/index-C8VMWlD5-v16-field.js') -Algorithm SHA256).Hash
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'build-report.json')
Get-Content -LiteralPath (Join-Path $output 'build-report.json')
