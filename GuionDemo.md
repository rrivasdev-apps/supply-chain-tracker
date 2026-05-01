# Metal Trace — Guión de Video de Demostración

**Duración objetivo:** 4:50 – 5:00  
**Formato sugerido:** pantalla completa del navegador + narración en off  
**Preparación:** tener MetaMask con 6 cuentas configuradas y el contrato desplegado con todos los usuarios ya aprobados y con actividad previa (tokens, transferencias, redenciones)

---

## Escena 1 — Presentación (0:00 – 0:20)

**Pantalla:** portada o página de login de la DApp (`/`)

> *"Metal Trace es una aplicación descentralizada de trazabilidad industrial. Registra cada etapa de la cadena de suministro del acero — desde la fundición hasta el cliente final — sobre una blockchain EVM, sin intermediarios y con información inmutable.*
>
> *Vamos a recorrer las seis fases del sistema en menos de cinco minutos."*

---

## Escena 2 — Admin: gestión de usuarios (0:20 – 0:55)

**Pantalla:** conectar con la wallet del Administrador → `/admin`

> *"Todo comienza con el Administrador. Antes de que cualquier actor pueda operar, debe solicitar su rol y esperar aprobación."*

**Acción:** mostrar la pestaña **Pendientes** con al menos una solicitud visible.

> *"Aquí vemos las solicitudes en espera. El administrador puede aprobar, rechazar o cancelar con un solo clic."*

**Acción:** hacer clic en **Aprobar** sobre una solicitud. Esperar confirmación del toast.

> *"La aprobación queda registrada en la cadena. Observen la pestaña de Aprobados —"*

**Acción:** cambiar a pestaña **Aprobados**. Escribir algo en el buscador.

> *"— con búsqueda por nombre o dirección de wallet, para gestionar redes con muchos participantes."*

---

## Escena 3 — Fundición: crear lote de materia prima (0:55 – 1:25)

**Pantalla:** conectar con la wallet de la Fundición → `/tokens`

> *"La Fundición registra los lotes de bobinas de acero. Cada lote se convierte en un token on-chain con nombre, cantidad y características técnicas."*

**Acción:** abrir el formulario de creación. Rellenar: nombre `Bobina Acero 4mm`, cantidad, características (grosor, aleación). Confirmar en MetaMask.

> *"El token queda registrado en su inventario con balance y existencia total visibles."*

**Acción:** mostrar la tarjeta del token recién creado. Señalar los valores de **Inventario Empresa** y **Existencia Total**.

> *"Inventario Empresa refleja el balance propio; Existencia Total, el suministro total del lote — ambos se ajustan automáticamente a lo largo de la cadena."*

---

## Escena 4 — Control de certificación obligatoria (1:25 – 1:50)

**Pantalla:** misma tarjeta del token sin certificar

> *"Aquí entra uno de los controles de calidad del sistema."*

**Acción:** señalar el aviso rojo **Certificación Pendiente** donde normalmente estaría el botón de transferir.

> *"Una bobina no puede moverse en la cadena hasta que haya sido certificada. El contrato lo impide a nivel de código — no es una validación de interfaz, es una regla de negocio grabada en la blockchain."*

---

## Escena 5 — Certificador: emitir certificación (1:50 – 2:20)

**Pantalla:** conectar con la wallet del Certificador → `/certification`

> *"El Certificador accede a los lotes pendientes de certificación."*

**Acción:** expandir la tarjeta de la bobina. Ingresar un número de certificado real, por ejemplo `CERT-2026-0042`. Confirmar.

> *"El número de certificado queda registrado on-chain junto con la identidad del certificador — la firma criptográfica de la transacción es la prueba de autoría. No puede alterarse ni falsificarse."*

**Acción:** volver a la vista de la Fundición → mostrar la tarjeta ahora con badge **Certificada** y el botón de transferir activo.

---

## Escena 6 — Fundición → Fábrica: transferencia de bobina (2:20 – 2:50)

**Pantalla:** tarjeta de la bobina certificada, clic en **Transferir**

**Acción:** seleccionar la wallet de la Fábrica como destinatario, ingresar cantidad. Confirmar.

> *"La transferencia queda en estado Pendiente. El balance de la Fundición se deduce de inmediato — los tokens están en tránsito, ni en un lado ni en el otro, hasta que la Fábrica acepte."*

**Pantalla:** conectar con la wallet de la Fábrica → `/transfers`

> *"En la vista de transferencias de la Fábrica vemos la tarjeta con toda la información del token recibido —"*

**Acción:** señalar el badge de tipo, el badge **Certificada**, las características del lote.

> *"— incluyendo el estado de certificación. Si hacemos clic en Certificada —"*

**Acción:** clic en el badge **Certificada ↗**.

