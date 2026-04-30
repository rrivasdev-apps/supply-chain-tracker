# ModifyProject — Análisis y Plan de Acción (v3 — APROBADO)

---

## 1. Modelo de Negocio — Cadena de Actores

```
[Proveedores externos]
  Pellets + Chatarra certificados
         ↓
[FUNDICIÓN]  rol: "producer"
  → Registra lote de Bobinas on-chain con features JSON libres
  → Estado inicial de la bobina: PENDIENTE DE CERTIFICACIÓN
         ↓
[CERTIFICADOR]  rol: "certifier"
  → Ve producción de TODOS los productores (filtrable por productor, orden cronológico)
  → Lista "Pendiente de Certificar" → acción: Certificar con hash
  → Lista "Producción Certificada" (solo lectura)
  → Solo bobinas certificadas pueden transferirse a la Fábrica
         ↓
[FÁBRICA]  rol: "factory"
  → Recibe bobinas certificadas
  → Produce Láminas (consume bobinas)
         ↓
[DISTRIBUIDOR]  rol: "retailer"
  → Recibe láminas, distribuye a clientes
         ↓
[CLIENTE]  rol: "consumer"
  → Recibe láminas como materia prima → BURN al usar
```

---

## 2. Decisión sobre el BURN

- Fundición crea tokens **Bobina** (parentId = 0). Nacen sin certificar.
- Certificador certifica on-chain. Solo bobinas certificadas son transferibles.
- Fábrica consume bobinas y emite tokens **Lámina** (parentId = id bobina).
- Cliente quema **tokens Lámina** al redimir.
- Trazabilidad: Cliente → Lámina → Bobina → materia prima de origen.

---

## 3. Roles

| String contrato | Etiqueta UI | Crea tokens | Transfiere | Quema | Certifica |
|---|---|---|---|---|---|
| `"producer"` | Fundición | Sí (Bobinas) | Sí → factory | No | No |
| `"certifier"` | Certificador | No | No | No | Sí (Bobinas) |
| `"factory"` | Fábrica | Sí (Láminas) | Sí → retailer | No | No |
| `"retailer"` | Distribuidor | No | Sí → consumer | No | No |
| `"consumer"` | Cliente | No | No | Sí | No |

---

## 4. Cambios en el Contrato — Diseño Definitivo

### 4.1 Índices de eficiencia (gas y velocidad)

Se agregan cuatro índices para eliminar iteraciones costosas:

```solidity
// Índice 1 — todos los tokenIds en orden de creación (cronológico)
uint256[] private _allTokenIds;

// Índice 2 — todos los userIds en orden de registro
uint256[] private _allUserIds;

// Índice 3 — addresses por rol (para dropdowns de transferencia y filtros)
mapping(string => address[]) private _userAddressesByRole;

// Índice 4 — _userTokenIds ya existe: tokenIds por address (para filtrar por productor)
// mapping(address => uint256[]) private _userTokenIds;  ← ya existe, sin cambios
```

**Por qué estos índices son los óptimos:**

| Consulta | Sin índice | Con índice |
|---|---|---|
| Todos los usuarios pendientes (admin) | Iterar hasta nextUserId | `getAllUserIds()` → 1 call |
| Usuarios por rol (dropdown transferencia) | Iterar todos los usuarios + filtrar | `getUserAddressesByRole("factory")` → 1 call |
| Todos los tokens para Certificador | Iterar hasta nextTokenId | `getAllTokenIds()` → 1 call |
| Tokens de un productor específico | Iterar todos los tokens + filtrar | `getUserTokenIds(producerAddr)` → ya existe |
| Tokens de un productor en orden cronológico | — | `getUserTokenIds` ya es cronológico (push en orden) |

El `_allTokenIds` y `_allUserIds` son arrays que crecen con cada creación — costo de push: O(1) por operación, sin impacto notable en gas del usuario final. El `_userAddressesByRole` cuesta un push en `requestUserRole`, también O(1).

### 4.2 Nuevos campos en structs

```solidity
struct Token {
    uint256 id;
    address creator;
    string  name;
    uint256 totalSupply;
    string  features;
    uint256 parentId;
    uint256 dateCreated;
    bool    burned;
    bool    certified;   // NUEVO — false hasta que el Certificador lo aprueba
    mapping(address => uint256) balance;
}

struct User {
    uint256    id;
    address    userAddress;
    string     name;        // NUEVO — nombre o razón social
    string     role;
    UserStatus status;
}
```

