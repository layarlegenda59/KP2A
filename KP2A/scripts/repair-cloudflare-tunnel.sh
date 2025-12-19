#!/usr/bin/env bash

# Repair and Diagnose Cloudflare Tunnel Error 1033 for sidarsih.site
# This script performs checks and suggests fixes for DNS SRV resolution failures,
# verifies local services, and attempts to repair tunnel/DNS routing.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
CLOUDFLARED_BIN="$PROJECT_DIR/cloudflared"
CONFIG_FILE="$PROJECT_DIR/cloudflared-config-proxmox.yml"
TUNNEL_NAME="sidarsih"
TUNNEL_ID="e4cee886-4f46-4676-a344-7ea2cb86e4eb"
DOMAIN="sidarsih.site"

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info(){ echo -e "${BLUE}[INFO]${NC} $*"; }
ok(){ echo -e "${GREEN}[OK]${NC} $*"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $*"; }
err(){ echo -e "${RED}[ERROR]${NC} $*"; }

require_cmd(){ command -v "$1" >/dev/null 2>&1 || { err "Missing command: $1"; return 1; } }

check_dns_srv(){
  info "Checking SRV for _auto-v2-origintunneld._tcp.argotunnel.com (local resolver)"
  if nslookup -type=SRV _auto-v2-origintunneld._tcp.argotunnel.com >/dev/null 2>&1; then
    ok "Local resolver returns SRV records"
  else
    warn "Local resolver failed SRV lookup (NXDOMAIN or failure)"
  fi
  if command -v dig >/dev/null 2>&1; then
    info "Checking SRV via 1.1.1.1"
    if dig srv _auto-v2-origintunneld._tcp.argotunnel.com @1.1.1.1 +short >/dev/null 2>&1; then
      ok "1.1.1.1 responds to SRV"
    else
      warn "1.1.1.1 SRV query timed out or failed (network or firewall)"
    fi
  fi
  echo
  warn "If SRV fails, set system resolver to 1.1.1.1 or 8.8.8.8 and restart cloudflared."
  warn "You can temporarily export GODEBUG=netdns=go before starting cloudflared (already used)."
}

check_local_services(){
  info "Checking local origin services"
  printf "  Frontend (http://localhost:8080): "
  curl -s -I http://localhost:8080 | grep -q "200" && ok "200" || warn "not responding"
  printf "  Backend  (http://localhost:3001): "
  curl -s -I http://localhost:3001 | grep -q "HTTP" && ok "HTTP" || warn "not responding"
}

validate_config(){
  info "Validating cloudflared configuration: $CONFIG_FILE"
  if [ ! -f "$CONFIG_FILE" ]; then err "Config not found: $CONFIG_FILE"; return 1; fi
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import yaml,sys
try:
  print('YAML OK') if yaml.safe_load(open(sys.argv[1])) else print('YAML OK')
except Exception as e:
  print('YAML ERROR:', e); sys.exit(1)
PY
    [ $? -eq 0 ] || { err "Invalid YAML in config"; return 1; }
  fi
  ok "Config validation passed"
}

check_credentials(){
  local cred="$HOME/.cloudflared/${TUNNEL_ID}.json"
  info "Checking credentials: $cred"
  if [ ! -f "$cred" ]; then err "Credentials missing: $cred"; return 1; fi
  if command -v jq >/dev/null 2>&1; then
    local tid=$(jq -r '.TunnelID // empty' "$cred")
    [ "$tid" = "$TUNNEL_ID" ] && ok "Credentials TunnelID matched" || warn "TunnelID mismatch: $tid"
  fi
}

ensure_dns_route(){
  info "Ensuring Cloudflare DNS route exists for $DOMAIN"
  if [ -x "$CLOUDFLARED_BIN" ]; then
    "$CLOUDFLARED_BIN" tunnel route dns "$TUNNEL_NAME" "$DOMAIN" >/dev/null 2>&1 || warn "Route dns command failed (requires Cloudflare API access)"
  else
    warn "cloudflared binary not found at $CLOUDFLARED_BIN; skipping route dns"
  fi
}

restart_tunnel(){
  info "Restarting tunnel via start-tunnel.sh"
  export GODEBUG=netdns=go
  bash "$PROJECT_DIR/start-tunnel.sh" restart || warn "Tunnel restart command failed"
}

show_tunnel_status(){
  info "Tunnel status"
  if [ -x "$CLOUDFLARED_BIN" ]; then
    "$CLOUDFLARED_BIN" tunnel info "$TUNNEL_NAME" || true
  fi
  if [ -f "$PROJECT_DIR/tunnel.log" ]; then
    info "Recent tunnel logs:"; tail -n 50 "$PROJECT_DIR/tunnel.log" || true
  fi
}

main(){
  info "Cloudflare Tunnel 1033 Repair / Diagnostic"
  require_cmd nslookup || true
  validate_config || true
  check_credentials || true
  check_dns_srv
  check_local_services
  ensure_dns_route
  restart_tunnel
  show_tunnel_status
  echo
  info "If SRV lookup continues to fail, update system DNS resolver to 1.1.1.1 and retry."
  info "Refer to docs/CLOUDFLARE_1033_RESOLUTION.md for detailed steps."
}

main "$@"