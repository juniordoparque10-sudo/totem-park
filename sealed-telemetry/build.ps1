$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$baselineApk = Join-Path $repo 'artifacts/rebaseline-rc5/Totem-Park-Player-ROLLBACK-RC5-v11.apk'
$output = Join-Path $repo 'artifacts/binary-sealed-telemetry'
$stage = Join-Path $output ('stage-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$androidSource = Join-Path $repo 'android'
$androidStage = Join-Path $stage 'android'
$publicStage = Join-Path $androidStage 'app/src/main/assets/public'
$expectedBaselineHash = 'F67F7D8CA6523D23B263EE854CF3CE6F44EF80DC96C48C9E3B81CF7560B21AE9'

if ((Get-FileHash -Algorithm SHA256 -LiteralPath $baselineApk).Hash -ne $expectedBaselineHash) {
  throw 'Rollback v11 APK hash mismatch; build stopped.'
}

New-Item -ItemType Directory -Path $androidStage, $publicStage -Force | Out-Null
foreach ($file in @('build.gradle', 'settings.gradle', 'variables.gradle', 'gradle.properties',
    'gradlew', 'gradlew.bat', 'capacitor.settings.gradle', 'local.properties')) {
  Copy-Item -LiteralPath (Join-Path $androidSource $file) -Destination (Join-Path $androidStage $file)
}
Copy-Item -LiteralPath (Join-Path $androidSource 'gradle') -Destination (Join-Path $androidStage 'gradle') -Recurse
New-Item -ItemType Directory -Path (Join-Path $androidStage 'app') -Force | Out-Null
foreach ($file in @('build.gradle', 'capacitor.build.gradle', 'proguard-rules.pro')) {
  Copy-Item -LiteralPath (Join-Path $androidSource "app/$file") -Destination (Join-Path $androidStage "app/$file")
}
Copy-Item -LiteralPath (Join-Path $androidSource 'app/src/main/AndroidManifest.xml') -Destination (Join-Path $androidStage 'app/src/main/AndroidManifest.xml') -Force
foreach ($dir in @('java', 'res')) {
  Copy-Item -LiteralPath (Join-Path $androidSource "app/src/main/$dir") -Destination (Join-Path $androidStage "app/src/main/$dir") -Recurse
}
Copy-Item -LiteralPath (Join-Path $androidSource 'capacitor-cordova-android-plugins') -Destination (Join-Path $androidStage 'capacitor-cordova-android-plugins') -Recurse

$settingsPath = Join-Path $androidStage 'capacitor.settings.gradle'
$nodeModulesPath = (Join-Path $repo 'node_modules').Replace('\', '/')
$settings = [IO.File]::ReadAllText($settingsPath).Replace('../node_modules', $nodeModulesPath)
[IO.File]::WriteAllText($settingsPath, $settings)

$gradlePath = Join-Path $androidStage 'app/build.gradle'
$gradle = [IO.File]::ReadAllText($gradlePath)
$oldFlavor = @'
        playerTelemetry {
            dimension "appMode"
            applicationIdSuffix ".player.telemetry"
            versionCode 1
            versionName "1.0-player-2a2-c-telemetry-pilot"
'@
$newFlavor = @'
        playerTelemetry {
            dimension "appMode"
            applicationIdSuffix ".player.telemetry"
            versionCode 2
            versionName "1.0-player-2a2-c-binary-sealed-pilot"
'@
if (-not $gradle.Contains($oldFlavor)) { throw 'Expected isolated telemetry flavor not found; build stopped.' }
[IO.File]::WriteAllText($gradlePath, $gradle.Replace($oldFlavor, $newFlavor))

Push-Location $repo
try {
  & (Join-Path $repo 'node_modules/.bin/vite.cmd') build --config sealed-telemetry/vite.config.js
  if ($LASTEXITCODE -ne 0) { throw 'Sidecar bundling failed.' }
} finally { Pop-Location }
$sidecar = Join-Path $output 'sidecar-dist/telemetry-observer.js'
if (-not (Test-Path -LiteralPath $sidecar)) { throw 'Sidecar output missing.' }

Add-Type -AssemblyName System.IO.Compression
$archive = [IO.Compression.ZipFile]::OpenRead($baselineApk)
$baselineHashes = @{}
try {
  foreach ($entry in $archive.Entries) {
    if ($entry.FullName.EndsWith('/')) { continue }
    if ($entry.FullName.StartsWith('assets/public/')) {
      $relative = $entry.FullName.Substring('assets/public/'.Length)
      $target = [IO.Path]::GetFullPath((Join-Path $publicStage $relative))
      if (-not $target.StartsWith(([IO.Path]::GetFullPath($publicStage) + [IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe APK entry: $($entry.FullName)"
      }
      New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($target)) -Force | Out-Null
      $inputStream = $entry.Open()
      $outputStream = [IO.File]::Create($target)
      try { $inputStream.CopyTo($outputStream) } finally { $inputStream.Dispose(); $outputStream.Dispose() }
      $baselineHashes[$relative] = (Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash
    } elseif ($entry.FullName -in @('assets/capacitor.config.json', 'assets/capacitor.plugins.json')) {
      $target = Join-Path (Join-Path $androidStage 'app/src/main/assets') ([IO.Path]::GetFileName($entry.FullName))
      New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($target)) -Force | Out-Null
      $inputStream = $entry.Open()
      $outputStream = [IO.File]::Create($target)
      try { $inputStream.CopyTo($outputStream) } finally { $inputStream.Dispose(); $outputStream.Dispose() }
    }
  }
} finally { $archive.Dispose() }

$htmlPath = Join-Path $publicStage 'index.html'
$html = [IO.File]::ReadAllText($htmlPath)
$needle = '<script type="module" crossorigin src="/assets/index-C8VMWlD5.js"></script>'
if (-not $html.Contains($needle)) { throw 'Expected v11 entry bundle missing; build stopped.' }
$html = $html.Replace($needle, ($needle + [Environment]::NewLine + '    <script type="module" src="/telemetry-observer.js"></script>'))
[IO.File]::WriteAllText($htmlPath, $html)
Copy-Item -LiteralPath $sidecar -Destination (Join-Path $publicStage 'telemetry-observer.js')

# A prior telemetry-package install may retain the v11 service worker's cached
# HTML. Version only the app-shell cache and precache the added observer so an
# offline reopen uses the new wrapper. Playback assets and fetch logic stay sealed.
$workerPath = Join-Path $publicStage 'sw.js'
$worker = [IO.File]::ReadAllText($workerPath)
if (-not $worker.Contains('const CACHE_NAME = "totem-park-pwa-v3";') -or -not $worker.Contains('  "/tv",')) {
  throw 'Expected v11 service worker shell missing; build stopped.'
}
$worker = $worker.Replace('const CACHE_NAME = "totem-park-pwa-v3";', 'const CACHE_NAME = "totem-park-pwa-v3-sealed-telemetry";')
$worker = $worker.Replace('  "/tv",', ('  "/tv",' + [Environment]::NewLine + '  "/telemetry-observer.js",'))
[IO.File]::WriteAllText($workerPath, $worker)

foreach ($relative in $baselineHashes.Keys) {
  if ($relative -in @('index.html', 'sw.js')) { continue }
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $publicStage $relative)).Hash
  if ($actual -ne $baselineHashes[$relative]) { throw "Sealed asset changed before APK: $relative" }
}

$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Push-Location $androidStage
try {
  & '.\gradlew.bat' ':app:assemblePlayerTelemetryDebug'
  if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
} finally { Pop-Location }

$builtApk = Join-Path $androidStage 'app/build/outputs/apk/playerTelemetry/debug/app-playerTelemetry-debug.apk'
$finalApk = Join-Path $output 'Totem-Park-Player-2A2-C-BINARY-SEALED-PILOT.apk'
Copy-Item -LiteralPath $builtApk -Destination $finalApk
$builtArchive = [IO.Compression.ZipFile]::OpenRead($finalApk)
try {
  foreach ($relative in $baselineHashes.Keys) {
    if ($relative -in @('index.html', 'sw.js')) { continue }
    $entry = $builtArchive.GetEntry("assets/public/$relative")
    if ($null -eq $entry) { throw "Sealed asset missing from APK: $relative" }
    $stream = $entry.Open()
    try { $actual = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)) } finally { $stream.Dispose() }
    if ($actual -ne $baselineHashes[$relative]) { throw "Sealed asset changed in APK: $relative" }
  }
} finally { $builtArchive.Dispose() }

[PSCustomObject]@{
  BaselineApk = $baselineApk
  BaselineBundleHash = $baselineHashes['assets/index-C8VMWlD5.js']
  PilotBundleHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $publicStage 'assets/index-C8VMWlD5.js')).Hash
  BaselineCssHash = $baselineHashes['assets/index-GA5ypR-T.css']
  PilotCssHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $publicStage 'assets/index-GA5ypR-T.css')).Hash
  CheckedAssets = $baselineHashes.Count - 2
  PilotApk = $finalApk
  PilotApkHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $finalApk).Hash
}
