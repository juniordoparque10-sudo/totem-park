param([switch]$FinalizeOnly)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$baseline = Join-Path $repo 'artifacts/v11-binary-hotfix/Totem-Park-Player-V11-BINARY-HOTFIX-CANDIDATE-v12.apk'
$baselineHash = '8C01E52C4CEE6A4DE0E6B93C8A1A0DA3896AA1EEA31C0096F89C38B3CE1898BB'
$bundleHash = '709BA00A7DC29932AB917EA4617829D9C2E6548BA9232490A5173CE373CF95C0'
$output = Join-Path $repo 'artifacts/v12-operational-telemetry'
$stage = Join-Path $output 'stage/android'
$sourceStage = Join-Path $repo 'artifacts/v11-binary-hotfix/stage/android'
$public = Join-Path $stage 'app/src/main/assets/public'
$versionName = '1.0.0-v12-operational-telemetry-v1-candidate'
$sidecar = Join-Path $output 'sidecar-dist/telemetry-observer.js'

if ((Get-FileHash -LiteralPath $baseline -Algorithm SHA256).Hash -ne $baselineHash) { throw 'v12 APK baseline mismatch' }
if (-not $FinalizeOnly) {
if (Test-Path -LiteralPath $stage) { throw 'Candidate stage already exists; refusing another candidate' }
New-Item -ItemType Directory -Path $stage -Force | Out-Null
foreach ($file in @('build.gradle', 'settings.gradle', 'variables.gradle', 'gradle.properties', 'gradlew', 'gradlew.bat', 'capacitor.settings.gradle', 'local.properties')) {
  Copy-Item -LiteralPath (Join-Path $sourceStage $file) -Destination (Join-Path $stage $file)
}
Copy-Item -LiteralPath (Join-Path $sourceStage 'gradle') -Destination (Join-Path $stage 'gradle') -Recurse
New-Item -ItemType Directory -Path (Join-Path $stage 'app') -Force | Out-Null
foreach ($file in @('build.gradle', 'capacitor.build.gradle', 'proguard-rules.pro')) {
  Copy-Item -LiteralPath (Join-Path $sourceStage "app/$file") -Destination (Join-Path $stage "app/$file")
}
Copy-Item -LiteralPath (Join-Path $sourceStage 'app/src') -Destination (Join-Path $stage 'app/src') -Recurse
Copy-Item -LiteralPath (Join-Path $sourceStage 'capacitor-cordova-android-plugins') -Destination (Join-Path $stage 'capacitor-cordova-android-plugins') -Recurse

$gradlePath = Join-Path $stage 'app/build.gradle'
$gradle = [IO.File]::ReadAllText($gradlePath)
$old = 'versionCode 12' + "`r`n" + '            versionName "1.0.0-v11-binary-hotfix-candidate"'
if (-not $gradle.Contains($old)) { $old = $old.Replace("`r`n", "`n") }
if (($gradle.Split($old).Length - 1) -ne 1) { throw 'Official v12 Gradle flavor mismatch' }
$new = $old.Replace('versionCode 12', 'versionCode 13').Replace('1.0.0-v11-binary-hotfix-candidate', $versionName)
[IO.File]::WriteAllText($gradlePath, $gradle.Replace($old, $new))

Push-Location $repo
try {
  & (Join-Path $repo 'node_modules/.bin/vite.cmd') build --config sealed-telemetry/official-v13/vite.config.js
  if ($LASTEXITCODE -ne 0) { throw 'Official sidecar bundle failed' }
} finally { Pop-Location }
if (-not ([IO.File]::ReadAllText($sidecar)).Contains($versionName)) { throw 'Official sidecar appVersion missing' }
Copy-Item -LiteralPath $sidecar -Destination (Join-Path $public 'telemetry-observer.js')

$bundle = Join-Path $public 'assets/index-C8VMWlD5-hotfix.js'
if ((Get-FileHash -LiteralPath $bundle -Algorithm SHA256).Hash -ne $bundleHash) { throw 'v12 Player bundle changed' }
$htmlPath = Join-Path $public 'index.html'
$html = [IO.File]::ReadAllText($htmlPath)
$needle = '</head>'
if (($html.Split($needle).Length - 1) -ne 1 -or $html.Contains('telemetry-observer.js')) { throw 'Unexpected v12 HTML' }
[IO.File]::WriteAllText($htmlPath, $html.Replace($needle, '    <script type="module" src="/telemetry-observer.js?v=13"></script>' + "`r`n  " + $needle))
$swPath = Join-Path $public 'sw.js'
$sw = [IO.File]::ReadAllText($swPath)
$oldCache = 'totem-park-pwa-v3-v11-hotfix-candidate'
if (($sw.Split($oldCache).Length - 1) -ne 1) { throw 'Unexpected v12 shell cache' }
[IO.File]::WriteAllText($swPath, $sw.Replace($oldCache, 'totem-park-pwa-v3-v12-operational-v1'))
} else {
  if (-not (Test-Path -LiteralPath $stage)) { throw 'Prepared candidate stage missing' }
  if ((Get-FileHash -LiteralPath (Join-Path $public 'assets/index-C8VMWlD5-hotfix.js') -Algorithm SHA256).Hash -ne $bundleHash) { throw 'v12 Player bundle changed' }
  if ((Get-FileHash -LiteralPath (Join-Path $public 'telemetry-observer.js') -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $sidecar -Algorithm SHA256).Hash) { throw 'Sidecar changed after preparation' }
}

$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Push-Location $stage
try {
  & '.\gradlew.bat' ':app:assemblePlayerRollbackDebug'
  if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
} finally { Pop-Location }

$apk = Join-Path $output 'Totem-Park-Player-V12-Operational-Telemetry-V1-Candidate-v13.apk'
Copy-Item -LiteralPath (Join-Path $stage 'app/build/outputs/apk/playerRollback/debug/app-playerRollback-debug.apk') -Destination $apk
Add-Type -AssemblyName System.IO.Compression
$baseZip = [IO.Compression.ZipFile]::OpenRead($baseline)
$newZip = [IO.Compression.ZipFile]::OpenRead($apk)
try {
  $checked = 0
  foreach ($entry in $baseZip.Entries) {
    if (-not $entry.FullName.StartsWith('assets/public/') -or $entry.FullName.EndsWith('/') -or $entry.FullName -in @('assets/public/index.html', 'assets/public/sw.js')) { continue }
    $candidate = $newZip.GetEntry($entry.FullName)
    if ($null -eq $candidate) { throw "Missing v12 asset $($entry.FullName)" }
    $left = $entry.Open(); $right = $candidate.Open()
    try {
      $leftHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($left))
      $rightHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($right))
    } finally { $left.Dispose(); $right.Dispose() }
    if ($leftHash -ne $rightHash) { throw "v12 asset changed: $($entry.FullName)" }
    $checked += 1
  }
  if (-not $newZip.GetEntry('assets/public/telemetry-observer.js')) { throw 'Operational sidecar missing' }
} finally { $baseZip.Dispose(); $newZip.Dispose() }

[PSCustomObject]@{
  Apk = $apk
  ApkSha256 = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
  BaselineApkSha256 = $baselineHash
  Package = 'br.com.parksolutions.totempark'
  VersionCode = 13
  VersionName = $versionName
  PlayerBundleSha256 = $bundleHash
  SidecarSha256 = (Get-FileHash -LiteralPath $sidecar -Algorithm SHA256).Hash
  UnchangedPublicAssets = $checked
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'build-report.json')
Get-Content -LiteralPath (Join-Path $output 'build-report.json')