> *"— vemos el nombre del certificador, su dirección, el número de certificado y la fecha exacta registrada en el bloque. Trazabilidad completa sin salir de la interfaz."*

**Acción:** cerrar popup → clic en **Aceptar**. Confirmar en MetaMask.

---

## Escena 7 — Fábrica: fabricar producto (2:50 – 3:25)

**Pantalla:** `/tokens` de la Fábrica → pestaña **Fabricar Producto**

> *"Con la bobina en su inventario, la Fábrica puede fabricar láminas. Elige el lote de origen —"*

**Acción:** abrir el selector de bobinas. Señalar que muestra nombre, ID y balance disponible.

> *"— el selector muestra nombre, identificador y balance disponible para no trabajar con información incompleta. Se indica cuánta materia prima se consume y cuántos productos se fabricarán."*

**Acción:** completar el formulario. Confirmar. Mostrar la pestaña **Productos Fabricados** con el nuevo token.

> *"El producto hereda el parentId de la bobina de origen. Esa referencia es inmutable — la trazabilidad queda grabada para siempre."*

---

## Escena 8 — Fábrica → Distribuidor → Cliente (3:25 – 3:55)

**Pantalla:** transferencia rápida de la Fábrica al Distribuidor

> *"La lámina viaja ahora por la cadena de distribución. Fábrica transfiere al Distribuidor, el Distribuidor acepta y reenvía al Cliente."*

**Acción:** realizar las dos transferencias y aceptaciones en modo rápido, mostrando solo los momentos clave (envío + aceptación).

> *"Cada movimiento queda registrado. El contrato valida en todo momento que el flujo sea Fundición → Fábrica → Distribuidor → Cliente. No es posible saltarse un eslabón ni transferir en sentido inverso."*

---

## Escena 9 — Cliente: redención parcial e historial (3:55 – 4:30)

**Pantalla:** conectar con la wallet del Cliente → `/tokens`

> *"El Cliente llega al final de la cadena. Puede redimir sus productos — total o parcialmente."*

**Acción:** clic en **Redimir** sobre el token. Mostrar el formulario con el campo de cantidad.

> *"El formulario muestra el impacto antes de confirmar: cuántas láminas se van a consumir, cuántas quedan, y que el lote de bobina origen también se reducirá en la misma proporción — la contabilidad es coherente en toda la cadena."*

**Acción:** ingresar una cantidad parcial. Confirmar. Mostrar el badge actualizado en la tarjeta.

> *"Y si el cliente quiere consultar su historial de redenciones —"*

**Acción:** clic en el badge **1 redención(es) ↗**. Mostrar el dialog con fecha, cantidad y hash de transacción.

> *"— cada operación queda auditada con fecha, cantidad consumida y el hash de la transacción para verificación independiente en cualquier explorador de bloques."*

---

## Escena 10 — Extras: perfil y KPIs del administrador (4:30 – 4:55)

**Pantalla:** conectar con Admin → `/profile`

> *"Por último, el panel de control del Administrador."*

**Acción:** mostrar el dashboard de KPIs. Señalar las métricas (lotes, productos, certificaciones, transferencias, redenciones).

> *"Siete indicadores en tiempo real sobre toda la cadena. Y con el selector de usuario —"*

**Acción:** abrir el dropdown y seleccionar un usuario específico. Ver cómo los números cambian.

> *"— puede aislar la actividad de cualquier participante para auditoría o seguimiento."*

**Pantalla:** `/profile` de cualquier usuario no-admin

> *"Los usuarios, por su parte, ven en su perfil la fecha exacta en que fueron aprobados — dato leído directamente de los eventos de la blockchain, sin depender de ninguna base de datos externa."*

---

## Escena 11 — Cierre (4:55 – 5:00)

**Pantalla:** página de login o pantalla con el nombre del proyecto

> *"Metal Trace — trazabilidad industrial, inmutable y verificable, en cada eslabón de la cadena."*

---

## Notas de producción

| # | Punto a tener listo antes de grabar |
|---|-------------------------------------|
| 1 | 6 cuentas MetaMask nombradas claramente (Admin, Fundición, Certificador, Fábrica, Distribuidor, Cliente) |
| 2 | Todos los usuarios aprobados excepto uno, que debe estar en Pendientes para la escena del Admin |
| 3 | Al menos una bobina sin certificar para mostrar el bloqueo de transferencia (escena 4) |
| 4 | Al menos una bobina certificada con transferencia ya aceptada por la Fábrica (para no perder tiempo esperando MetaMask en vivo) |
| 5 | Al menos un producto ya transferido al Cliente con alguna redención previa registrada |
| 6 | Usar `anvil --block-time 1` para que las confirmaciones sean instantáneas y no haya esperas visibles |
| 7 | Grabar a 1920×1080, zoom del navegador al 90% para que quepan los elementos sin scroll |
