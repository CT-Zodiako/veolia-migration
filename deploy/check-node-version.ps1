#Requires -Version 5.1
<#
.SYNOPSIS
    Warns when the IIS server's Node.js is older than the pinned version.

.DESCRIPTION
    The deployment does not use Node.js on the server: the frontend is built on the GitHub runner
    with the version pinned in .nvmrc. Node.js may still be installed on the server for other
    reasons, and an outdated runtime is a security exposure. This check compares it with the
    pinned version and emits a GitHub Actions warning when it is older. It never fails.

.PARAMETER ExpectedVersionFile
    Path to the file holding the pinned version (a copy of .nvmrc), e.g. "24.22.1".

.PARAMETER NodeExecutable
    Node.js executable to check. Defaults to the "node" found on PATH.
#>
param(
    [Parameter(Mandatory = $true)][string]$ExpectedVersionFile,
    [string]$NodeExecutable = 'node'
)

$title = 'Outdated Node.js on IIS server'

try {
    $expected = [version]((Get-Content -LiteralPath $ExpectedVersionFile -Raw -ErrorAction Stop).Trim().TrimStart('v'))
} catch {
    Write-Output "::warning title=$title::Could not read the pinned Node.js version from '$ExpectedVersionFile'."
    exit 0
}

if (-not (Get-Command $NodeExecutable -ErrorAction SilentlyContinue)) {
    Write-Output "Node.js is not installed on this server; the deployment does not need it."
    exit 0
}

try {
    $actual = [version]((& $NodeExecutable --version | Out-String).Trim().TrimStart('v'))
} catch {
    Write-Output "::warning title=$title::Could not read the server Node.js version; expected $expected or later."
    exit 0
}

if ($actual -lt $expected) {
    Write-Output "::warning title=$title::The server has Node.js $actual; update it to $expected or later (security patch). The deployment does not use it, so this is a warning only."
} else {
    Write-Output "Server Node.js $actual is up to date (pinned $expected)."
}
exit 0