### 4.3 Nuevos errores y eventos

```solidity
// Errores
error TokenNotCertified();      // intento de transferir bobina no certificada
error TokenNotCertifiable();    // token no es bobina o ya está certificado
error NotCertifier();           // caller no tiene rol certifier

// Evento
event TokenCertified(
    uint256 indexed tokenId,
    address indexed certifier,
    string  certHash,
    uint256 date
);
```

### 4.4 Función `requestUserRole` — modificada

```solidity
function requestUserRole(string memory name, string memory role) public {
    if (addressToUserId[msg.sender] != 0) revert AlreadyRegistered();
    _validateRole(role);

    uint256 uid = nextUserId++;
    users[uid] = User({
        id:          uid,
        userAddress: msg.sender,
        name:        name,        // NUEVO
        role:        role,
        status:      UserStatus.Pending
    });
    addressToUserId[msg.sender] = uid;

    _allUserIds.push(uid);                              // NUEVO índice 2
    _userAddressesByRole[role].push(msg.sender);        // NUEVO índice 3

    emit UserRoleRequested(msg.sender, role);
}
```

### 4.5 Función `createToken` — modificada

```solidity
// Dentro de createToken, tras asignar el token:
_allTokenIds.push(tokenId);   // NUEVO índice 1
```

### 4.6 `_validateRole` — agrega certifier

```solidity
function _validateRole(string memory role) internal pure {
    if (
        !_strEq(role, "producer")  &&
        !_strEq(role, "certifier") &&   // NUEVO
        !_strEq(role, "factory")   &&
        !_strEq(role, "retailer")  &&
        !_strEq(role, "consumer")
    ) revert InvalidRole();
}
```

`"certifier"` NO se agrega a `_validateTransferDirection` — no puede enviar ni recibir tokens.

### 4.7 Función `certifyToken` — nueva

```solidity
function certifyToken(uint256 tokenId, string memory certHash) public onlyApproved {
    uint256 uid = addressToUserId[msg.sender];
    if (!_strEq(users[uid].role, "certifier")) revert NotCertifier();
    if (tokens[tokenId].id == 0)               revert TokenNotFound();
    if (tokens[tokenId].parentId != 0)         revert TokenNotCertifiable(); // solo bobinas
    if (tokens[tokenId].certified)             revert TokenNotCertifiable(); // ya certificado

    tokens[tokenId].certified = true;
    emit TokenCertified(tokenId, msg.sender, certHash, block.timestamp);
}
```

> El hash de certificación va en el evento, no en `features`. Los features del productor quedan inmutables como registro de origen. La capa de certificación es independiente y auditable por separado.

### 4.8 Función `transfer` — verificación de certificación

```solidity
function transfer(address to, uint256 tokenId, uint256 amount) public onlyApproved {
    if (amount == 0)                             revert ZeroAmount();
    if (to == msg.sender)                        revert CannotTransferToSelf();
    if (tokens[tokenId].id == 0)                 revert TokenNotFound();
    if (tokens[tokenId].burned)                  revert TokenAlreadyBurned();
    // NUEVO: bobinas no certificadas no pueden transferirse
    if (tokens[tokenId].parentId == 0 && !tokens[tokenId].certified) revert TokenNotCertified();
    if (tokens[tokenId].balance[msg.sender] < amount) revert InsufficientBalance();
    // ... resto sin cambios
}
```

### 4.9 Nuevas funciones view

```solidity
// Todos los tokenIds (para Certificador y consultas generales)
function getAllTokenIds() public view returns (uint256[] memory) {
    return _allTokenIds;
}

// Todos los userIds (para admin — lista de pendientes)
function getAllUserIds() public view returns (uint256[] memory) {
    return _allUserIds;
}

// Addresses por rol (para dropdown de transferencia)
function getUserAddressesByRole(string memory role) public view returns (address[] memory) {
    return _userAddressesByRole[role];
}

// Actualizar getToken para incluir certified en el return
function getToken(uint256 tokenId) public view returns (
    uint256 id,
    address creator,
    string memory name,
    uint256 totalSupply,
    string memory features,
    uint256 parentId,
    uint256 dateCreated,
    bool    burned,
    bool    certified    // NUEVO campo en return
) { ... }

// Actualizar getUserInfo para incluir name en el return
function getUserInfo(address userAddress) public view returns (
    uint256 id,
    address userAddr,
    string memory name,   // NUEVO campo en return
    string memory role,
    UserStatus status
) { ... }
```

