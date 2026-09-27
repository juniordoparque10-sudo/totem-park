$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$output = Join-Path $repo 'artifacts/v11-binary-hotfix'
$stage = Join-Path $output ('stage-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '/android')
$publicStage = Join-Path $stage 'app/src/main/assets/public'
$baselineApk = Join-Path $repo 'artifacts/rebaseline-rc5/Totem-Park-Player-ROLLBACK-RC5-v11.apk'
$expectedApkHash = 'F67F7D8CA6523D23B263EE854CF3CE6F44EF80DC96C48C9E3B81CF7560B21AE9'
$expectedJsHash = 'E156CCFE9D13D6417B6B95D15DFD8FBDF3DF525BDB84E88FBD8792A8A2C065EB'
$versionName = '1.0.0-v11-binary-hotfix-candidate'
$versionCode = 12

if ((Get-FileHash -LiteralPath $baselineApk -Algorithm SHA256).Hash -ne $expectedApkHash) { throw 'v11 rollback APK hash mismatch' }
if (Test-Path -LiteralPath $stage) { throw 'Build stage already exists; use a fresh, explicit output directory' }
New-Item -ItemType Directory -Path $stage, $publicStage -Force | Out-Null
$androidSource = Join-Path $repo 'android'
foreach ($file in @('build.gradle', 'settings.gradle', 'variables.gradle', 'gradle.properties', 'gradlew', 'gradlew.bat', 'capacitor.settings.gradle', 'local.properties')) {
  Copy-Item -LiteralPath (Join-Path $androidSource $file) -Destination (Join-Path $stage $file)
}
Copy-Item -LiteralPath (Join-Path $androidSource 'gradle') -Destination (Join-Path $stage 'gradle') -Recurse
New-Item -ItemType Directory -Path (Join-Path $stage 'app') -Force | Out-Null
foreach ($file in @('build.gradle', 'capacitor.build.gradle', 'proguard-rules.pro')) {
  Copy-Item -LiteralPath (Join-Path $androidSource "app/$file") -Destination (Join-Path $stage "app/$file")
}
Copy-Item -LiteralPath (Join-Path $androidSource 'app/src/main/AndroidManifest.xml') -Destination (Join-Path $stage 'app/src/main/AndroidManifest.xml') -Force
foreach ($dir in @('java', 'res')) {
  Copy-Item -LiteralPath (Join-Path $androidSource "app/src/main/$dir") -Destination (Join-Path $stage "app/src/main/$dir") -Recurse
}
Copy-Item -LiteralPath (Join-Path $androidSource 'capacitor-cordova-android-plugins') -Destination (Join-Path $stage 'capacitor-cordova-android-plugins') -Recurse

$settingsPath = Join-Path $stage 'capacitor.settings.gradle'
$nodeModulesPath = (Join-Path $repo 'node_modules').Replace('\', '/')
[IO.File]::WriteAllText($settingsPath, ([IO.File]::ReadAllText($settingsPath).Replace('../node_modules', $nodeModulesPath)))

$gradlePath = Join-Path $stage 'app/build.gradle'
$gradle = [IO.File]::ReadAllText($gradlePath)
$oldFlavor = @'
        playerRollback {
            dimension "appMode"
            versionCode 11
            versionName "1.0.0-2a2-rc4-rollback-rc5"
'@
$newFlavor = @"
        playerRollback {
            dimension "appMode"
            versionCode $versionCode
            versionName "$versionName"
"@
if (($gradle.Split($oldFlavor).Length - 1) -ne 1) { throw 'Expected official v11 flavor not found exactly once' }
[IO.File]::WriteAllText($gradlePath, $gradle.Replace($oldFlavor, $newFlavor))

Add-Type -AssemblyName System.IO.Compression
$archive = [IO.Compression.ZipFile]::OpenRead($baselineApk)
$originalHashes = @{}
try {
  foreach ($entry in $archive.Entries) {
    if ($entry.FullName.EndsWith('/')) { continue }
    if ($entry.FullName.StartsWith('assets/public/')) {
      $relative = $entry.FullName.Substring('assets/public/'.Length)
      $target = [IO.Path]::GetFullPath((Join-Path $publicStage $relative))
      if (-not $target.StartsWith(([IO.Path]::GetFullPath($publicStage) + [IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe APK entry $($entry.FullName)" }
      New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($target)) -Force | Out-Null
      $inputStream = $entry.Open()
      $outputStream = [IO.File]::Create($target)
      try { $inputStream.CopyTo($outputStream) } finally { $inputStream.Dispose(); $outputStream.Dispose() }
      $originalHashes[$relative] = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
    } elseif ($entry.FullName -in @('assets/capacitor.config.json', 'assets/capacitor.plugins.json')) {
      $target = Join-Path (Join-Path $stage 'app/src/main/assets') ([IO.Path]::GetFileName($entry.FullName))
      New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($target)) -Force | Out-Null
      $inputStream = $entry.Open()
      $outputStream = [IO.File]::Create($target)
      try { $inputStream.CopyTo($outputStream) } finally { $inputStream.Dispose(); $outputStream.Dispose() }
    }
  }
} finally { $archive.Dispose() }
if ($originalHashes['assets/index-C8VMWlD5.js'] -ne $expectedJsHash) { throw 'Extracted v11 Player bundle mismatch' }

$originalJs = Join-Path $publicStage 'assets/index-C8VMWlD5.js'
$patchedJs = Join-Path $publicStage 'assets/index-C8VMWlD5-hotfix.js'
$patchReport = Join-Path $output 'patch-report.json'
& node (Join-Path $repo 'scripts/patch-v11-hotfix.mjs') $originalJs $patchedJs $patchReport
if ($LASTEXITCODE -ne 0) { throw 'Bundle patch failed' }
$patchedHash = (Get-FileHash -LiteralPath $patchedJs -Algorithm SHA256).Hash

$htmlPath = Join-Path $publicStage 'index.html'
$html = [IO.File]::ReadAllText($htmlPath)
$oldScript = 'src="/assets/index-C8VMWlD5.js"'
$newScript = 'src="/assets/index-C8VMWlD5-hotfix.js"'
if (($html.Split($oldScript).Length - 1) -ne 1) { throw 'Unexpected v11 script tag' }
[IO.File]::WriteAllText($htmlPath, $html.Replace($oldScript, $newScript))

$workerPath = Join-Path $publicStage 'sw.js'
$worker = [IO.File]::ReadAllText($workerPath)
$oldCacheName = 'const CACHE_NAME = "totem-park-pwa-v3";'
if (($worker.Split($oldCacheName).Length - 1) -ne 1) { throw 'Unexpected v11 app shell cache' }
[IO.File]::WriteAllText($workerPath, $worker.Replace($oldCacheName, 'const CACHE_NAME = "totem-park-pwa-v3-v11-hotfix-candidate";'))

foreach ($relative in $originalHashes.Keys) {
  if ($relative -in @('index.html', 'sw.js')) { continue }
  if ((Get-FileHash -LiteralPath (Join-Path $publicStage $relative) -Algorithm SHA256).Hash -ne $originalHashes[$relative]) { throw "Unexpected original asset change: $relative" }
}

$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Push-Location $stage
try {
  & '.\gradlew.bat' ':app:assemblePlayerRollbackDebug'
  if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
} finally { Pop-Location }

$apk = Join-Path $output 'Totem-Park-Player-V11-BINARY-HOTFIX-CANDIDATE-v12.apk'
Copy-Item -LiteralPath (Join-Path $stage 'app/build/outputs/apk/playerRollback/debug/app-playerRollback-debug.apk') -Destination $apk
$built = [IO.Compression.ZipFile]::OpenRead($apk)
try {
  $entry = $built.GetEntry('assets/public/assets/index-C8VMWlD5-hotfix.js')
  if (-not $entry) { throw 'Patched bundle missing from APK' }
  $stream = $entry.Open()
  try { $apkBundleHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)) } finally { $stream.Dispose() }
  if ($apkBundleHash -ne $patchedHash) { throw 'Patched bundle changed inside APK' }
  foreach ($relative in $originalHashes.Keys) {
    if ($relative -in @('index.html', 'sw.js')) { continue }
    $asset = $built.GetEntry("assets/public/$relative")
    if (-not $asset) { throw "Original asset missing: $relative" }
    $stream = $asset.Open()
    try { $actual = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)) } finally { $stream.Dispose() }
    if ($actual -ne $originalHashes[$relative]) { throw "Original asset changed: $relative" }
  }
} finally { $built.Dispose() }

$result = [PSCustomObject]@{
  CandidateApk = $apk
  CandidateSha256 = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
  VersionCode = $versionCode
  VersionName = $versionName
  Package = 'br.com.parksolutions.totempark'
  BaselineApkSha256 = $expectedApkHash
  BaselineBundleSha256 = $expectedJsHash
  PatchedBundleSha256 = $patchedHash
  OriginalAssetsPreserved = $originalHashes.Count - 2
}
$result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'build-report.json')
$result
