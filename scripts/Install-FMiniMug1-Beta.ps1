param(
  [string]$InstallDir = "$env:LOCALAPPDATA\FMiniMug1",
  [switch]$NoDesktopShortcut,
  [switch]$NoStartMenuShortcut,
  [switch]$NoLaunch,
  [switch]$SkipPackageVerification
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Text) { Write-Host "==> $Text" -ForegroundColor Cyan }

function Test-BetaPackage([string]$Root) {
  $sumFile = Join-Path $Root 'SHA256SUMS'
  if (-not (Test-Path $sumFile)) {
    Write-Warning 'SHA256SUMS is missing; package integrity cannot be verified.'
    return
  }

  Write-Step 'Verifying beta package SHA256 checksums'
  $failed = @()
  foreach ($line in Get-Content $sumFile) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line -notmatch '^([0-9a-fA-F]{64})\s+\*?(.+)$') {
      throw "Invalid checksum line in SHA256SUMS: $line"
    }
    $expected = $matches[1].ToLowerInvariant()
    $relative = $matches[2].Trim().Replace('/', [IO.Path]::DirectorySeparatorChar)
    $path = Join-Path $Root $relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
      $failed += "$relative (missing)"
      continue
    }
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { $failed += "$relative (checksum mismatch)" }
  }
  if ($failed.Count -gt 0) {
    throw "Beta package verification failed:`n - $($failed -join "`n - ")"
  }
  Write-Host 'Package checksums OK.' -ForegroundColor Green
}

function Stop-InstalledServer([string]$Root) {
  $pidFile = Join-Path $Root 'server.pid'
  if (-not (Test-Path $pidFile)) { return }
  $serverPid = 0
  if ([int]::TryParse((Get-Content $pidFile -Raw).Trim(), [ref]$serverPid)) {
    $p = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -match 'powershell|pwsh') {
      Write-Step "Stopping previous FMiniMug1 server (PID $serverPid)"
      Stop-Process -Id $serverPid -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 250
    }
  }
  Remove-Item -Force -ErrorAction SilentlyContinue $pidFile
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$appSource = Join-Path $scriptRoot 'app'
foreach ($required in @('index.html','dsp\fminimug1.wasm','dsp\fminimug1-worklet.js')) {
  if (-not (Test-Path (Join-Path $appSource $required) -PathType Leaf)) {
    throw "Beta package is incomplete: app\$required was not found next to this installer."
  }
}
if (-not $SkipPackageVerification) { Test-BetaPackage $scriptRoot }

Write-Step "Installing FMiniMug1 beta to $InstallDir"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Stop-InstalledServer $InstallDir

$appDir = Join-Path $InstallDir 'app'
if (Test-Path $appDir) { Remove-Item -Recurse -Force $appDir }
Copy-Item -Recurse -Force $appSource $appDir

$launcher = Join-Path $InstallDir 'Start-FMiniMug1.ps1'
$launcherContent = @'
param(
  [int]$Port = 8765,
  [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$appDir = Join-Path $PSScriptRoot 'app'
$pidFile = Join-Path $PSScriptRoot 'server.pid'
if (-not (Test-Path (Join-Path $appDir 'index.html') -PathType Leaf)) { throw 'FMiniMug1 app files are missing.' }

function Open-App([string]$Url) {
  if (-not $NoBrowser) { Start-Process $Url }
}

function Test-Port([int]$TestPort) {
  $client = [Net.Sockets.TcpClient]::new()
  try {
    $iar = $client.BeginConnect([Net.IPAddress]::Loopback,$TestPort,$null,$null)
    if (-not $iar.AsyncWaitHandle.WaitOne(180)) { return $false }
    $client.EndConnect($iar)
    return $client.Connected
  } catch { return $false } finally { $client.Dispose() }
}

$url = "http://127.0.0.1:$Port/"
if (Test-Port $Port) {
  Open-App $url
  exit 0
}

$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8';
  '.css'='text/css; charset=utf-8'; '.wasm'='application/wasm'; '.json'='application/json; charset=utf-8';
  '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.ico'='image/x-icon';
  '.woff'='font/woff'; '.woff2'='font/woff2'
}

$root = [IO.Path]::GetFullPath($appDir).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$Port)
try {
  $listener.Start()
  Set-Content -LiteralPath $pidFile -Value $PID -Encoding ASCII
  Open-App $url

  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 5000
      $client.SendTimeout = 5000
      $stream = $client.GetStream()
      $reader = [IO.StreamReader]::new($stream,[Text.Encoding]::ASCII,$false,1024,$true)
      $request = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($request)) { continue }
      while ($true) { $line=$reader.ReadLine(); if ([string]::IsNullOrEmpty($line)) { break } }

      $parts = $request.Split(' ')
      $method = if ($parts.Length -gt 0) { $parts[0].ToUpperInvariant() } else { '' }
      $target = if ($parts.Length -gt 1) { $parts[1] } else { '/' }
      if ($method -ne 'GET' -and $method -ne 'HEAD') {
        $body=[Text.Encoding]::UTF8.GetBytes('Method not allowed')
        $head="HTTP/1.1 405 Method Not Allowed`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
        $hb=[Text.Encoding]::ASCII.GetBytes($head); $stream.Write($hb,0,$hb.Length); if($method-ne'HEAD'){$stream.Write($body,0,$body.Length)}
        continue
      }

      $rawPath = ($target -split '\?',2)[0]
      try { $decoded=[Uri]::UnescapeDataString($rawPath) } catch { $decoded='/' }
      if ($decoded -eq '/') { $decoded='/index.html' }
      $relative = $decoded.TrimStart('/').Replace('/',[IO.Path]::DirectorySeparatorChar)
      $candidate = [IO.Path]::GetFullPath((Join-Path $appDir $relative))
      if (-not $candidate.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)) {
        $body=[Text.Encoding]::UTF8.GetBytes('Forbidden')
        $head="HTTP/1.1 403 Forbidden`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
        $hb=[Text.Encoding]::ASCII.GetBytes($head); $stream.Write($hb,0,$hb.Length); if($method-ne'HEAD'){$stream.Write($body,0,$body.Length)}
        continue
      }
      if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { $candidate=Join-Path $appDir 'index.html' }

      $bytes=[IO.File]::ReadAllBytes($candidate)
      $ext=[IO.Path]::GetExtension($candidate).ToLowerInvariant()
      $contentType=if($mime.ContainsKey($ext)){$mime[$ext]}else{'application/octet-stream'}
      $header="HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nCross-Origin-Opener-Policy: same-origin`r`nCross-Origin-Embedder-Policy: require-corp`r`nConnection: close`r`n`r`n"
      $headerBytes=[Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes,0,$headerBytes.Length)
      if($method-ne'HEAD'){$stream.Write($bytes,0,$bytes.Length)}
    } catch {
      # Malformed/aborted browser requests must not stop the local app server.
    } finally {
      $client.Dispose()
    }
  }
} finally {
  $listener.Stop()
  Remove-Item -Force -ErrorAction SilentlyContinue $pidFile
}
'@
Set-Content -Path $launcher -Value $launcherContent -Encoding UTF8

