# Metal Trace — Manual de Usuario

## Requisitos previos

- [MetaMask](https://metamask.io/) instalado en el navegador
- Acceso a la red configurada (Anvil local o Sepolia testnet)
- Una wallet con fondos en esa red

---

## 1. Acceso a la aplicación

Al entrar en la URL de la DApp verás la pantalla de bienvenida con el botón **Conectar MetaMask**.

1. Haz clic en **Conectar MetaMask**
2. Selecciona la cuenta en MetaMask y confirma
3. Si tu wallet ya está registrada y aprobada, accederás directamente a tu dashboard
4. Si es la primera vez, verás el formulario de registro

---

## 2. Registro y aprobación

### Solicitar un rol

1. Tras conectar, rellena el formulario con tu **nombre o razón social** y selecciona tu **rol**:
   - **Fundición** — produce y registra bobinas de acero
   - **Certificador** — certifica lotes de materia prima
   - **Fábrica** — transforma bobinas en productos terminados
   - **Distribuidor** — distribuye productos a clientes
   - **Cliente** — recibe y redime productos
2. Confirma la transacción en MetaMask
3. Tu solicitud quedará en estado **Pendiente** hasta que el Administrador la apruebe

> Mientras tu solicitud esté pendiente, no podrás realizar ninguna operación en la cadena.

---

## 3. Administrador

Accede desde el menú lateral → **Administración**.

### Gestionar solicitudes

- Pestaña **Pendientes**: solicitudes de nuevos usuarios esperando decisión
  - **Aprobar**: el usuario queda activo y puede operar
  - **Rechazar**: la solicitud se deniega
- Pestaña **Aprobados**: usuarios activos con buscador por nombre o dirección
- Pestaña **Rechazados**: historial de solicitudes denegadas

### Dashboard de KPIs

En **Dashboard** (menú lateral) el administrador ve métricas globales de toda la cadena:
- Lotes de bobinas registrados
- Productos fabricados
- Certificaciones emitidas
- Transferencias totales y en tránsito
- Redenciones y unidades consumidas

Usa el selector de usuario para filtrar las métricas de un participante concreto.

---

## 4. Fundición (producer)

Accede desde el menú lateral → **Inventario**.

### Registrar un lote de bobinas

1. Clic en **+ Nueva Bobina**
2. Rellena:
   - **Nombre del lote** (ej: "Bobina Acero A36 — Lote 001")
   - **Cantidad** en kg (con hasta 2 decimales)
   - **Características técnicas** en JSON libre: calidad, grado, espesor, norma, etc.
3. Confirma en MetaMask
4. El lote aparece en tu inventario con estado **Sin certificar**

> Una bobina sin certificar no puede transferirse. El botón de transferencia permanece desactivado hasta que el Certificador la valide.

### Transferir una bobina

1. En la tarjeta del token, clic en **Transferir**
2. Selecciona la **Fábrica** destinataria y la cantidad
3. Confirma en MetaMask
4. El balance se descuenta inmediatamente; la transferencia queda **Pendiente** hasta que la Fábrica acepte

---

## 5. Certificador (certifier)

Accede desde el menú lateral → **Certificación**.

### Certificar un lote

1. Pestaña **Pendientes**: lista de bobinas sin certificar
2. Filtra por productor si es necesario
3. Clic en **Certificar** sobre el lote
4. Ingresa el **número de certificado** (ej: `ISO-9001-2024-00123`)
5. Confirma en MetaMask

El número de certificado, la identidad del certificador y la fecha quedan registrados on-chain de forma permanente.

---

## 6. Fábrica (factory)

Accede desde el menú lateral → **Inventario**.

### Aceptar bobinas recibidas

1. Menú lateral → **Transferencias** → pestaña **Pendientes**
2. Revisa los detalles del lote (nombre, cantidad, estado de certificación)
3. Clic en el badge **Certificada ↗** para ver la información del certificado
4. **Aceptar** para recibir los tokens en tu inventario, o **Rechazar** para devolverlos

### Fabricar un producto

1. Inventario → pestaña **Fabricar Producto**
2. Selecciona la **bobina de origen** (muestra nombre, ID y balance disponible)
3. Indica la **cantidad de materia prima consumida** y los **productos a fabricar**
4. Rellena las características del producto (tipo, espesor, dimensiones…)
5. Confirma en MetaMask

El producto queda vinculado a la bobina de origen mediante `parentId` — la trazabilidad es permanente.

### Transferir productos

1. Inventario → pestaña **Productos Fabricados**
2. Clic en **Transferir** sobre el token
3. Selecciona el **Distribuidor** destinatario y la cantidad
4. Confirma en MetaMask

---

## 7. Distribuidor (retailer)

Accede desde el menú lateral → **Transferencias**.

### Aceptar productos de la fábrica

1. Pestaña **Pendientes**: transferencias en espera de tu confirmación
2. **Aceptar** para recibir el inventario

### Transferir al cliente

1. Menú lateral → **Inventario**
2. Clic en **Transferir** sobre el token
3. Selecciona el **Cliente** y la cantidad
4. Confirma en MetaMask

---

## 8. Cliente (consumer)

Accede desde el menú lateral → **Mis Láminas**.

### Aceptar transferencias

1. Menú lateral → **Transferencias** → **Pendientes**
2. Revisa los detalles y haz clic en **Aceptar**

### Redimir (consumir) productos

1. En la tarjeta del token, clic en **Redimir**
2. El formulario muestra:
   - Cantidad disponible en tu inventario
   - Impacto: láminas consumidas y reducción en el lote de bobina origen
3. Ingresa la cantidad a redimir (parcial o total)
4. Confirma en MetaMask

### Ver historial de redenciones

En la tarjeta del token aparece el badge **N redención(es) ↗**. Al hacer clic se muestra:
- Fecha de cada redención
- Cantidad consumida
- Hash de la transacción (verificable en cualquier explorador de bloques)

---

## 9. Perfil

Accede desde el menú lateral → **Perfil**.

Muestra:
- Dirección de wallet
- Rol y estado de aprobación
- Nombre o razón social registrado
- Fecha de registro y aprobación (leída directamente de eventos on-chain)
- Red, Chain ID y RPC activos

---

## 10. Verificar trazabilidad de un producto

Cualquier usuario puede ver la trazabilidad completa de un token:

1. En la tarjeta del token, busca el campo **Bobina origen** o `parentId`
2. El ID referencia al lote de materia prima del que proviene
3. Busca ese lote en la vista de Certificación para ver quién lo certificó y con qué número

Toda esta información es pública en la blockchain — no depende de ninguna base de datos centralizada.
