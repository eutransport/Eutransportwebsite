# ============================================================
# E&U Transport — 1-click installer (Windows / PowerShell)
# ============================================================
[CmdletBinding()]
param(
    [string]$ProxyNetwork = $env:PROXY_NETWORK,
    [string]$StackName    = $env:STACK_NAME
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ProxyNetwork)) { $ProxyNetwork = 'tms_external' }
if ([string]::IsNullOrWhiteSpace($StackName))    { $StackName    = 'eutransport' }

function Info($msg) { Write-Host "[i] $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "[+] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[x] $msg" -ForegroundColor Red; exit 1 }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# .env inlezen (optioneel, simpel key=value formaat)
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#=][^=]*)=(.*)$') {
            [Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim())
        }
    }
    Info "Configuratie geladen uit .env"
    if ($env:PROXY_NETWORK) { $ProxyNetwork = $env:PROXY_NETWORK }
    if ($env:STACK_NAME)    { $StackName    = $env:STACK_NAME }
}

Write-Host ""
Info "=== E&U Transport installer ==="
Info "Werkmap:        $ScriptDir"
Info "Docker-netwerk: $ProxyNetwork"
Info "Stack naam:     $StackName"
Write-Host ""

# ---------- 1. Vereisten ----------
Info "Stap 1/5: vereisten controleren..."
try   { docker --version | Out-Null; Ok "Docker aanwezig" }
catch { Fail "Docker is niet geïnstalleerd of niet bereikbaar." }

$compose = $null
try { docker compose version | Out-Null; $compose = 'docker compose' } catch {}
if (-not $compose) {
    try { docker-compose --version | Out-Null; $compose = 'docker-compose' } catch {}
}
if (-not $compose) { Fail "Docker Compose is niet geïnstalleerd." }
Ok "Compose aanwezig ($compose)"

try   { docker info | Out-Null; Ok "Docker daemon draait" }
catch { Fail "Docker daemon draait niet." }
Write-Host ""

# ---------- 2. Proxy-netwerk ----------
Info "Stap 2/5: Docker-netwerk '$ProxyNetwork' controleren..."
$networks = docker network ls --format '{{.Name}}'
if ($networks -contains $ProxyNetwork) {
    Ok "Netwerk '$ProxyNetwork' bestaat al"
} else {
    Warn "Netwerk '$ProxyNetwork' bestaat niet."
    $answer = Read-Host "Wil je het nu aanmaken? (y/n)"
    if ($answer -match '^y') {
        docker network create $ProxyNetwork | Out-Null
        Ok "Netwerk aangemaakt"
        Warn "Zorg dat je Nginx Proxy Manager container ook aan '$ProxyNetwork' hangt!"
    } else {
        Fail "Kan niet doorgaan zonder proxy-netwerk. Pas PROXY_NETWORK aan in .env."
    }
}
Write-Host ""

# ---------- 3. Bestanden ----------
Info "Stap 3/5: projectbestanden controleren..."
$required = @('Dockerfile','docker-compose.yml','nginx.conf','index.html')
foreach ($f in $required) {
    if (-not (Test-Path $f)) { Fail "Vereist bestand ontbreekt: $f" }
}
Ok "Alle projectbestanden aanwezig"
Write-Host ""

# ---------- 4. Build + start ----------
Info "Stap 4/5: container bouwen en starten..."
$env:PROXY_NETWORK = $ProxyNetwork
Invoke-Expression "$compose -p $StackName up -d --build"
if ($LASTEXITCODE -ne 0) { Fail "Compose up faalde." }
Ok "Stack '$StackName' draait"
Write-Host ""

# ---------- 5. Verificatie ----------
Info "Stap 5/5: verificatie..."
Start-Sleep -Seconds 3
$running = docker ps --format '{{.Names}}'
if ($running -contains 'eutransport-web') {
    Ok "Container 'eutransport-web' is actief"
} else {
    Fail "Container niet actief. Bekijk logs met: $compose -p $StackName logs"
}
Write-Host ""

Write-Host "======================================================" -ForegroundColor Green
Write-Host "  Installatie klaar!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host @"

Volgende stappen (in Nginx Proxy Manager):

  1. Open NPM in je browser (meestal http://<server-ip>:81)
  2. Hosts -> Proxy Hosts -> Add Proxy Host
        Domain Names:       eutransport.nl, www.eutransport.nl
        Scheme:             http
        Forward Hostname:   eutransport-web
        Forward Port:       80
        Block Common Exploits: aan
        Cache Assets:       aan
  3. Tab SSL:
        Request a new SSL Certificate (Let's Encrypt)
        Force SSL:          aan
        HTTP/2 Support:     aan
  4. Save.

Nuttige commando's:
  Logs:      $compose -p $StackName logs -f
  Herstart:  $compose -p $StackName restart
  Stoppen:   $compose -p $StackName down
  Update:    git pull; .\install.ps1
"@
