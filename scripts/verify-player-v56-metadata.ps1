param(
    [Parameter(Mandatory = $true)]
    [string]$AdbSerial,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9._]+$')]
    [string]$PackageName,

    [string]$AdbPath = "adb",
    [string]$ApkSignerPath = "apksigner"
)

$ErrorActionPreference = "Stop"

function Invoke-AdbReadOnly {
    param([string[]]$Arguments)
    $output = & $AdbPath -s $AdbSerial @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "ADB read failed: $($Arguments -join ' ')"
    }
    return @($output | ForEach-Object { "$_" })
}

# adb shell dumpsys package <package>
$packageDump = Invoke-AdbReadOnly -Arguments @("shell", "dumpsys", "package", $PackageName)
if (-not ($packageDump -match [regex]::Escape($PackageName))) {
    throw "Requested package was not found: $PackageName"
}

# adb shell pm path <package>
$pathLines = Invoke-AdbReadOnly -Arguments @("shell", "pm", "path", $PackageName)
$remoteBaseApk = $pathLines |
    Where-Object { $_ -match '^package:.+base\.apk$' } |
    Select-Object -First 1
if (-not $remoteBaseApk) {
    $remoteBaseApk = $pathLines | Where-Object { $_ -match '^package:' } | Select-Object -First 1
}
if (-not $remoteBaseApk) {
    throw "No APK path was reported for: $PackageName"
}
$remoteBaseApk = $remoteBaseApk -replace '^package:', ''

$versionCodeMatch = [regex]::Match(($packageDump -join "`n"), 'versionCode=(\d+)')
$versionNameMatch = [regex]::Match(($packageDump -join "`n"), 'versionName=([^\s]+)')
$activityLine = $packageDump |
    Where-Object { $_ -match [regex]::Escape($PackageName) -and $_ -match '/[^\s]+Activity' } |
    Select-Object -First 1
$activityMatch = if ($activityLine) {
    [regex]::Match($activityLine, [regex]::Escape($PackageName) + '/([^\s}]+Activity)')
} else {
    $null
}

$tempApk = Join-Path ([IO.Path]::GetTempPath()) ("totempark-v56-installed-{0}.apk" -f [guid]::NewGuid().ToString("N"))
$certificateSha256 = $null
try {
    Invoke-AdbReadOnly -Arguments @("pull", $remoteBaseApk, $tempApk) | Out-Null
    $signerOutput = & $ApkSignerPath verify --print-certs $tempApk 2>&1
    if ($LASTEXITCODE -eq 0) {
        $digestLine = $signerOutput |
            Where-Object { $_ -match 'SHA-256 digest:' } |
            Select-Object -First 1
        if ($digestLine) {
            $certificateSha256 = ([regex]::Match("$digestLine", 'SHA-256 digest:\s*(.+)$')).Groups[1].Value.Trim()
        }
    }
} finally {
    if (Test-Path -LiteralPath $tempApk) {
        Remove-Item -LiteralPath $tempApk -Force
    }
}

[ordered]@{
    installedPackage = $PackageName
    adbSerial = $AdbSerial
    apkPath = $remoteBaseApk
    activity = if ($activityMatch -and $activityMatch.Success) { $activityMatch.Groups[1].Value } else { $null }
    versionCode = if ($versionCodeMatch.Success) { [int64]$versionCodeMatch.Groups[1].Value } else { $null }
    versionName = if ($versionNameMatch.Success) { $versionNameMatch.Groups[1].Value } else { $null }
    certificateSha256 = $certificateSha256
    collectedAt = [DateTimeOffset]::UtcNow.ToString("o")
} | ConvertTo-Json -Depth 3