$stopper = Join-Path $InstallDir 'Stop-FMiniMug1.ps1'
$stopContent = @'
$pidFile=Join-Path $PSScriptRoot 'server.pid'
if(Test-Path $pidFile){
  $id=0
  if([int]::TryParse((Get-Content $pidFile -Raw).Trim(),[ref]$id)){
    $p=Get-Process -Id $id -ErrorAction SilentlyContinue
    if($p -and $p.ProcessName -match 'powershell|pwsh'){Stop-Process -Id $id -Force -ErrorAction SilentlyContinue}
  }
  Remove-Item -Force -ErrorAction SilentlyContinue $pidFile
}
'@
Set-Content -Path $stopper -Value $stopContent -Encoding UTF8

$uninstaller = Join-Path $InstallDir 'Uninstall-FMiniMug1.ps1'
$uninstallContent = @'
$ErrorActionPreference='Stop'
$pidFile=Join-Path $PSScriptRoot 'server.pid'
if(Test-Path $pidFile){
  $id=0
  if([int]::TryParse((Get-Content $pidFile -Raw).Trim(),[ref]$id)){
    $p=Get-Process -Id $id -ErrorAction SilentlyContinue
    if($p -and $p.ProcessName -match 'powershell|pwsh'){Stop-Process -Id $id -Force -ErrorAction SilentlyContinue}
  }
}
$desktop=[Environment]::GetFolderPath('Desktop')
$programs=Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'
Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $desktop 'FMiniMug1 Beta.lnk')
Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $programs 'FMiniMug1 Beta.lnk')
Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $programs 'Uninstall FMiniMug1 Beta.lnk')
$root=$PSScriptRoot
Write-Host "Removing $root"
Start-Process powershell.exe -ArgumentList '-NoProfile','-Command',"Start-Sleep -Milliseconds 700; Remove-Item -Recurse -Force -LiteralPath '$($root.Replace("'","''"))'" -WindowStyle Hidden
'@
Set-Content -Path $uninstaller -Value $uninstallContent -Encoding UTF8

function New-Shortcut([string]$Path,[string]$Target,[string]$Arguments,[string]$Description) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $Target
  $shortcut.Arguments = $Arguments
  $shortcut.WorkingDirectory = $InstallDir
  $shortcut.Description = $Description
  $shortcut.Save()
}

$launcherArgs="-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcher`""
if (-not $NoDesktopShortcut) {
  $desktop=[Environment]::GetFolderPath('Desktop')
  New-Shortcut (Join-Path $desktop 'FMiniMug1 Beta.lnk') 'powershell.exe' $launcherArgs 'FMiniMug1 Workstation Beta'
}
if (-not $NoStartMenuShortcut) {
  $programs=Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'
  New-Item -ItemType Directory -Force -Path $programs | Out-Null
  New-Shortcut (Join-Path $programs 'FMiniMug1 Beta.lnk') 'powershell.exe' $launcherArgs 'FMiniMug1 Workstation Beta'
  $uninstallArgs="-NoProfile -ExecutionPolicy Bypass -File `"$uninstaller`""
  New-Shortcut (Join-Path $programs 'Uninstall FMiniMug1 Beta.lnk') 'powershell.exe' $uninstallArgs 'Uninstall FMiniMug1 Workstation Beta'
}

foreach($name in @('VERSION.txt','manifest.json')){
  $src=Join-Path $scriptRoot $name
  if(Test-Path $src){Copy-Item -Force $src (Join-Path $InstallDir $name)}
}

Write-Host ''
Write-Host 'FMiniMug1 Beta installed successfully.' -ForegroundColor Green
Write-Host "Install directory: $InstallDir"
Write-Host 'Runtime dependency: Windows PowerShell only (no Node.js/Python required).' -ForegroundColor Green
Write-Host 'No firmware was flashed to an FM-1 device.' -ForegroundColor Yellow
Write-Host ''

if (-not $NoLaunch) {
  Start-Process powershell.exe -ArgumentList '-NoProfile','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',"`"$launcher`""
}
