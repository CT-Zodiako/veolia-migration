#Requires -Version 5.1
#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [string]$ArtifactPath,
    [string]$ApiPath = 'C:\inetpub\wwwroot\veolia-api',
    [string]$FrontendPath = 'C:\inetpub\wwwroot\veolia-frontend',
    [string]$ApiPool = 'veolia-api',
    [string]$FrontendPool = 'veolia-frontend',
    [string]$BackupRoot = 'C:\inetpub\veolia-backups',
    [uri]$FrontendUrl = 'http://localhost/',
    [uri]$ApiUrl = 'http://localhost:5000/',
    [switch]$Rollback
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module WebAdministration -ErrorAction Stop

function Get-SafePath([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path) -or $Path -notmatch '^[A-Za-z]:\\') {
        throw "Use a non-root, local absolute directory: $Path"
    }
    $full = [IO.Path]::GetFullPath($Path).TrimEnd('\')
    if ($full -eq [IO.Path]::GetPathRoot($full).TrimEnd('\')) {
        throw "Use a non-root, local absolute directory: $Path"
    }
    # Reject junctions/symlinks both at the target and in existing ancestors.
    $cursor = $full
    while ($cursor) {
        if (Test-Path -LiteralPath $cursor) {
            $item = Get-Item -LiteralPath $cursor -Force
            if (-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
                throw "Not a regular directory: $cursor"
            }
        }
        $cursor = Split-Path -Path $cursor -Parent
    }
    return $full
}

function Assert-NoLinks([string]$Path) {
    if (Test-Path -LiteralPath $Path) {
        $links = Get-ChildItem -LiteralPath $Path -Force -Recurse | Where-Object {
            $_.Attributes -band [IO.FileAttributes]::ReparsePoint
        }
        if ($links) { throw "Reparse points are not supported inside $Path" }
    }
}

function Copy-Tree([string]$Source, [string]$Destination, [string[]]$Exclude = @()) {
    $arguments = @($Source, $Destination, '/MIR', '/R:2', '/W:2', '/XJ', '/NP', '/NFL', '/NDL')
    if ($Exclude.Count) { $arguments += '/XF'; $arguments += $Exclude }
    & robocopy.exe @arguments | Out-Host
    if ($LASTEXITCODE -ge 8) { throw "Robocopy failed ($LASTEXITCODE): $Source -> $Destination" }
    # Actions propagates LASTEXITCODE; Robocopy's successful codes 1-7 are not failures.
    $global:LASTEXITCODE = 0
}

function Set-PoolState([string]$Name, [string]$Desired) {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        $state = (Get-WebAppPoolState -Name $Name).Value
        if ($state -eq $Desired) { return }
        try {
            if ($Desired -eq 'Stopped' -and $state -ne 'Stopping') { Stop-WebAppPool -Name $Name }
            if ($Desired -eq 'Started' -and $state -ne 'Starting') { Start-WebAppPool -Name $Name }
        } catch {
            if ($attempt -eq 29) { throw }
        }
        Start-Sleep -Seconds 2
    }
    if ((Get-WebAppPoolState -Name $Name).Value -ne $Desired) {
        throw "App Pool '$Name' did not reach '$Desired' within 60 seconds."
    }
}

function Test-Http([uri]$Url) {
    for ($attempt = 1; $attempt -le 12; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) { return }
        } catch { Write-Warning "Smoke check attempt $attempt failed for $Url" }
        Start-Sleep -Seconds 5
    }
    throw "HTTP smoke check failed: $Url. Inspect IIS logs and application configuration; use -Rollback to recover."
}

