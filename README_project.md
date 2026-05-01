# README_project.md — Supply Chain Tracker: Trazabilidad de Láminas de Hierro

## Descripción del proyecto

Sistema de trazabilidad blockchain para la cadena de suministro de una fundición de chatarra que produce láminas de hierro. Las láminas son procesadas por una fábrica de puertas de seguridad que fabrica distintos productos, los cuales son distribuidos por retailers y entregados al cliente final.

Toda la cadena queda registrada en blockchain. Cada lámina y cada producto es un token con trazabilidad completa desde la chatarra hasta el cliente.

Cadena de valor:
```
Fundición (chatarra → láminas) → Fábrica (láminas → puertas/rejas/marcos) → Retailer → Consumer
```

---

## Stack tecnológico

- **Smart Contract**: Solidity ^0.8.19
- **Testing y Deploy**: Foundry (forge, anvil, cast)
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + Shadcn UI
- **Integración Web3**: ethers.js + MetaMask
- **Red local**: Anvil (Foundry)

---

## Estructura del proyecto

```
Supply-chain-tracker/
├── sc/
│   ├── src/
│   │   └── SupplyChain.sol      # Contrato principal
│   ├── script/
│   │   └── Deploy.s.sol         # Script de despliegue
│   ├── test/
│   │   └── SupplyChain.t.sol    # Tests unitarios completos
│   └── foundry.toml             # Configuración de Foundry
├── web/                         # Frontend Next.js (Fase 2)
├── README_project.md            # Este archivo
└── IA.md                        # Retrospectiva de uso de IA
```

---

## FASE 1: Smart Contract

### Decisiones de diseño

#### 1. parentId == 0 distingue materias primas de productos terminados

El campo parentId del struct Token es la clave de clasificación:
- parentId == 0 → materia prima (lámina de hierro, creada por Producer)
- parentId > 0  → producto terminado (puerta/reja/marco, creado por Factory)

Esta regla simple permite al frontend separar los dos inventarios en el dashboard de Factory sin lógica adicional en el contrato.

#### 2. Custom errors en lugar de require con strings

Los custom errors (error NotAdmin()) consumen menos gas que require("mensaje") porque no almacenan strings en el bytecode. Cada revert es más barato para el usuario.

#### 3. Auto-mint al crear la lámina

Cuando el Producer llama a createToken, el totalSupply completo se asigna inmediatamente a su balance. No hay paso separado de mint. Crear = tener los tokens disponibles.

#### 4. Burn solo por Consumer

burnToken valida que el llamante tenga rol "consumer". El burn cierra la trazabilidad de forma definitiva — el token queda marcado como burned y no puede transferirse ni usarse más.

#### 5. Escrow implícito en transferencias

Al llamar transfer(), el balance del emisor se descuenta inmediatamente. Si el receptor rechaza, los tokens vuelven. Actúa como escrow on-chain sin contrato adicional.

#### 6. Índices auxiliares _userTokenIds y _userTransferIds

Solidity no permite iterar mappings. Se mantienen arrays internos que el frontend usa para construir los dashboards (getUserTokens, getUserTransfers).

#### 7. Features como JSON string libre

Para láminas: JSON libre (calidad, espesor, certificado ISO, lote, etc.).
Para productos: el frontend ofrece selector predefinido (puerta, reja, marco, panel, otro) que serializa a JSON antes de enviarlo al contrato.

---

## Funciones implementadas

### Gestión de usuarios
| Función | Descripción |
|---|---|
| requestUserRole(role) | Registra usuario con estado Pending |
| changeStatusUser(address, status) | Admin aprueba/rechaza/cancela |
| getUserInfo(address) | Devuelve datos del usuario |
| isAdmin(address) | True si es el admin del contrato |

### Gestión de tokens
| Función | Descripción |
|---|---|
| createToken(name, supply, features, parentId) | Crea lámina o producto con auto-mint |
| burnToken(tokenId) | Consumer redime el producto |
| getToken(tokenId) | Datos públicos del token |
| getTokenBalance(tokenId, address) | Balance de una address en un token |
| getUserTokens(address) | Lista de tokenIds del usuario |