---

## 5. Diseño del Panel del Certificador

### Fuente de datos

```
getAllTokenIds()
  → Para cada tokenId: getToken()
  → Filtrar: parentId == 0 (solo bobinas)
  → Para el creador: getUserInfo(creator) → obtener name
  → Ordenar por dateCreated (los arrays son cronológicos por construcción)
```

### UI — dos tabs

**Tab "Pendiente de Certificar"**
- Filtro por productor: Select con todos los productores (`getUserAddressesByRole("producer")`)
- Cada fila: Nombre bobina · Productor (nombre + addr corta) · Fecha · Balance · Features (expandible)
- Botón "Certificar": abre modal con input "Hash de Certificación" + botón confirmar

**Tab "Producción Certificada"**
- Mismo filtro por productor
- Cada fila: + Hash de cert + Fecha de certificación + Certificador (nombre + addr)
- El hash y fecha de cert se leen del evento `TokenCertified` filtrado por `tokenId`
- Solo lectura

### Orden cronológico

Los tokens se agregan al array `_allTokenIds` en orden de creación → `getAllTokenIds()` ya devuelve los IDs en orden cronológico. No se requiere ordenamiento adicional en el frontend.

---

## 6. Dropdown de Usuarios en TransferForm

### Lógica de consulta (un solo call por role)

```typescript
// Para fundición transfiriendo a fábrica:
const addresses = await contract.getUserAddressesByRole("factory")
// Para cada address: getUserInfo(addr) en paralelo con Promise.all
const users = await Promise.all(addresses.map(addr => getUserInfo(contract, addr)))
// Filtrar status === Approved
const eligible = users.filter(u => u.status === 1)
```

### UI

```
[Select]
  Acería del Norte      0x1234…5678
  Fábrica Industrial    0xabcd…ef01
  [Ingresar dirección manualmente ↓]   ← fallback opcional
```

---

## 7. Panel de Usuarios Pendientes en Admin

### Fuente de datos

```
getAllUserIds()
  → Para cada userId: getUserInfo(users[userId].userAddress)
  → Filtrar: status === Pending
  → Mostrar en tabla con botones Aprobar / Rechazar
```

### UI (en `/admin/page.tsx` — nueva sección al inicio)

```
┌─ Solicitudes Pendientes (3) ──────────────────────────────────────┐
│ Nombre         Dirección        Rol           Acción              │
│ Acería Norte   0x1234…5678      Fundición     [Aprobar] [Rechazar]│
│ Lab Central    0xabcd…ef01      Certificador  [Aprobar] [Rechazar]│
│ Fábrica XYZ    0x9999…1111      Fábrica       [Aprobar] [Rechazar]│
└───────────────────────────────────────────────────────────────────┘
```

---

## 8. Componentes a Eliminar

| Archivo | Razón |
|---|---|
| `components/factory/BomEditor.tsx` | Sistema BOM eliminado |
| `components/factory/BomTemplateList.tsx` | Sistema BOM eliminado |
| `components/factory/CreateProductWithBom.tsx` | Sistema BOM eliminado |
| `hooks/useBomTemplates.ts` | Sistema BOM eliminado |

---

## 9. Componentes a Crear

| Archivo | Descripción |
|---|---|
| `components/shared/FeaturesEditor.tsx` | Editor dinámico clave-valor → JSON |
| `components/factory/CreateLaminaForm.tsx` | Formulario bobina→láminas directo |
| `components/certification/CertificationList.tsx` | Listas pendiente/certificada |
| `app/certification/page.tsx` | Página principal del Certificador |
| `hooks/useAllTokens.ts` | Todos los tokens vía getAllTokenIds |
| `hooks/useAllUsers.ts` | Todos los usuarios vía getAllUserIds |
| `hooks/useApprovedUsers.ts` | Usuarios aprobados por rol (dropdown) |

---

## 10. Plan de Implementación por Fases

