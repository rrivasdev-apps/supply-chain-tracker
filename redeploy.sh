#!/usr/bin/env bash
# redeploy.sh — Compila, despliega SupplyChain en Anvil y actualiza web/.env.local
#
# Uso:
#   ./redeploy.sh <PRIVATE_KEY>
#   ./redeploy.sh            # usa la variable de entorno ANVIL_PRIVATE_KEY si existe

set -euo pipefail

# ── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}▶ $*${NC}"; }
success() { echo -e "${GREEN}✔ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $*${NC}"; }
error()   { echo -e "${RED}✖ $*${NC}" >&2; exit 1; }

# ── Raíz del proyecto ─────────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Clave privada ─────────────────────────────────────────────────────────────
PRIVATE_KEY="${1:-${ANVIL_PRIVATE_KEY:-}}"
if [[ -z "$PRIVATE_KEY" ]]; then
  error "Debes pasar la clave privada como argumento o definir ANVIL_PRIVATE_KEY.\n  Uso: ./redeploy.sh <PRIVATE_KEY>"
fi

# ── Verificar que Anvil está corriendo ────────────────────────────────────────
RPC_URL="${NEXT_PUBLIC_RPC_URL:-http://localhost:8545}"
info "Verificando conexión con Anvil en ${RPC_URL}..."
if ! curl -sf -X POST "$RPC_URL" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    > /dev/null 2>&1; then
  error "Anvil no responde en ${RPC_URL}.\n  Inícialo con: anvil"
fi
success "Anvil activo"

# ── Compilar ──────────────────────────────────────────────────────────────────
info "Compilando contrato..."
cd "$ROOT/sc"
forge build --quiet
success "Compilación exitosa"

# ── Desplegar ─────────────────────────────────────────────────────────────────
info "Desplegando contrato..."
DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast 2>&1)

# Extraer la dirección del log "SupplyChain deployed at: 0x..."
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE 'deployed at:[[:space:]]+0x[0-9a-fA-F]{40}' | grep -oE '0x[0-9a-fA-F]{40}' || true)

if [[ -z "$CONTRACT_ADDRESS" ]]; then
  echo "$DEPLOY_OUTPUT"
  error "No se pudo extraer la dirección del contrato. Revisa la salida anterior."
fi
success "Contrato desplegado en: ${CONTRACT_ADDRESS}"

# ── Exportar ABI al frontend ──────────────────────────────────────────────────
info "Exportando ABI al frontend..."
jq '{abi: .abi}' "$ROOT/sc/out/SupplyChain.sol/SupplyChain.json" \
  > "$ROOT/web/src/contracts/SupplyChain.json"
success "ABI actualizado en web/src/contracts/SupplyChain.json"

# ── Actualizar web/.env.local ─────────────────────────────────────────────────
ENV_FILE="$ROOT/web/.env.local"
info "Actualizando ${ENV_FILE}..."

if [[ -f "$ENV_FILE" ]]; then
  if grep -q "^NEXT_PUBLIC_CONTRACT_ADDRESS=" "$ENV_FILE"; then
    # Reemplazar línea existente (compatible macOS / GNU sed)
    sed -i.bak "s|^NEXT_PUBLIC_CONTRACT_ADDRESS=.*|NEXT_PUBLIC_CONTRACT_ADDRESS=${CONTRACT_ADDRESS}|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
  else
    echo "NEXT_PUBLIC_CONTRACT_ADDRESS=${CONTRACT_ADDRESS}" >> "$ENV_FILE"
  fi
else
  cat > "$ENV_FILE" <<EOF
NEXT_PUBLIC_CONTRACT_ADDRESS=${CONTRACT_ADDRESS}
NEXT_PUBLIC_RPC_URL=${RPC_URL}
EOF
fi
success ".env.local actualizado"

# ── Resumen ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Redespliegue completado${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "  Contrato : ${CYAN}${CONTRACT_ADDRESS}${NC}"
echo -e "  ABI      : web/src/contracts/SupplyChain.json"
echo -e "  Env      : web/.env.local"
echo ""
warn "Reinicia el servidor Next.js para que lea la nueva dirección (Ctrl+C y npm run dev)"
