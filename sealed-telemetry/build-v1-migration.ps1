$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$stage = Join-Path $repo 'artifacts/fast-track-telemetry-v1/stage/android'
$output = Join-Path $repo 'artifacts/telemetry-v1-migration'
$previousApk = Join-Path $repo 'artifacts/fast-track-telemetry-v1/Totem-Park-Player-2A2-C-Telemetry-V1-Pilot.apk'
$mainBundle = Join-Path $stage 'app/src/main/assets/public/assets/index-C8VMWlD5.js'
$mainCss = Join-Path $stage 'app/src/main/assets/public/assets/index-GA5ypR-T.css'
$gradlePath = Join-Path $stage 'app/build.gradle'
$htmlPath = Join-Path $stage 'app/src/main/assets/public/index.html'
$workerPath = Join-Path $stage 'app/src/main/assets/public/sw.js'
$sidecarPath = Join-Path $stage 'app/src/main/assets/public/telemetry-observer.js'
$versionName = '1.0-player-2a2-c-telemetry-v1-migration'

if ((Get-FileHash -LiteralPath $previousApk -Algorithm SHA256).Hash -ne '817171C7A88738E32BCF8D00A9B7166D8E196BD0A9CEFE815A04EADBC141116E') { throw 'V3 baseline APK hash mismatch' }
if ((Get-FileHash -LiteralPath $mainBundle -Algorithm SHA256).Hash -ne 'E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB') { throw 'Sealed Player bundle changed' }
if ((Get-FileHash -LiteralPath $mainCss -Algorithm SHA256).Hash -ne '77391472D6D3A2A464B24488322B6CBC09511D2E8FAE63229853234DB9594BD5') { throw 'Sealed Player CSS changed' }

$gradle = [IO.File]::ReadAllText($gradlePath)
$oldVersion = "versionCode 3`r`n            versionName `"1.0-player-2a2-c-telemetry-v1`""
if (-not $gradle.Contains($oldVersion)) { $oldVersion = $oldVersion.Replace("`r`n", "`n") }
$newVersion = $oldVersion.Replace('versionCode 3', 'versionCode 4').Replace('1.0-player-2a2-c-telemetry-v1"', "$versionName`"")
if ($gradle.Contains($oldVersion)) {
  [IO.File]::WriteAllText($gradlePath, $gradle.Replace($oldVersion, $newVersion))
} elseif (-not $gradle.Contains($newVersion)) {
  throw 'Expected v3 or v4 Gradle version missing'
}

Push-Location $repo
try {
  & (Join-Path $repo 'node_modules/.bin/vite.cmd') build --config sealed-telemetry/vite.config.js
  if ($LASTEXITCODE -ne 0) { throw 'Sidecar bundle failed' }
} finally { Pop-Location }
$builtSidecar = Join-Path $repo 'artifacts/binary-sealed-telemetry/sidecar-dist/telemetry-observer.js'
if (-not ([IO.File]::ReadAllText($builtSidecar)).Contains($versionName)) { throw 'Sidecar version mismatch' }
Copy-Item -LiteralPath $builtSidecar -Destination $sidecarPath -Force

$html = [IO.File]::ReadAllText($htmlPath)
$oldScript = '<script type="module" src="/telemetry-observer.js"></script>'
$newScript = '<script type="module" src="/telemetry-observer.js?v=4"></script>'
if ($html.Contains($oldScript)) {
  [IO.File]::WriteAllText($htmlPath, $html.Replace($oldScript, $newScript))
} elseif (-not $html.Contains($newScript)) { throw 'Expected v3 or v4 sidecar tag missing' }

$worker = [IO.File]::ReadAllText($workerPath)
if ($worker.Contains('const CACHE_NAME = "totem-park-pwa-v3";')) {
  $worker = $worker.Replace('const CACHE_NAME = "totem-park-pwa-v3";', 'const CACHE_NAME = "totem-park-pwa-v3-telemetry-v1-migration";')
  $worker = $worker.Replace('  "/tv",', "  `"/tv`",`n  `"/telemetry-observer.js?v=4`",")
  [IO.File]::WriteAllText($workerPath, $worker)
} elseif (-not $worker.Contains('const CACHE_NAME = "totem-park-pwa-v3-telemetry-v1-migration";')) {
  throw 'Expected v3 or v4 shell cache missing'
}

$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Push-Location $stage
try {
  & '.\gradlew.bat' ':app:assemblePlayerTelemetryDebug'
  if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
} finally { Pop-Location }

New-Item -ItemType Directory -Path $output -Force | Out-Null
$apk = Join-Path $output 'Totem-Park-Player-2A2-C-Telemetry-V1-Migration-v4.apk'
Copy-Item -LiteralPath (Join-Path $stage 'app/build/outputs/apk/playerTelemetry/debug/app-playerTelemetry-debug.apk') -Destination $apk -Force

Add-Type -AssemblyName System.IO.Compression
$zip = [IO.Compression.ZipFile]::OpenRead($apk)
try {
  foreach ($entrySpec in @(
    @('assets/public/assets/index-C8VMWlD5.js','E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB'),
    @('assets/public/assets/index-GA5ypR-T.css','77391472D6D3A2A464B24488322B6CBC09511D2E8FAE63229853234DB9594BD5')
  )) {
    $entry = $zip.GetEntry($entrySpec[0])
    if ($null -eq $entry) { throw "Missing sealed asset $($entrySpec[0])" }
    $stream = $entry.Open()
    try { $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)) } finally { $stream.Dispose() }
    if ($hash -ne $entrySpec[1]) { throw "Sealed asset changed: $($entrySpec[0])" }
  }
} finally { $zip.Dispose() }

[PSCustomObject]@{
  Apk = $apk
  ApkSha256 = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
  Package = 'br.com.parksolutions.totempark.player.telemetry'
  VersionCode = 4
  VersionName = $versionName
  PlayerBundleSha256 = (Get-FileHash -LiteralPath $mainBundle -Algorithm SHA256).Hash
  PlayerCssSha256 = (Get-FileHash -LiteralPath $mainCss -Algorithm SHA256).Hash
  SidecarSha256 = (Get-FileHash -LiteralPath $sidecarPath -Algorithm SHA256).Hash
}
