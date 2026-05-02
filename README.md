# Metal Trace

**Trazabilidad blockchain para cadena de suministro industrial**

Sistema descentralizado que registra cada etapa del procesamiento del acero —desde la producción de bobinas en una fundición hasta la entrega y consumo por el cliente final— sobre una blockchain EVM, garantizando inmutabilidad, trazabilidad parental y certificación obligatoria en cada eslabón.

[![Tests](https://img.shields.io/badge/tests-56%20passed-brightgreen)](#tests)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)](sc/src/SupplyChain.sol)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Demo

<!-- Sustituir con el link real una vez grabado -->
> **Video demo:** _pendiente de grabación_ — ver [GuionDemo.md](GuionDemo.md) para el guión completo

---

## Screenshots

<!-- Añadir imágenes en la carpeta screenshots/ -->
| Pantalla | Vista |
|---|---|
| Login / Conexión | `screenshots/01-login.png` |
| Dashboard Fundición | `screenshots/02-dashboard-producer.png` |
| Certificación de lotes | `screenshots/03-certification.png` |
| Fabricación de producto | `screenshots/04-factory.png` |
| Panel Admin (KPIs) | `screenshots/05-admin-kpis.png` |

---

## Cadena de valor

```
Fundición → Certificador → Fábrica → Distribuidor → Cliente
```

Cada actor opera con su propia wallet MetaMask. El contrato valida roles, permisos y la dirección correcta del flujo — no es posible saltarse un eslabón ni transferir en sentido inverso.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Smart contract | Solidity ^0.8.19 |
| Testing y deploy | Foundry (forge, anvil, cast) |
| Frontend | Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui |
| Integración Web3 | ethers.js v6 + MetaMask |
| Red local | Anvil (chainId 31337) |
| Herramientas IA | Claude Code + MCP Foundry Server |

---

## Estructura del proyecto

```
Supply-chain-tracker/
├── sc/                        # Smart contracts (Foundry)
│   ├── src/SupplyChain.sol    # Contrato principal
│   ├── script/Deploy.s.sol   # Script de despliegue
│   └── test/SupplyChain.t.sol # 56 tests unitarios
├── web/                       # Frontend Next.js 16
│   └── src/
│       ├── app/               # Rutas: dashboard, tokens, transfers, admin…
│       ├── components/        # UI por dominio (tokens, transfers, factory…)
│       ├── contexts/          # Web3Context — wallet, rol, contrato
│       ├── hooks/             # Lectura de datos on-chain
│       └── services/          # Web3Service — ethers.js v6
├── mcp-foundry/               # MCP Server — Foundry CLI para Claude
├── docs/
│   ├── diagramas.md           # Diagramas Mermaid de arquitectura
│   └── manual-usuario.md     # Manual de uso por rol
├── screenshots/               # Capturas de pantalla de la DApp
├── ModeloTeorico.md           # Arquitectura técnica completa
├── GuionDemo.md               # Guión del video de demostración
├── IA.md                      # Retrospectiva de uso de IA
├── redeploy.sh                # Script de redespliegue en Anvil
└── LICENSE
```

---

## Instalación y puesta en marcha

### Requisitos

- [Node.js](https://nodejs.org/) >= 18
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `anvil`, `cast`)
- [MetaMask](https://metamask.io/) en el navegador

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPO>
cd Supply-chain-tracker
```

### 2. Smart contract

```bash
cd sc
forge install          # instalar dependencias
forge build            # compilar
forge test             # ejecutar los 56 tests
```

### 3. Levantar la blockchain local

```bash
# En una terminal separada
anvil
```

### 4. Desplegar el contrato

```bash
# Desde la raíz del proyecto
# La primera clave privada de Anvil (Account #0) es el admin
./redeploy.sh 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

El script compila, despliega, exporta el ABI y actualiza `web/.env.local` automáticamente.

### 5. Frontend

```bash
cd web
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

### 6. Configurar MetaMask

1. Añadir red: RPC `http://localhost:8545`, Chain ID `31337`
2. Importar cuentas de Anvil usando sus claves privadas
3. Conectar la wallet de Admin (Account #0) para aprobar usuarios

---

## Tests

```bash
cd sc
forge test -vvv
```

```
Ran 56 tests for test/SupplyChain.t.sol:SupplyChainTest
56 passed | 0 failed | 0 skipped
Finished in 6.36ms
```

Cobertura de tests:

| Módulo | Tests |
|---|---|
| Gestión de usuarios | 9 |
| Índices de usuarios | 3 |
| Creación de tokens | 10 |
| Certificación | 7 |
| Consumo de materia prima | 6 |
| Transferencias | 7 |
| Validaciones y permisos | 7 |
| Casos edge | 5 |
| Eventos | 7 |
| Flujos completos | 3 |

---

## MCP Server — Foundry

El directorio `mcp-foundry/` contiene un servidor MCP que expone las herramientas de Foundry como funciones llamables por Claude:

| Herramienta | Descripción |
|---|---|
| `forge_build` | Compila los contratos |
| `forge_test` | Ejecuta la suite de tests |
| `forge_deploy` | Despliega con un script de Foundry |
| `anvil_start` | Inicia la blockchain local |
| `cast_call` | Llama a una función de lectura |
| `cast_send` | Envía una transacción firmada |

Ver instrucciones de instalación en [mcp-foundry/README.md](mcp-foundry/README.md).

---

## Documentación

| Documento | Contenido |
|---|---|
| [ModeloTeorico.md](ModeloTeorico.md) | Arquitectura completa: roles, estructuras, flujos, eventos, errores |
| [docs/diagramas.md](docs/diagramas.md) | Diagramas Mermaid: ER, secuencias, estados |
| [docs/manual-usuario.md](docs/manual-usuario.md) | Manual de uso por rol |
| [GuionDemo.md](GuionDemo.md) | Guión del video de demostración (11 escenas, ~5 min) |
| [IA.md](IA.md) | Retrospectiva del uso de IA: herramientas, tiempos, errores, sesiones |
| [README_project.md](README_project.md) | Decisiones de diseño del smart contract y log de errores |

---

## Licencia

[MIT](LICENSE) — Rafael Rivas, 2026