$ApiPath = Get-SafePath $ApiPath
$FrontendPath = Get-SafePath $FrontendPath
$BackupRoot = Get-SafePath $BackupRoot
$paths = @($ApiPath, $FrontendPath, $BackupRoot)
if (-not $Rollback) {
    if (-not $ArtifactPath) { throw 'ArtifactPath is required unless -Rollback is supplied.' }
    $ArtifactPath = Get-SafePath $ArtifactPath
    $paths += $ArtifactPath
}
for ($i = 0; $i -lt $paths.Count; $i++) {
    for ($j = $i + 1; $j -lt $paths.Count; $j++) {
        if ($paths[$i] -eq $paths[$j] -or
            $paths[$i].StartsWith($paths[$j] + '\', [StringComparison]::OrdinalIgnoreCase) -or
            $paths[$j].StartsWith($paths[$i] + '\', [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Artifact, API, frontend and backup directories must be separate, non-overlapping trees.'
        }
    }
}
foreach ($path in $paths) { Assert-NoLinks $path }
foreach ($url in @($FrontendUrl, $ApiUrl)) {
    if (-not $url.IsAbsoluteUri -or $url.Scheme -notin @('http', 'https') -or -not $url.IsLoopback) {
        throw 'Smoke check URLs must be absolute local HTTP(S) URLs.'
    }
}
$pools = @($ApiPool, $FrontendPool) | Select-Object -Unique
foreach ($pool in $pools) { Get-WebAppPoolState -Name $pool | Out-Null }

# Serialize manual invocations as well as workflow deployments on this server.
$mutex = New-Object System.Threading.Mutex($false, 'Global\VeoliaIisDeployment')
$locked = $false
$restorePools = $false
try {
    try { $locked = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) { throw 'Another Veolia deployment or rollback is running.' }
    if ($Rollback) {
        $backup = Get-ChildItem -LiteralPath $BackupRoot -Directory | Sort-Object Name -Descending |
            Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'complete.json') } |
            Select-Object -First 1
        if (-not $backup) { throw "No complete backup found in $BackupRoot" }
        $metadata = Get-Content -LiteralPath (Join-Path $backup.FullName 'complete.json') -Raw | ConvertFrom-Json
        if ($metadata.apiPath -ne $ApiPath -or $metadata.frontendPath -ne $FrontendPath) {
            throw 'Latest backup belongs to different target paths. Supply its original paths or a dedicated BackupRoot.'
        }
        $source = $backup.FullName
        Write-Host "Restoring backup: $source"
    } else {
        $source = $ArtifactPath
        foreach ($file in @('api\Veolia.Api.dll', 'api\web.config', 'frontend\index.html', 'commit-sha.txt')) {
            if (-not (Test-Path -LiteralPath (Join-Path $source $file) -PathType Leaf)) {
                throw "Incomplete artifact: missing $file"
            }
        }
        $sha = (Get-Content -LiteralPath (Join-Path $source 'commit-sha.txt') -Raw).Trim()
        if ($sha -notmatch '^[a-fA-F0-9]{40}$') { throw 'Invalid artifact commit SHA.' }
        Write-Host "Deploying commit $sha"
    }
    foreach ($folder in @('api', 'frontend')) {
        if (-not (Test-Path -LiteralPath (Join-Path $source $folder) -PathType Container)) {
            throw "Missing source directory: $folder"
        }
    }
    $restorePools = $true
    foreach ($pool in $pools) { Set-PoolState $pool 'Stopped' }
    foreach ($target in @($ApiPath, $FrontendPath)) { New-Item -ItemType Directory -Path $target -Force | Out-Null }
    if (-not $Rollback) {
        $backupPath = Join-Path $BackupRoot ((Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffffffZ'))
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        Copy-Tree $ApiPath (Join-Path $backupPath 'api')
        Copy-Tree $FrontendPath (Join-Path $backupPath 'frontend')
        @{ apiPath = $ApiPath; frontendPath = $FrontendPath; deployingCommit = $sha } |
            ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupPath 'complete.json') -Encoding UTF8
        Write-Host "Backup completed: $backupPath"
        Copy-Tree (Join-Path $source 'api') $ApiPath @('appsettings*.json')
        Copy-Tree (Join-Path $source 'frontend') $FrontendPath @('web.config', 'web.config.bak')
    } else {
        Copy-Tree (Join-Path $source 'api') $ApiPath
        Copy-Tree (Join-Path $source 'frontend') $FrontendPath
    }
    foreach ($pool in $pools) { Set-PoolState $pool 'Started' }
    $restorePools = $false
    Test-Http $FrontendUrl
    Test-Http ([uri]::new($ApiUrl, 'api/health'))
    Write-Host 'Deployment operation and local smoke checks succeeded.'
} catch {
    throw "IIS deployment failed: $($_.Exception.Message) Latest complete backup remains available for explicit rollback."
} finally {
    if ($restorePools) {
        foreach ($pool in $pools) {
            try { Set-PoolState $pool 'Started' } catch { Write-Warning "Could not restart pool '$pool': $($_.Exception.Message)" }
        }
    }
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
