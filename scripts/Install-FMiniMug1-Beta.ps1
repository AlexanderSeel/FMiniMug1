param(
  [string]$InstallDir = "$env:LOCALAPPDATA\FMiniMug1",
  [switch]$NoDesktopShortcut,
  [switch]$NoStartMenuShortcut
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Text) { Write-Host "==> $Text" -ForegroundColor Cyan }
function Find-Command([string[]]$Names) {
  foreach ($name in $Names) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  return $null
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$appSource = Join-Path $scriptRoot 'app'
if (-not (Test-Path (Join-Path $appSource 'index.html'))) {
  throw "Beta package is incomplete: app\index.html was not found next to this installer."
}

Write-Step "Installing FMiniMug1 beta to $InstallDir"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$appDir = Join-Path $InstallDir 'app'
if (Test-Path $appDir) { Remove-Item -Recurse -Force $appDir }
Copy-Item -Recurse -Force $appSource $appDir

$launcher = Join-Path $InstallDir 'Start-FMiniMug1.ps1'
$launcherContent = @'
param([int]$Port = 8765)
$ErrorActionPreference = 'Stop'
$appDir = Join-Path $PSScriptRoot 'app'
if (-not (Test-Path (Join-Path $appDir 'index.html'))) { throw "FMiniMug1 app files are missing." }

function Find-Cmd([string[]]$Names) {
  foreach ($n in $Names) {
    $c = Get-Command $n -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
  }
  return $null
}

$url = "http://127.0.0.1:$Port/"
$node = Find-Cmd @('node.exe','node')
$python = Find-Cmd @('python.exe','python','py.exe','py')

if ($node) {
  $server = Join-Path $PSScriptRoot 'serve.mjs'
  if (-not (Test-Path $server)) { throw "serve.mjs is missing." }
  Start-Process $url
  & $node $server $appDir $Port
  exit $LASTEXITCODE
}

if ($python) {
  Start-Process $url
  Push-Location $appDir
  try {
    if ((Split-Path -Leaf $python) -like 'py*') { & $python -3 -m http.server $Port --bind 127.0.0.1 }
    else { & $python -m http.server $Port --bind 127.0.0.1 }
  } finally { Pop-Location }
  exit $LASTEXITCODE
}

throw "FMiniMug1 Beta needs Node.js or Python to run the local server. Install Node.js LTS and start again."
'@
Set-Content -Path $launcher -Value $launcherContent -Encoding UTF8

$serverPath = Join-Path $InstallDir 'serve.mjs'
$serverContent = @'
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(process.argv[2]||'.');
const port=Number(process.argv[3]||8765);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};
const safe=p=>{const full=path.resolve(root,'.'+p);return full.startsWith(root)?full:null};
const server=http.createServer((req,res)=>{
  const raw=(req.url||'/').split('?')[0];
  let file=safe(raw==='/'?'/index.html':decodeURIComponent(raw));
  if(!file){res.writeHead(403);res.end('Forbidden');return;}
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(data);
  });
});
server.listen(port,'127.0.0.1',()=>console.log(`FMiniMug1 Beta running at http://127.0.0.1:${port}/`));
'@
Set-Content -Path $serverPath -Value $serverContent -Encoding UTF8

$uninstaller = Join-Path $InstallDir 'Uninstall-FMiniMug1.ps1'
$uninstallContent = @'
$ErrorActionPreference='Stop'
$desktop=[Environment]::GetFolderPath('Desktop')
$start=[Environment]::GetFolderPath('StartMenu')
Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $desktop 'FMiniMug1 Beta.lnk')
Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $start 'Programs\FMiniMug1 Beta.lnk')
$root=$PSScriptRoot
Write-Host "Removing $root"
Start-Process powershell.exe -ArgumentList '-NoProfile','-Command',"Start-Sleep -Milliseconds 500; Remove-Item -Recurse -Force '$root'" -WindowStyle Hidden
'@
Set-Content -Path $uninstaller -Value $uninstallContent -Encoding UTF8

function New-Shortcut([string]$Path) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = 'powershell.exe'
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`""
  $shortcut.WorkingDirectory = $InstallDir
  $shortcut.Description = 'FMiniMug1 Workstation Beta'
  $shortcut.Save()
}

if (-not $NoDesktopShortcut) {
  $desktop = [Environment]::GetFolderPath('Desktop')
  New-Shortcut (Join-Path $desktop 'FMiniMug1 Beta.lnk')
}
if (-not $NoStartMenuShortcut) {
  $programs = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'
  New-Item -ItemType Directory -Force -Path $programs | Out-Null
  New-Shortcut (Join-Path $programs 'FMiniMug1 Beta.lnk')
}

$versionFile = Join-Path $scriptRoot 'VERSION.txt'
if (Test-Path $versionFile) { Copy-Item -Force $versionFile (Join-Path $InstallDir 'VERSION.txt') }

Write-Host ''
Write-Host 'FMiniMug1 Beta installed successfully.' -ForegroundColor Green
Write-Host "Launcher: $launcher"
Write-Host 'No firmware was flashed to an FM-1 device.' -ForegroundColor Yellow
Write-Host ''
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $launcher
