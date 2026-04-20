# IA.md — Retrospectiva del uso de Inteligencia Artificial

## 2.1 IAs usadas

| IA | Uso principal |
|---|---|
| Claude (Anthropic) — claude-sonnet-4-6 | Desarrollo completo: smart contract, tests, documentación, arquitectura |

---

## 2.2 Tiempo consumido aproximado

| Componente | Tiempo estimado |
|---|---|
| Smart Contract (SupplyChain.sol) | ~2 horas |
| Tests Foundry (SupplyChain.t.sol) | ~1.5 horas |
| Script de deploy (Deploy.s.sol) | ~15 minutos |
| Frontend Next.js (Fase 2) | pendiente |
| Integración Web3 (Fase 2) | pendiente |

---

## 2.3 Errores más habituales analizando los chats

1. **Structs con mappings no retornables**: Solidity no permite retornar structs con mappings internos como memory. Solución: descomponer en campos individuales.

2. **vm.expectEmit flags incorrectos**: Los tests de eventos de Foundry requieren que los flags (indexed vs no-indexed) coincidan exactamente con la definición del evento.

3. **Índices de tokens no actualizados en aceptación**: Al aceptar una transferencia, hay que registrar el tokenId en el índice del receptor para que getUserTokens funcione correctamente.

4. **Validación de balance del parentId**: Al crear un producto terminado, es necesario verificar que la Factory tenga balance de la lámina (parentId) antes de permitir la creación.

5. **Comparación de strings en Solidity**: No existe operador == para strings. Se usa keccak256(bytes(a)) == keccak256(bytes(b)).

---

## 2.4 Ficheros de chat de la IA

Los chats de desarrollo están disponibles en la sesión de Claude.ai utilizada durante el proyecto.
El asistente utilizado fue Claude Sonnet 4.6 de Anthropic.

Sesión iniciada: Fase 1 — Smart Contract
Temas cubiertos:
- Análisis de requerimientos del README base
- Diseño del caso de uso específico (fundición → láminas → fábrica de puertas)
- Implementación de SupplyChain.sol con auto-mint y burn
- Tests completos con Foundry
- Decisiones de arquitectura documentadas
