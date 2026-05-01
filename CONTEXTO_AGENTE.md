# CONTEXTO DEL PROYECTO — Supply Chain Tracker
# Pasa este archivo completo como primer mensaje al agente en Antigravity

## Quién soy y qué estamos construyendo

Soy el desarrollador de un sistema de trazabilidad blockchain para una cadena de suministro industrial. El proyecto ya tiene la Fase 1 (Smart Contract) completa y testeada. Necesito continuar con la Fase 2 (Frontend Next.js).

---

## Stack tecnológico

- Smart Contract: Solidity ^0.8.19
- Testing/Deploy: Foundry (forge, anvil, cast)
- Frontend: Next.js 15 + TypeScript + Tailwind CSS + Shadcn UI
- Web3: ethers.js + MetaMask
- Red local: Anvil

---

## Caso de uso específico

Fundición de chatarra → produce láminas de hierro → tokenizadas en blockchain.
Las láminas van a una fábrica de puertas de seguridad que fabrica múltiples productos.
Los productos van a un retailer/distribuidor y luego al cliente final.

Cadena: Producer → Factory → Retailer → Consumer

---

## Estado actual — Fase 1 COMPLETA ✅ | Fase 2 COMPLETA ✅

Archivos listos en sc/:
- src/SupplyChain.sol — contrato principal
- script/Deploy.s.sol — script de despliegue
- test/SupplyChain.t.sol — 56 tests, 0 fallos
- foundry.toml — configuración

Resultado de forge test: 56 passed | 0 failed

---

## Fase 2 COMPLETA ✅

Frontend Next.js 15 + TypeScript + Tailwind + Shadcn UI construido en web/.

Archivos clave:
- web/src/contracts/config.ts — dirección contrato + chainId Anvil
- web/src/contracts/SupplyChain.json — ABI copiado de sc/out/
- web/src/services/Web3Service.ts — todas las llamadas al contrato (ethers.js)
- web/src/contexts/Web3Context.tsx — provider global: wallet, rol, estado, contrato
- web/src/hooks/useTokens.ts — tokens del usuario con balance
- web/src/hooks/useTransfers.ts — transferencias (incoming/outgoing/pending)
- web/src/components/layout/Navbar.tsx — navbar responsivo con rol y estado
- web/src/components/layout/Sidebar.tsx — sidebar con nav por rol
- web/src/components/tokens/TokenCard.tsx — card de token con acciones
- web/src/components/tokens/CreateTokenForm.tsx — form materia prima / producto
- web/src/components/tokens/TokenList.tsx — grid de tokens con skeleton
- web/src/components/transfers/TransferCard.tsx — card de transferencia con acciones
- web/src/components/transfers/TransferForm.tsx — form para enviar transferencia
- web/src/components/transfers/TransferList.tsx — grid de transferencias
- web/src/app/page.tsx — landing: connect wallet → registro → pendiente
- web/src/app/dashboard/page.tsx — dashboard con stats por rol
- web/src/app/tokens/page.tsx — tokens diferenciados por rol (producer/factory/retailer/consumer)
- web/src/app/transfers/page.tsx — transferencias: aceptar/rechazar
- web/src/app/admin/page.tsx — panel admin: buscar usuario, aprobar/rechazar
- web/src/app/profile/page.tsx — perfil del usuario con stats

Resultado de npm run build: 0 errores, 0 warnings. 7 rutas generadas.

---

## Reglas de negocio implementadas en el contrato

1. AUTO-MINT: Al crear una lámina (createToken con parentId=0), el totalSupply completo se asigna inmediatamente al Producer.

2. CLASIFICACIÓN DE TOKENS:
   - parentId == 0 → materia prima (lámina de hierro, creada por Producer)
   - parentId > 0  → producto terminado (puerta/reja/marco, creado por Factory)

3. ACEPTACIÓN OBLIGATORIA en cada paso:
   - Producer transfiere → Factory debe acceptTransfer()
   - Factory transfiere → Retailer debe acceptTransfer()
   - Retailer transfiere → Consumer debe acceptTransfer()
   - Si rechaza rejectTransfer() → tokens vuelven al emisor

4. FLUJO UNIDIRECCIONAL válido: producer→factory→retailer→consumer
   Cualquier otra dirección es rechazada por InvalidTransferDirection.

5. BURN AL REDIMIR: Solo el Consumer puede llamar burnToken(). Marca el token como burned y destruye el balance. Cierra la trazabilidad.

6. INVENTARIO SEPARADO en Factory:
   - Materias primas: tokens recibidos con parentId == 0 (láminas)
   - Productos terminados: tokens creados con parentId > 0 (puertas, rejas, marcos)

7. MÚLTIPLES TIPOS DE PRODUCTO en Factory:
   - El campo features es un JSON string
   - Para láminas: JSON libre (calidad, espesor, certificado, lote)
   - Para productos: selector predefinido en frontend (puerta, reja, marco, panel, otro) serializado a JSON

---

## Funciones del contrato (ABI resumido)

### Usuarios
- requestUserRole(string role) — roles: "producer","factory","retailer","consumer"
- changeStatusUser(address, UserStatus) — solo admin
- getUserInfo(address) → (id, address, role, status)
- isAdmin(address) → bool

### Tokens
- createToken(name, totalSupply, features, parentId)
- burnToken(tokenId) — solo consumer
- getToken(tokenId) → (id, creator, name, totalSupply, features, parentId, dateCreated, burned)
- getTokenBalance(tokenId, address) → uint256
- getUserTokens(address) → uint256[]

### Transferencias
- transfer(to, tokenId, amount)
- acceptTransfer(transferId)
- rejectTransfer(transferId)
- getTransfer(transferId) → (id, from, to, tokenId, dateCreated, amount, status)
- getUserTransfers(address) → uint256[]

