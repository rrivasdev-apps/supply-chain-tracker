# IA.md — Retrospectiva del uso de Inteligencia Artificial

## 2.1 IAs usadas

| IA | Uso principal |
|---|---|
| Claude (Anthropic) — claude-sonnet-4-6 | Desarrollo completo: smart contract, tests, frontend, integración Web3, documentación, arquitectura, MCP server |

---

## 2.2 Tiempo consumido aproximado

| Componente | Tiempo estimado |
|---|---|
| Smart Contract (`SupplyChain.sol`) | ~2 horas |
| Tests Foundry (`SupplyChain.t.sol`) | ~1.5 horas |
| Script de deploy (`Deploy.s.sol`) | ~15 minutos |
| Frontend Next.js — estructura y rutas | ~3 horas |
| Integración Web3 — contexto, hooks, servicios | ~2 horas |
| UI por roles — dashboard, tokens, transferencias | ~4 horas |
| Panel de administración | ~1.5 horas |
| Certificación de lotes | ~1 hora |
| Sidebar, diseño visual y KPIs | ~2 horas |
| MCP Server (mcp-foundry) | ~2 horas |
| Documentación (ModeloTeorico, README, docs/) | ~1.5 horas |
| **Total estimado** | **~21 horas** |

---

## 2.3 Errores más habituales analizando los chats

### Fase 1 — Smart Contract

1. **Structs con mappings no retornables**: Solidity no permite retornar structs con mappings internos como memory. Solución: descomponer en campos individuales en `getToken()`.

2. **vm.expectEmit flags incorrectos**: Los tests de eventos de Foundry requieren que los flags (indexed vs no-indexed) coincidan exactamente con la definición del evento. Solución: re-declarar eventos en el contrato de test.

3. **Índices de tokens no actualizados en aceptación**: Al aceptar una transferencia, hay que registrar el tokenId en el índice del receptor para que `getUserTokens` funcione correctamente.

4. **Validación de balance del parentId**: Al crear un producto terminado, es necesario verificar que la Factory tenga balance de la bobina (parentId) antes de permitir la creación.

5. **Comparación de strings en Solidity**: No existe operador `==` para strings. Se usa `keccak256(bytes(a)) == keccak256(bytes(b))`.

### Fase 2 — Frontend

6. **Race condition en carga de KPIs**: El flag `loading` del dashboard no incluía `allTokensLoading`, causando que los KPIs del certificador se renderizaran vacíos antes de que los datos estuvieran disponibles. Solución: combinar todos los flags de carga.

7. **Redenciones parciales no reflejadas en contador**: `redeemProduct` solo pone `burned = true` cuando el balance llega a cero — las redenciones parciales emiten `ProductRedeemed` pero no marcan el token. El contador de "Redimidos" en el dashboard no funcionaba con `tokens.filter(t => t.burned)`. Solución: consultar eventos `ProductRedeemed(null, account)` directamente en la blockchain con `contract.queryFilter`.

8. **Sidebar fija superpuesta al contenido**: Usar `position: fixed` en el sidebar requiere un div espaciador (`w-56 shrink-0`) para que el contenido no quede oculto debajo del menú.

9. **CSS custom properties globales**: Cambiar el color primario de botones y badges en toda la app requería modificar `--primary` en `globals.css`, no componente a componente.

---

## 2.4 Ficheros de chat de la IA

Los chats de desarrollo están disponibles en la sesión de Claude Code utilizada durante el proyecto.
El asistente utilizado fue **Claude Sonnet 4.6** de Anthropic, accedido mediante Claude Code CLI.

### Fase 1 — Smart Contract (Claude.ai)
- Análisis de requerimientos del README base
- Diseño del caso de uso específico (fundición → bobinas → láminas → puertas)
- Implementación de `SupplyChain.sol` con auto-mint, escrow implícito y burn
- Tests completos con Foundry (56 tests, 0 fallos)
- Decisiones de arquitectura documentadas en `README_project.md`

### Fase 2 — Frontend (Claude Code)
- Scaffolding Next.js 16 App Router con TypeScript y Tailwind CSS
- Implementación de `Web3Context` con gestión de wallet, rol y estado de usuario
- `Web3Service.ts`: 20+ funciones ethers.js v6 para interacción con el contrato
- Hooks de lectura: `useTokens`, `useAllTokens`, `useTransfers`, `useAllUsers`, `useAdminStats`
- Dashboards adaptativos por rol con KPIs en tiempo real
- Flujos completos: creación de bobinas, certificación, fabricación, transferencias, redención
- Panel de administración con gestión de usuarios y filtrado por rol
- Diseño visual: sidebar fija con tema oscuro, KPIs con gradientes, tipografía coherente

### Fase 3 — MCP Server (Claude Code)
- Diseño e implementación del servidor MCP `mcp-foundry`
- Herramientas expuestas: `forge_build`, `forge_test`, `forge_deploy`, `anvil_start`, `cast_call`, `cast_send`
- Integración con Claude Desktop para control de Foundry desde lenguaje natural