### Fase 0 — Contrato Solidity (PRIMERO, antes de cualquier frontend)

1. Agregar `bool certified` a struct `Token`.
2. Agregar `string name` a struct `User`.
3. Agregar cuatro índices: `_allTokenIds`, `_allUserIds`, `_userAddressesByRole`.
4. Modificar `requestUserRole(name, role)` — nuevo param + push a índices.
5. Modificar `createToken` — push a `_allTokenIds`.
6. Agregar `"certifier"` a `_validateRole`.
7. Agregar errores: `TokenNotCertified`, `TokenNotCertifiable`, `NotCertifier`.
8. Agregar evento `TokenCertified`.
9. Agregar función `certifyToken`.
10. Modificar `transfer` — check certificación para bobinas.
11. Agregar funciones view: `getAllTokenIds`, `getAllUserIds`, `getUserAddressesByRole`.
12. Actualizar returns de `getToken` (añadir `certified`) y `getUserInfo` (añadir `name`).
13. Compilar, corregir errores, redeploy en Anvil.

### Fase 1 — Web3Service y tipos

1. Actualizar ABI con todas las nuevas funciones y eventos.
2. Actualizar tipo `TokenWithBalance`: agregar campo `certified: boolean`.
3. Actualizar tipo `UserInfo`: agregar campo `name: string`.
4. Agregar funciones: `certifyToken`, `getAllTokenIds`, `getAllUserIds`, `getUserAddressesByRole`.
5. Actualizar `requestUserRole` en el servicio: nuevo param `name`.
6. Actualizar `getToken` y `getUserInfo` para mapear el nuevo campo en el return.

### Fase 2 — Hooks nuevos

1. `useAllTokens.ts` — llama `getAllTokenIds()`, hidratan con `getToken()` en `Promise.all`.
2. `useAllUsers.ts` — llama `getAllUserIds()`, hidrata con `getUserInfo()`.
3. `useApprovedUsers.ts(targetRole)` — llama `getUserAddressesByRole(role)`, hidrata, filtra Approved.

### Fase 3 — Limpieza y renombrado UI

1. `ROLE_LABELS`: añadir `certifier: "Certificador"`, cambiar producer→"Fundición", consumer→"Cliente".
2. Formulario de registro `page.tsx`:
   - Agregar campo "Nombre o Razón Social" (obligatorio).
   - Agregar opción "Certificador" en el select de rol.
   - Pasar `name` a `requestUserRole`.
3. Sidebar: agregar ruta `/certification` solo para rol `certifier`. Ajustar rutas por rol.
4. Dashboard: flujo de cadena actualizado, stats y acciones rápidas con etiquetas nuevas.

### Fase 4 — Panel de usuarios pendientes en Admin

1. Usar `useAllUsers` en `admin/page.tsx`.
2. Filtrar usuarios con status=Pending.
3. Renderizar tabla con botones Aprobar/Rechazar.
4. Badge de conteo. Reutilizar handlers existentes `changeStatusUser`.

### Fase 5 — Página del Certificador

1. `app/certification/page.tsx` con guard de rol.
2. `CertificationList.tsx` — dos tabs, filtro por productor, orden cronológico.
3. Modal de certificación con input hash.
4. Leer eventos `TokenCertified` para mostrar info en tab "Certificada".
5. Dashboard del Certificador: stats de bobinas pendientes y certificadas.

### Fase 6 — Dropdown de usuarios en TransferForm

1. Usar `useApprovedUsers(targetRole)` en `TransferForm.tsx`.
2. Reemplazar input dirección por Select.
3. Mostrar: "Nombre — 0x1234…5678".
4. Link "Ingresar dirección manualmente" como fallback.

### Fase 7 — FeaturesEditor

1. `components/shared/FeaturesEditor.tsx` — lista de pares `{key, value}`.
2. Chips de sugerencia por contexto (Fundición / Fábrica).
3. Exporta JSON string, inicializa desde JSON string.

### Fase 8 — Refactorizar formulario de Fundición

1. Reemplazar inputs fijos por `FeaturesEditor` en `CreateTokenForm.tsx`.
2. `TokenCard.tsx`: features dinámicas, badge "✓ Certificado" / "Pendiente de Certificación".

### Fase 9 — Refactorizar flujo de Fábrica

