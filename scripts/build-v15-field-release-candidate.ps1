param([switch]$FinalizeOnly)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$source = Join-Path $repo 'artifacts/v14-field-candidate/stage/android'
$baselineApk = Join-Path $repo 'artifacts/v14-field-candidate/Totem-Park-Player-V14-Field-Candidate.apk'
$output = Join-Path $repo 'artifacts/v15-field-release-candidate'
$stage = Join-Path $output 'stage/android'
$public = Join-Path $stage 'app/src/main/assets/public'
$oldVersion = '1.0.0-v13-operational-telemetry-field-candidate'
$newVersion = '1.0.0-v15-field-release-candidate'
$expectedApkHash = '8381D63430DD7E34414C9F4F4C2FC0A6BD72946D5C3C8510511CCA1BE9046A95'

function Replace-Once([string]$path, [string]$before, [string]$after) {
  $text = [IO.File]::ReadAllText($path)
  if (($text.Split(@($before), [StringSplitOptions]::None).Length - 1) -ne 1) { throw "Expected one match in $path" }
  [IO.File]::WriteAllText($path, $text.Replace($before, $after))
}

if ((Get-FileHash -LiteralPath $baselineApk -Algorithm SHA256).Hash -ne $expectedApkHash) { throw 'v14 APK baseline mismatch' }
if (-not $FinalizeOnly) {
  if (Test-Path -LiteralPath $stage) { throw 'v15 stage already exists; refusing another candidate' }
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

  Replace-Once (Join-Path $stage 'app/build.gradle') ('versionCode 14' + "`n" + '            versionName "' + $oldVersion + '"') ('versionCode 15' + "`n" + '            versionName "' + $newVersion + '"')
  $oldJs = Join-Path $public 'assets/index-C8VMWlD5-field.js'
  $newJs = Join-Path $public 'assets/index-C8VMWlD5-v15-field.js'
  $oldCss = Join-Path $public 'assets/index-GA5ypR-T.css'
  $newCss = Join-Path $public 'assets/index-GA5ypR-T-v15-field.css'
  $patchReport = & node (Join-Path $repo 'scripts/patch-v14-field-feedback.mjs') $oldJs $newJs $oldCss $newCss
  if ($LASTEXITCODE -ne 0) { throw 'v14 feedback patch failed' }
  $patchReport | Set-Content -LiteralPath (Join-Path $output 'feedback-patch-report.json')
  Remove-Item -LiteralPath $oldJs, $oldCss
  Replace-Once (Join-Path $public 'index.html') 'index-C8VMWlD5-field.js' 'index-C8VMWlD5-v15-field.js'
  Replace-Once (Join-Path $public 'index.html') 'index-GA5ypR-T.css' 'index-GA5ypR-T-v15-field.css'
  Replace-Once (Join-Path $public 'index.html') 'telemetry-observer.js?v=14' 'telemetry-observer.js?v=15'
  Replace-Once (Join-Path $public 'telemetry-observer.js') $oldVersion $newVersion
  Replace-Once (Join-Path $public 'sw.js') 'totem-park-pwa-v3-v14-field' 'totem-park-pwa-v3-v15-field'
} else {
  if (-not (Test-Path -LiteralPath $stage)) { throw 'Prepared v15 stage missing' }
  $report = Get-Content -LiteralPath (Join-Path $output 'feedback-patch-report.json') -Raw | ConvertFrom-Json
  if ((Get-FileHash -LiteralPath (Join-Path $public 'assets/index-C8VMWlD5-v15-field.js') -Algorithm SHA256).Hash -ne $report.outputJsSha256) { throw 'Prepared Player patch changed' }
  if ((Get-FileHash -LiteralPath (Join-Path $public 'assets/index-GA5ypR-T-v15-field.css') -Algorithm SHA256).Hash -ne $report.outputCssSha256) { throw 'Prepared CSS patch changed' }
}

$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Push-Location $stage
try {
  & '.\gradlew.bat' ':app:assemblePlayerRollbackDebug'
  if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
} finally { Pop-Location }

$apk = Join-Path $output 'Totem-Park-Player-V15-Field-Release-Candidate.apk'
Copy-Item -LiteralPath (Join-Path $stage 'app/build/outputs/apk/playerRollback/debug/app-playerRollback-debug.apk') -Destination $apk
[PSCustomObject]@{
  Apk = $apk
  ApkSha256 = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
  BaselineApkSha256 = $expectedApkHash
  Package = 'br.com.parksolutions.totempark'
  VersionCode = 15
  VersionName = $newVersion
  PlayerBundleSha256 = (Get-FileHash -LiteralPath (Join-Path $public 'assets/index-C8VMWlD5-v15-field.js') -Algorithm SHA256).Hash
  PlayerCssSha256 = (Get-FileHash -LiteralPath (Join-Path $public 'assets/index-GA5ypR-T-v15-field.css') -Algorithm SHA256).Hash
  SidecarSha256 = (Get-FileHash -LiteralPath (Join-Path $public 'telemetry-observer.js') -Algorithm SHA256).Hash
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'build-report.json')
Get-Content -LiteralPath (Join-Path $output 'build-report.json')