### Enums
- UserStatus: Pending(0), Approved(1), Rejected(2), Canceled(3)
- TransferStatus: Pending(0), Accepted(1), Rejected(2)

---

## Estructura de carpetas del proyecto

```
Supply-chain-tracker/
├── sc/                         ← Foundry (ya completo)
│   ├── src/SupplyChain.sol
│   ├── script/Deploy.s.sol
│   ├── test/SupplyChain.t.sol
│   └── foundry.toml
├── web/                        ← Next.js (FASE 2 - por crear)
├── README_project.md
└── IA.md
```

---

## Fase 2 — Lo que hay que construir ahora

### Setup inicial
```bash
cd Supply-chain-tracker
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd web
npm install ethers shadcn-ui
npx shadcn@latest init
```

### Estructura de carpetas del frontend (web/)

```
web/src/
├── app/
│   ├── page.tsx                 ← landing / login con MetaMask
│   ├── dashboard/page.tsx       ← dashboard por rol
│   ├── tokens/page.tsx          ← gestión de tokens
│   ├── transfers/page.tsx       ← gestión de transferencias
│   ├── admin/page.tsx           ← panel admin
│   └── profile/page.tsx         ← perfil del usuario
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   ├── tokens/
│   │   ├── TokenCard.tsx
│   │   ├── CreateTokenForm.tsx   ← con selector tipo producto para Factory
│   │   └── TokenList.tsx
│   ├── transfers/
│   │   ├── TransferCard.tsx
│   │   ├── TransferForm.tsx
│   │   └── TransferList.tsx
│   └── ui/                      ← shadcn components
├── contexts/
│   └── Web3Context.tsx          ← provider global de wallet + contrato
├── hooks/
│   ├── useWallet.ts             ← conexión MetaMask
│   ├── useTokens.ts             ← leer tokens del usuario
│   └── useTransfers.ts         ← leer transferencias del usuario
├── services/
│   └── Web3Service.ts           ← todas las llamadas al contrato con ethers.js
└── contracts/
    ├── SupplyChain.json         ← ABI (copiar de sc/out/SupplyChain.sol/)
    └── config.ts                ← dirección del contrato deployado
```

### Páginas y funcionalidades por rol

**Producer (Fundición)**
- Ver su inventario de láminas (tokens con parentId=0)
- Crear nueva lámina (createToken con parentId=0, features libre)
- Ver transferencias pendientes enviadas
- Iniciar transferencia de lámina a Factory

**Factory (Fábrica de puertas)**
- Inventario separado en dos secciones:
  - MATERIAS PRIMAS: láminas recibidas (parentId=0)
  - PRODUCTOS TERMINADOS: productos fabricados (parentId>0)
- Aceptar/rechazar láminas recibidas
- Crear producto (selector: puerta/reja/marco/panel/otro + campos adicionales)
- Iniciar transferencia de producto a Retailer

**Retailer (Distribuidor)**
- Ver inventario de productos
- Aceptar/rechazar productos de Factory
- Transferir productos a Consumer

**Consumer (Cliente final)**
- Ver productos recibidos
- Aceptar/rechazar transferencias de Retailer
- Ver trazabilidad completa de cada producto (lámina origen → producto → historial)
- Redimir (burn) el producto

**Admin**
- Ver todos los usuarios pendientes
- Aprobar/rechazar/cancelar usuarios
- Ver estado general del sistema

### Web3Context — lo más importante

```typescript
// Debe proveer:
interface Web3ContextType {
  account: string | null
  isConnected: boolean
  role: string | null          // rol del usuario en el contrato
  isAdmin: boolean
  userStatus: number | null    // 0=Pending,1=Approved,2=Rejected,3=Canceled
  contract: ethers.Contract | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
}
```

### Flujo de primera visita
1. Usuario llega a / → ve botón "Conectar MetaMask"
2. Conecta wallet → el sistema consulta getUserInfo(address)
3. Si no está registrado → muestra formulario requestUserRole
4. Si está Pending → muestra pantalla "Tu solicitud está en revisión"
5. Si está Approved → redirige a /dashboard según su rol
6. Si es admin → redirige a /admin

---

## Comandos útiles

```bash
# Levantar blockchain local (en terminal separado)
cd sc && anvil

# Desplegar contrato en Anvil
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key <TU_PRIVATE_KEY_ANVIL> \
  --broadcast

# Copiar ABI al frontend (después de forge build)
cp sc/out/SupplyChain.sol/SupplyChain.json web/src/contracts/

# Levantar frontend
cd web && npm run dev
```

---

## Notas importantes

- El ABI se genera con `forge build` en `sc/out/SupplyChain.sol/SupplyChain.json`
- La dirección del contrato deployado va en `web/src/contracts/config.ts`
- MetaMask debe estar en red Custom RPC: http://localhost:8545, chainId 31337
- Las cuentas de prueba de Anvil tienen 10000 ETH cada una
- Primera cuenta de Anvil (índice 0) es el admin del contrato

## Requerimientos del proyecto académico

- Archivo README_project.md con log de errores y soluciones (ya existe, mantener actualizado)
- Archivo IA.md con retrospectiva del uso de IA (ya existe)
- Construir un MCP que envuelva los CLI de foundry: anvil, cast, forge (pendiente)

---

## Instrucción para el agente

Por favor continúa desde donde está el proyecto. La Fase 1 (smart contract) está completa con 56 tests pasando. Necesitamos construir la Fase 2 completa: el frontend Next.js con todas las páginas y componentes descritos arriba. Empieza por el setup del proyecto Next.js dentro de la carpeta web/ y el Web3Context.
