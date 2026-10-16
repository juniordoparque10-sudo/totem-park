param(
    [Parameter(Mandatory = $true)][string]$InstalledMetadata,
    [Parameter(Mandatory = $true)][string]$ApkPath,
    [string]$AaptPath = "$env:USERPROFILE\AppData\Local\Android\Sdk\build-tools\37.0.0\aapt.exe",
    [string]$ApkSignerPath = "$env:USERPROFILE\AppData\Local\Android\Sdk\build-tools\37.0.0\apksigner.bat"
)

$ErrorActionPreference = "Stop"
$expectedPackage = "br.com.parksolutions.totempark.player.rcsecurelink"
$expectedActivity = "br.com.parksolutions.totempark.MainActivity"
$expectedVersionCode = 56
$expectedVersionName = "1.0.0-v56-experimental"
$metadataText = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $InstalledMetadata))
$installedCertificate = [regex]::Match($metadataText, 'certificateSha256:\s*([a-fA-F0-9]{64})').Groups[1].Value.ToLowerInvariant()
if (-not $installedCertificate) { throw "Installed certificate SHA-256 was not found." }

$resolvedApk = (Resolve-Path -LiteralPath $ApkPath).Path
$badging = (& $AaptPath dump badging $resolvedApk 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) { throw "aapt could not inspect the APK." }
$packageMatch = [regex]::Match($badging, "package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'")
$activityMatch = [regex]::Match($badging, "launchable-activity: name='([^']+)'")
$packageName = $packageMatch.Groups[1].Value
$versionCode = [int]$packageMatch.Groups[2].Value
$versionName = $packageMatch.Groups[3].Value
$activity = $activityMatch.Groups[1].Value

$signer = (& $ApkSignerPath verify --print-certs $resolvedApk 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) { throw "apksigner verification failed." }
$certificate = [regex]::Match($signer, 'certificate SHA-256 digest:\s*([a-fA-F0-9]+)').Groups[1].Value.ToLowerInvariant()

if ($packageName -ne $expectedPackage) { throw "Package mismatch: $packageName" }
if ($activity -ne $expectedActivity) { throw "Activity mismatch: $activity" }
if ($versionCode -ne $expectedVersionCode) { throw "VersionCode mismatch: $versionCode" }
if ($versionName -ne $expectedVersionName) { throw "VersionName mismatch: $versionName" }
if ($certificate -ne $installedCertificate) { throw "Certificate mismatch: candidate=$certificate installed=$installedCertificate" }

$repoRoot = Split-Path -Parent $PSScriptRoot
$artifactDir = Join-Path $repoRoot "artifacts"
$artifactPath = Join-Path $artifactDir "Totem Park Player V56.apk"
$manifestPath = Join-Path $repoRoot "docs\verification\player-v56-release.json"
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
Copy-Item -LiteralPath $resolvedApk -Destination $artifactPath -Force
$checksum = (Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest = [ordered]@{
    status = "PASS"
    packageName = $packageName
    activity = $activity
    versionCode = $versionCode
    versionName = $versionName
    certificateSha256 = $certificate
    apkSha256 = $checksum
    artifact = $artifactPath
    installedAutomatically = $false
}
[IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 3))
$manifest | ConvertTo-Json -Depth 3
