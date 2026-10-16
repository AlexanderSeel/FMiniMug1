param(
    [string]$EmsdkPath,
    [switch]$SkipEmsdkUpdate,
    [switch]$SkipNpmInstall
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-RepoRoot {
    if ($PSScriptRoot) { return (Resolve-Path $PSScriptRoot).Path }
    return (Get-Location).Path
}

function Find-Emsdk([string]$RepoRoot, [string]$ExplicitPath) {
    $candidates = New-Object System.Collections.Generic.List[string]
    if ($ExplicitPath) { $candidates.Add($ExplicitPath) }
    if ($env:EMSDK) { $candidates.Add($env:EMSDK) }

    $repoDrive = [System.IO.Path]::GetPathRoot($RepoRoot)
    $repoParent = Split-Path $RepoRoot -Parent
    $repoGrandParent = Split-Path $repoParent -Parent

    foreach ($candidate in @(
        (Join-Path $repoGrandParent 'emsdk'),
        (Join-Path $repoParent 'emsdk'),
        (Join-Path $repoDrive 'dev\emsdk'),
        (Join-Path $HOME 'emsdk'),
        (Join-Path $repoDrive 'emsdk')
    )) {
        if ($candidate) { $candidates.Add($candidate) }
    }

    foreach ($candidate in $candidates | Select-Object -Unique) {
        try {
            $resolved = Resolve-Path $candidate -ErrorAction Stop
            if (Test-Path (Join-Path $resolved.Path 'emsdk.bat')) { return $resolved.Path }
        } catch {}
    }
    return $null
}

function Ensure-Command([string]$Name, [string]$InstallHint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name was not found. $InstallHint"
    }
}

$repoRoot = Get-RepoRoot
$webRoot = Join-Path $repoRoot 'web'
if (-not (Test-Path (Join-Path $webRoot 'package.json'))) {
    throw "Could not find web/package.json below $repoRoot"
}

Write-Step 'Checking prerequisites'
Ensure-Command 'git' 'Install Git for Windows and reopen PowerShell.'
Ensure-Command 'node' 'Install Node.js 20+ and reopen PowerShell.'
Ensure-Command 'npm' 'Install Node.js/npm and reopen PowerShell.'

$emsdk = Find-Emsdk $repoRoot $EmsdkPath
if (-not $emsdk) {
    $preferredParent = Split-Path (Split-Path $repoRoot -Parent) -Parent
    if (-not $preferredParent) { $preferredParent = Split-Path $repoRoot -Parent }
    $emsdk = Join-Path $preferredParent 'emsdk'
    Write-Step "Emscripten SDK not found; cloning to $emsdk"
    & git clone https://github.com/emscripten-core/emsdk.git $emsdk
    if ($LASTEXITCODE -ne 0) { throw 'Failed to clone emsdk.' }
}

$emsdkBat = Join-Path $emsdk 'emsdk.bat'
$emsdkEnvBat = Join-Path $emsdk 'emsdk_env.bat'
if (-not (Test-Path $emsdkBat)) { throw "emsdk.bat was not found at $emsdkBat" }
if (-not (Test-Path $emsdkEnvBat)) { throw "emsdk_env.bat was not found at $emsdkEnvBat" }

if (-not $SkipEmsdkUpdate) {
    Write-Step 'Installing latest Emscripten toolchain'
    & $emsdkBat install latest
    if ($LASTEXITCODE -ne 0) { throw 'emsdk install latest failed.' }

    Write-Step 'Activating latest Emscripten toolchain'
    & $emsdkBat activate latest
    if ($LASTEXITCODE -ne 0) { throw 'emsdk activate latest failed.' }
}

Write-Step "Using Emscripten SDK at $emsdk"

# Important on Windows: emsdk_env.bat modifies the environment of cmd.exe, not the
# parent PowerShell process. Run verification, npm install and Vite in that same cmd.
$commands = New-Object System.Collections.Generic.List[string]
$commands.Add('call "' + $emsdkEnvBat + '" >nul')
$commands.Add('where emcc')
$commands.Add('emcc --version')
$commands.Add('cd /d "' + $webRoot + '"')

if (-not $SkipNpmInstall) {
    if (-not (Test-Path (Join-Path $webRoot 'node_modules'))) {
        $commands.Add('echo ==^> Installing npm dependencies')
        $commands.Add('npm install')
    } else {
        Write-Step 'node_modules already exists; skipping npm install'
    }
}

$commands.Add('echo ==^> Starting FMiniMug1 development server')
$commands.Add('npm run dev')
$cmdLine = $commands -join ' && '

Write-Host 'The WASM workstation will be built automatically before Vite starts.' -ForegroundColor DarkGray
& $env:ComSpec /d /s /c $cmdLine
if ($LASTEXITCODE -ne 0) {
    throw "FMiniMug1 development startup failed with exit code $LASTEXITCODE."
}
