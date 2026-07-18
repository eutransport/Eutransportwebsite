#!/usr/bin/env bash
# ============================================================
# E&U Transport — 1-click installer
# Bouwt en start de website-stack.
# ============================================================
set -euo pipefail

# ---------- Kleuren voor leesbaarheid ----------
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
info() { echo -e "${BLUE}[i]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }

# ---------- Config (overschrijfbaar via env-vars of .env) ----------
PROXY_NETWORK="${PROXY_NETWORK:-tms_external}"
STACK_NAME="${STACK_NAME:-eutransport}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# .env inlezen als hij bestaat
if [[ -f .env ]]; then
    # shellcheck disable=SC1091
    set -o allexport; source .env; set +o allexport
    info "Configuratie geladen uit .env"
fi

echo
info "=== E&U Transport installer ==="
info "Werkmap:          $SCRIPT_DIR"
info "Docker-netwerk:   $PROXY_NETWORK"
info "Stack naam:       $STACK_NAME"
echo

# ---------- 1. Vereisten checken ----------
info "Stap 1/5: vereisten controleren..."

command -v docker >/dev/null 2>&1 || { err "Docker is niet geïnstalleerd."; exit 1; }
ok "Docker aanwezig ($(docker --version))"

if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    err "Docker Compose is niet geïnstalleerd."
    exit 1
fi
ok "Compose aanwezig ($($COMPOSE version --short 2>/dev/null || echo detected))"

if ! docker info >/dev/null 2>&1; then
    err "Docker daemon draait niet, of huidige gebruiker heeft geen rechten."
    err "Probeer: sudo usermod -aG docker \$USER && newgrp docker"
    exit 1
fi
ok "Docker daemon draait"
echo

# ---------- 2. Proxy-netwerk aanmaken/controleren ----------
info "Stap 2/5: Docker-netwerk '$PROXY_NETWORK' controleren..."
if docker network inspect "$PROXY_NETWORK" >/dev/null 2>&1; then
    ok "Netwerk '$PROXY_NETWORK' bestaat al"
else
    warn "Netwerk '$PROXY_NETWORK' bestaat niet."
    read -r -p "Wil je het nu aanmaken? (y/n): " create_net
    if [[ "$create_net" =~ ^[Yy]$ ]]; then
        docker network create "$PROXY_NETWORK"
        ok "Netwerk '$PROXY_NETWORK' aangemaakt"
        warn "Zorg dat je Nginx Proxy Manager container óók aan dit netwerk hangt!"
    else
        err "Kan niet doorgaan zonder proxy-netwerk. Pas PROXY_NETWORK aan in .env."
        exit 1
    fi
fi
echo

# ---------- 3. Verplichte bestanden controleren ----------
info "Stap 3/5: projectbestanden controleren..."
required_files=(Dockerfile docker-compose.yml nginx.conf index.html)
for f in "${required_files[@]}"; do
    if [[ ! -f "$f" ]]; then
        err "Vereist bestand ontbreekt: $f"
        exit 1
    fi
done
ok "Alle projectbestanden aanwezig"
echo

# ---------- 4. Build + start ----------
info "Stap 4/5: container bouwen en starten..."
PROXY_NETWORK="$PROXY_NETWORK" $COMPOSE -p "$STACK_NAME" up -d --build
ok "Stack '$STACK_NAME' draait"
echo

# ---------- 5. Verificatie ----------
info "Stap 5/5: verificatie..."
sleep 3
if docker ps --format '{{.Names}}' | grep -q "^eutransport-web$"; then
    ok "Container 'eutransport-web' is actief"
else
    err "Container niet actief. Bekijk logs met: $COMPOSE -p $STACK_NAME logs"
    exit 1
fi

# Interne bereikbaarheidstest via Docker
if docker run --rm --network "$PROXY_NETWORK" curlimages/curl:latest \
        -fsS -o /dev/null -w '%{http_code}' http://eutransport-web/ | grep -q '^200$'; then
    ok "Site reageert intern met HTTP 200"
else
    warn "Site is nog niet bereikbaar op http://eutransport-web/ (mogelijk startup)."
fi
echo

# ---------- Vervolgstappen ----------
cat <<EOF
${GREEN}══════════════════════════════════════════════════════════${NC}
${GREEN}  Installatie klaar!${NC}
${GREEN}══════════════════════════════════════════════════════════${NC}

Volgende stappen (in Nginx Proxy Manager):

  1. Open NPM in je browser (meestal http://<server-ip>:81)
  2. Hosts → Proxy Hosts → Add Proxy Host
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
  Logs:       $COMPOSE -p $STACK_NAME logs -f
  Herstart:   $COMPOSE -p $STACK_NAME restart
  Stoppen:    $COMPOSE -p $STACK_NAME down
  Update:     git pull && ./install.sh
EOF