### Gestión de transferencias
| Función | Descripción |
|---|---|
| transfer(to, tokenId, amount) | Inicia transferencia (queda Pending) |
| acceptTransfer(transferId) | Receptor acepta → recibe tokens |
| rejectTransfer(transferId) | Receptor rechaza → tokens vuelven |
| getTransfer(transferId) | Datos de una transferencia |
| getUserTransfers(address) | Lista de transferIds del usuario |

---

## Flujo de roles válido

```
producer → factory → retailer → consumer
```

Cualquier otra dirección es rechazada por InvalidTransferDirection.

---

## Comandos de referencia

```bash
# Instalar Foundry (si no está instalado)
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Desde la carpeta sc/
cd sc

# Instalar dependencias
forge install

# Compilar
forge build

# Ejecutar todos los tests
forge test -vvv

# Test específico
forge test --match-test testCompleteSupplyChainFlow -vvv

# Coverage
forge coverage

# Iniciar blockchain local (terminal separado)
anvil

# Desplegar contrato
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key <TU_PRIVATE_KEY_ANVIL> \
  --broadcast
```

---

## LOG DE ERRORES Y SOLUCIONES

### Error #001
**Fase**: 1 - Smart Contract
**Descripción**: El struct Token no puede retornarse como memory cuando contiene un mapping interno.
**Causa**: Los mappings en Solidity no son copiables a memoria.
**Solución**: getToken() devuelve campos individuales. Se creó getTokenBalance() separado para consultar balances.
**Archivos**: sc/src/SupplyChain.sol

---

### Error #002
**Fase**: 1 - Tests
**Descripción**: Tests de eventos con vm.expectEmit fallaban por flags incorrectos.
**Causa**: Los flags (true/false) deben coincidir exactamente con qué parámetros son indexed en cada evento.
**Solución**: Se revisaron todos los eventos y se ajustaron los flags de vm.expectEmit en cada test.
**Archivos**: sc/test/SupplyChain.t.sol

---

### Error #003
**Fase**: 1 - Smart Contract
**Descripción**: getUserTokens devolvía array incompleto — no incluía tokens recibidos por transferencia.
**Causa**: _userTokenIds solo se actualizaba en createToken, no en acceptTransfer.
**Solución**: Se añadió _addTokenIfNew(msg.sender, tr.tokenId) dentro de acceptTransfer. El helper evita duplicados.
**Archivos**: sc/src/SupplyChain.sol

---

### Error #004
**Fase**: 1 - Tests
**Descripción**: Factory podía crear producto con lámina que no había recibido.
**Causa**: Faltaba validación de balance del parentId en createToken.
**Solución**: Se añadió: if (tokens[parentId].balance[msg.sender] == 0) revert InsufficientBalance();
**Archivos**: sc/src/SupplyChain.sol

---

## Próximos pasos (Fase 2)

- [ ] Configurar proyecto Next.js con TypeScript y Tailwind
- [ ] Implementar Web3Context y hook useWallet
- [ ] Crear Web3Service con ethers.js
- [ ] Exportar ABI desde sc/out/SupplyChain.sol/SupplyChain.json
- [ ] Dashboard Factory con inventario separado (láminas vs productos)
- [ ] Selector de tipo de producto en formulario de creación
- [ ] Panel de Admin para gestión de usuarios
- [ ] Flujo completo de transferencias con aceptación/rechazo
- [ ] Pantalla de trazabilidad del Consumer

---

### Error #005
**Fase**: 1 - Tests  
**Descripción**: `forge build` fallaba con "Member UserRoleRequested not found or not visible after argument-dependent lookup in type(contract SupplyChain)".  
**Causa**: En Solidity los eventos definidos dentro de un contrato no son accesibles como `NombreContrato.NombreEvento` desde un contrato externo. Foundry empareja eventos por su firma (keccak256), no por su origen.  
**Solución**: Re-declarar los eventos del contrato dentro del contrato de test. Foundry los empareja automáticamente por firma al ejecutar `vm.expectEmit`.  
**Archivos**: `sc/test/SupplyChain.t.sol`

---

## Resultado Fase 1 — Smart Contract ✅

```
Ran 56 tests for test/SupplyChain.t.sol:SupplyChainTest
56 passed | 0 failed | 0 skipped
Finished in 6.36ms
```

Todos los tests pasan. El contrato está listo para despliegue en Anvil.
