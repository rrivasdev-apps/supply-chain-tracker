# Metal Trace — Diagramas de Arquitectura

## 1. Arquitectura general del sistema

```mermaid
graph TB
    subgraph Frontend["Frontend — Next.js 16 (App Router)"]
        UI[Interfaz de Usuario]
        W3C[Web3Context]
        SVC[Web3Service]
    end

    subgraph Blockchain["Blockchain — Anvil / EVM"]
        SC[SupplyChain.sol]
        EVENTS[(Eventos on-chain)]
    end

    subgraph Wallets["Wallets"]
        MM[MetaMask]
    end

    UI --> W3C
    W3C --> SVC
    SVC -->|ethers.js v6| MM
    MM -->|firma tx| SC
    SC --> EVENTS
    SVC -->|queryFilter| EVENTS
    SVC -->|view calls| SC
```

---

## 2. Roles y permisos

```mermaid
graph LR
    ADMIN([Administrador]):::admin
    PROD([Fundición<br/>producer]):::role
    CERT([Certificador<br/>certifier]):::role
    FACT([Fábrica<br/>factory]):::role
    DIST([Distribuidor<br/>retailer]):::role
    CONS([Cliente<br/>consumer]):::role

    ADMIN -->|aprueba / rechaza / cancela| PROD
    ADMIN -->|aprueba / rechaza / cancela| CERT
    ADMIN -->|aprueba / rechaza / cancela| FACT
    ADMIN -->|aprueba / rechaza / cancela| DIST
    ADMIN -->|aprueba / rechaza / cancela| CONS

    classDef admin fill:#7c3aed,color:#fff,stroke:none
    classDef role  fill:#2563eb,color:#fff,stroke:none
```

---

## 3. Modelo de datos (ER)

```mermaid
erDiagram
    USER {
        uint256 id
        address userAddress
        string  name
        string  role
        uint8   status
    }
    TOKEN {
        uint256 id
        address creator
        string  name
        uint256 totalSupply
        string  features
        uint256 parentId
        uint256 dateCreated
        bool    burned
        bool    certified
    }
    TRANSFER {
        uint256 id
        address from
        address to
        uint256 tokenId
        uint256 amount
        uint8   status
    }

    USER ||--o{ TOKEN     : "crea"
    USER ||--o{ TRANSFER  : "emite / recibe"
    TOKEN ||--o{ TRANSFER : "se transfiere en"
    TOKEN ||--o| TOKEN    : "parentId →"
```

---

## 4. Ciclo de vida del usuario

```mermaid
stateDiagram-v2
    [*] --> Registrado : requestUserRole()
    Registrado --> Pendiente : status = 0
    Pendiente --> Aprobado : changeStatusUser(1)
    Pendiente --> Rechazado : changeStatusUser(2)
    Aprobado --> Cancelado : changeStatusUser(3)
    Rechazado --> [*]
    Cancelado --> [*]

    note right of Aprobado
        Solo en este estado
        puede ejecutar
        funciones del contrato
    end note
```

---

## 5. Ciclo de vida del token

```mermaid
stateDiagram-v2
    direction LR

    state "Bobina" as B {
        [*] --> Creada : createToken(parentId=0)
        Creada --> Certificada : certifyToken()
        Certificada --> EnTransito : transfer()
        EnTransito --> Creada : rejectTransfer()
        EnTransito --> ConFábrica : acceptTransfer()
        ConFábrica --> Consumida : consumeRawMaterial()
    }

    state "Lámina" as L {
        [*] --> Fabricada : createToken(parentId>0)
        Fabricada --> EnTransito2 : transfer()
        EnTransito2 --> Fabricada : rejectTransfer()
        EnTransito2 --> ConDistribuidor : acceptTransfer()
        ConDistribuidor --> EnTransito3 : transfer()
        EnTransito3 --> ConDistribuidor : rejectTransfer()
        EnTransito3 --> ConCliente : acceptTransfer()
        ConCliente --> Redimida : redeemProduct()
    }
```

---

## 6. Flujo completo de la cadena (secuencia)

```mermaid
sequenceDiagram
    actor Admin
    actor Fundición
    actor Certificador
    actor Fábrica
    actor Distribuidor
    actor Cliente

    Note over Admin: Fase 0 — Despliegue
    Admin->>SC: deploy() → admin = msg.sender

    Note over Fundición,Cliente: Fase 1 — Registro de usuarios
    Fundición->>SC: requestUserRole("Acería Norte", "producer")
    Certificador->>SC: requestUserRole("CertTech S.A.", "certifier")
    Fábrica->>SC: requestUserRole("Laminados SA", "factory")
    Distribuidor->>SC: requestUserRole("DistroMetal", "retailer")
    Cliente->>SC: requestUserRole("Constructora XYZ", "consumer")
    Admin->>SC: changeStatusUser(x5, Approved)

    Note over Fundición: Fase 2 — Producción
    Fundición->>SC: createToken("Bobina Acero 4mm", 10000, features, 0)
    SC-->>Fundición: TokenCreated(tokenId=1)

    Note over Certificador: Fase 3 — Certificación
    Certificador->>SC: certifyToken(1, "ISO-9001-2024-00123")
    SC-->>Certificador: TokenCertified(1, certifier, certHash, timestamp)

    Note over Fundición,Fábrica: Fase 4 — Transferencia
    Fundición->>SC: transfer(fábrica, 1, 5000)
    Fábrica->>SC: acceptTransfer(1)

    Note over Fábrica: Fase 5 — Fabricación
    Fábrica->>SC: consumeRawMaterial(1, 500)
    Fábrica->>SC: createToken("Lámina CR-2024-001", 100, features, 1)

    Note over Fábrica,Distribuidor: Fase 6 — Distribución
    Fábrica->>SC: transfer(distribuidor, 2, 100)
    Distribuidor->>SC: acceptTransfer(2)

    Note over Distribuidor,Cliente: Fase 7 — Entrega
    Distribuidor->>SC: transfer(cliente, 2, 50)
    Cliente->>SC: acceptTransfer(3)

    Note over Cliente: Fase 8 — Redención
    Cliente->>SC: redeemProduct(2, 10)
    SC-->>Cliente: ProductRedeemed(2, cliente, 10, parentId=1)
```

---

## 7. Sistema de transferencias (estados)

```mermaid
stateDiagram-v2
    [*] --> Pendiente : transfer(to, tokenId, amount)\nbalance[from] -= amount

    Pendiente --> Aceptada : acceptTransfer()\nbalance[to] += amount
    Pendiente --> Rechazada : rejectTransfer()\nbalance[from] += amount

    Aceptada --> [*]
    Rechazada --> [*]
```

---

## 8. Sincronización sc/ → web/

```mermaid
graph LR
    subgraph SC["sc/  —  Foundry"]
        SOL["SupplyChain.sol"]
        FBUILD["forge build"]
        OUT["out/SupplyChain.json"]
    end

    subgraph WEB["web/  —  Next.js"]
        CONTR["contracts/SupplyChain.json · config.ts"]
        CTX["Web3Context.tsx"]
        SVC["Web3Service.ts"]
        HK["hooks/"]
        PAGES["app/"]
    end

    SOL --> FBUILD --> OUT
    OUT -->|"redeploy.sh\njq + sed"| CONTR
    CONTR --> CTX --> SVC --> HK --> PAGES
```
