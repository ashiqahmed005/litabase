#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# dev.sh — start Litabase for local development
#
# Docker containers:
#   • postgres    → app database          (localhost:5432)
#   • example-db  → e-commerce demo DB   (localhost:5433)
#
# Native processes:
#   • backend     → Node/Express          (http://localhost:3000)
#   • frontend    → Vite dev server       (http://localhost:5173)
#                   (proxies /api → :3000, no CORS config needed)
#
# Usage:
#   chmod +x dev.sh
#   ./dev.sh
#
# Quit:
#   Ctrl+C        stop Node processes (Docker containers keep running)
#   ./dev.sh stop also stop all Docker containers
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
COMPOSE="docker compose -f $ROOT/docker-compose.yml -f $ROOT/docker-compose.dev.yml"

# ── Colour helpers ────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[dev]${RESET} $*"; }
success() { echo -e "${GREEN}[dev]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[dev]${RESET} $*"; }
error()   { echo -e "${RED}[dev]${RESET} $*" >&2; }

# ── Stop mode ────────────────────────────────────────────────
if [ "${1:-}" = "stop" ]; then
  info "Stopping Docker containers…"
  $COMPOSE stop postgres example-db 2>/dev/null || true
  success "Done"
  exit 0
fi

# ── Preflight checks ─────────────────────────────────────────
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    error "Required command not found: $1"
    exit 1
  fi
}
check_cmd node
check_cmd npm
check_cmd docker

info "Node   $(node --version)"
info "npm    $(npm --version)"
info "Docker $(docker --version | head -1)"

if ! docker info &>/dev/null; then
  error "Docker daemon is not running. Please start Docker Desktop and try again."
  exit 1
fi

# ── .env setup ───────────────────────────────────────────────
if [ ! -f "$BACKEND/.env" ]; then
  if [ -f "$BACKEND/.env.example" ]; then
    warn ".env not found — copying .env.example → backend/.env"
    cp "$BACKEND/.env.example" "$BACKEND/.env"
    warn "Edit backend/.env with your real values before connecting to a live database."
  else
    error "backend/.env is missing and no .env.example found. Create it before running."
    exit 1
  fi
fi

# Ensure POSTGRES_PASSWORD is exported for docker-compose variable substitution
if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  export POSTGRES_PASSWORD="devpassword"
  warn "POSTGRES_PASSWORD not set — using default 'devpassword' for local dev"
fi

# ── Start Docker containers ───────────────────────────────────
info "Starting postgres and example-db containers…"
$COMPOSE up -d postgres example-db 2>&1 | grep -v "^#" || true

# ── Wait for postgres ─────────────────────────────────────────
info "Waiting for postgres to be ready…"
TRIES=0
until $COMPOSE exec -T postgres pg_isready -U litabase -d litabase &>/dev/null; do
  TRIES=$((TRIES + 1))
  if [ $TRIES -ge 30 ]; then
    error "postgres did not become ready after 30 seconds."
    error "Run: $COMPOSE logs postgres"
    exit 1
  fi
  sleep 1
done
success "postgres is ready"

# ── Wait for example-db ───────────────────────────────────────
info "Waiting for example-db to be ready…"
TRIES=0
until $COMPOSE exec -T example-db pg_isready -U demo -d shop &>/dev/null; do
  TRIES=$((TRIES + 1))
  if [ $TRIES -ge 30 ]; then
    error "example-db did not become ready after 30 seconds."
    error "Run: $COMPOSE logs example-db"
    exit 1
  fi
  sleep 1
done
success "example-db is ready (e-commerce seed data loaded)"

# ── Install dependencies (only if node_modules is stale) ─────
install_if_needed() {
  local dir="$1"
  local label="$2"
  if [ ! -d "$dir/node_modules" ] || [ "$dir/package.json" -nt "$dir/node_modules" ]; then
    info "Installing $label dependencies…"
    npm install --prefix "$dir" --silent
    success "$label dependencies ready"
  fi
}

install_if_needed "$BACKEND"  "backend"
install_if_needed "$FRONTEND" "frontend"

# ── Cleanup on exit ──────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  info "Shutting down Node processes…"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
  info "Docker containers still running (use './dev.sh stop' to stop them)"
  success "Done. Bye!"
}
trap cleanup INT TERM EXIT

# ── Start backend ─────────────────────────────────────────────
info "Starting backend  → http://localhost:3000"
npm run --prefix "$BACKEND" dev 2>&1 | sed "s/^/${BOLD}[backend]${RESET} /" &
PIDS+=($!)

# Brief pause so the backend can bind before Vite starts
sleep 1

# ── Start frontend ────────────────────────────────────────────
info "Starting frontend → http://localhost:5173"
npm run --prefix "$FRONTEND" dev 2>&1 | sed "s/^/${BOLD}[frontend]${RESET} /" &
PIDS+=($!)

# ── Summary ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${GREEN}✓${RESET} Frontend    ${CYAN}http://localhost:5173${RESET}"
echo -e "  ${GREEN}✓${RESET} Backend     ${CYAN}http://localhost:3000${RESET}"
echo -e "  ${GREEN}✓${RESET} Postgres    ${CYAN}localhost:5432${RESET}  (app DB)"
echo -e "  ${GREEN}✓${RESET} Example DB  ${CYAN}localhost:5433${RESET}  host=localhost port=5433"
echo -e "                            db=shop user=demo pass=demo"
echo -e "  ${YELLOW}i${RESET} API proxy   /api → :3000 (via Vite)"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${BOLD}Ctrl+C${RESET}         stop Node processes"
echo -e "  ${BOLD}./dev.sh stop${RESET}  also stop Docker containers"
echo ""

# ── Wait for either process to exit ──────────────────────────
wait -n 2>/dev/null || wait