1. Eliminar archivos BOM listados en §8.
2. Crear `CreateLaminaForm.tsx`:
   - Dropdown de bobinas recibidas con `certified=true`.
   - Cantidad a consumir (SCALE_FACTOR), nombre lote, número de láminas, `FeaturesEditor`.
   - Flujo: `consumeRawMaterial` → `createToken`.
3. Actualizar `tokens/page.tsx`: eliminar tabs BOM, nuevo layout Bobinas/Láminas.

### Fase 10 — Verificación completa

Flujo de prueba en Anvil:
1. Registrar y aprobar: 1 Fundición, 1 Certificador, 1 Fábrica, 1 Distribuidor, 1 Cliente.
2. Fundición crea bobina → aparece en Certificador como "Pendiente".
3. Certificador filtra por productor, certifica con hash.
4. Fundición intenta transferir bobina no certificada → revert `TokenNotCertified`.
5. Fundición transfiere bobina certificada → dropdown muestra Fábricas disponibles con nombre.
6. Fábrica produce láminas → dropdown muestra Distribuidores.
7. Distribuidor transfiere → Cliente redime (burn).
8. Admin ve lista automática de pendientes.

---

## 11. Resumen de Cambios por Archivo

| Archivo | Acción | Descripción |
|---|---|---|
| `sc/src/SupplyChain.sol` | **MODIFICAR** | Certified, name, 4 índices, certifier, certifyToken, getAllTokenIds, getAllUserIds, getUserAddressesByRole |
| `services/Web3Service.ts` | **MODIFICAR** | Nuevas funciones, tipos actualizados |
| `hooks/useTokens.ts` | **MODIFICAR** | Campo certified en TokenWithBalance |
| `hooks/useAllTokens.ts` | **CREAR** | — |
| `hooks/useAllUsers.ts` | **CREAR** | — |
| `hooks/useApprovedUsers.ts` | **CREAR** | — |
| `components/shared/FeaturesEditor.tsx` | **CREAR** | — |
| `components/factory/CreateLaminaForm.tsx` | **CREAR** | — |
| `components/certification/CertificationList.tsx` | **CREAR** | — |
| `app/certification/page.tsx` | **CREAR** | — |
| `components/factory/BomEditor.tsx` | **ELIMINAR** | — |
| `components/factory/BomTemplateList.tsx` | **ELIMINAR** | — |
| `components/factory/CreateProductWithBom.tsx` | **ELIMINAR** | — |
| `hooks/useBomTemplates.ts` | **ELIMINAR** | — |
| `components/tokens/CreateTokenForm.tsx` | **MODIFICAR** | FeaturesEditor, sin campos fijos |
| `components/tokens/TokenCard.tsx` | **MODIFICAR** | Features dinámicas, badge certified |
| `components/transfers/TransferForm.tsx` | **MODIFICAR** | Dropdown useApprovedUsers |
| `app/tokens/page.tsx` | **MODIFICAR** | Eliminar BOM, nuevo flujo fábrica |
| `app/admin/page.tsx` | **MODIFICAR** | Panel usuarios pendientes automático |
| `app/dashboard/page.tsx` | **MODIFICAR** | ROLE_LABELS, cadena actualizada |
| `app/page.tsx` | **MODIFICAR** | Campo nombre, opción certifier |
| `components/layout/Sidebar.tsx` | **MODIFICAR** | Ruta /certification para certifier |
| `components/layout/Navbar.tsx` | **MODIFICAR** | Etiquetas actualizadas |

---

## 12. Consideraciones Finales

- **Los features de la Fundición son inmutables** una vez creada la bobina (solo el creador puede editarlos con `updateToken`). La certificación es una capa independiente registrada en eventos, no sobreescribe el JSON de la fundición.
- **El certificador no puede auto-certificar** porque el rol `certifier` no puede crear tokens (no puede ser productor simultáneamente con el mismo address).
- **SCALE_FACTOR=100** aplica solo a Bobinas (parentId=0). Láminas son enteros discretos.
- **Gas de los índices**: el costo de push a los cuatro arrays/mappings es O(1) por operación y se paga en el momento del registro/creación. Las consultas view son gratuitas.

---

*v3 — Aprobado por el usuario. Listo para implementación comenzando por Fase 0.*
