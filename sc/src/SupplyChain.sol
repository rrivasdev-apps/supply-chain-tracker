// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title SupplyChain — Metal Trace
/// @notice Flujo: Fundición (producer) → Certificador (certifier) → Fábrica (factory)
///         → Distribuidor (retailer) → Cliente (consumer)
/// @dev Bobinas: parentId == 0, deben estar certified == true para transferirse.
///      Láminas: parentId > 0, no requieren certificación.
contract SupplyChain {

    // =========================================================================
    // ENUMS
    // =========================================================================

    enum UserStatus     { Pending, Approved, Rejected, Canceled }
    enum TransferStatus { Pending, Accepted, Rejected }

    // =========================================================================
    // STRUCTS
    // =========================================================================

    struct Token {
        uint256 id;
        address creator;
        string  name;
        uint256 totalSupply;
        string  features;    // JSON libre: características del lote
        uint256 parentId;    // 0 = Bobina (materia prima), >0 = Lámina
        uint256 dateCreated;
        bool    burned;
        bool    certified;   // Solo aplica a bobinas (parentId == 0)
        mapping(address => uint256) balance;
    }

    struct Transfer {
        uint256        id;
        address        from;
        address        to;
        uint256        tokenId;
        uint256        dateCreated;
        uint256        amount;
        TransferStatus status;
    }

    struct User {
        uint256    id;
        address    userAddress;
        string     name;    // Nombre o razón social
        string     role;    // "producer" | "certifier" | "factory" | "retailer" | "consumer"
        UserStatus status;
    }

    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    address public admin;

    uint256 public nextTokenId    = 1;
    uint256 public nextTransferId = 1;
    uint256 public nextUserId     = 1;

    mapping(uint256 => Token)    public tokens;
    mapping(uint256 => Transfer) public transfers;
    mapping(uint256 => User)     public users;
    mapping(address => uint256)  public addressToUserId;

    // ── Índices de eficiencia ─────────────────────────────────────────────────
    // Todos los tokenIds en orden cronológico de creación
    uint256[] private _allTokenIds;

    // Todos los userIds en orden de registro
    uint256[] private _allUserIds;

    // TokenIds por address (para filtrar producción de un productor específico)
    mapping(address => uint256[]) private _userTokenIds;

    // Addresses por rol (para dropdowns de transferencia y consultas del certificador)
    mapping(string => address[]) private _userAddressesByRole;

    // TransferIds relacionados con cada usuario
    mapping(address => uint256[]) private _userTransferIds;

    // =========================================================================
    // EVENTS
    // =========================================================================

    event TokenCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string  name,
        uint256 totalSupply,
        uint256 parentId
    );
    event TokenBurned(uint256 indexed tokenId, address indexed burner);
    event ProductRedeemed(uint256 indexed tokenId, address indexed consumer, uint256 amount, uint256 indexed parentId);
    event TokenUpdated(uint256 indexed tokenId, string name, string features);
    event TokenCertified(
        uint256 indexed tokenId,
        address indexed certifier,
        string  certHash,
        uint256 date
    );
    event MaterialConsumed(address indexed factory, uint256 indexed tokenId, uint256 amount);
    event TransferRequested(
        uint256 indexed transferId,
        address indexed from,
        address indexed to,
        uint256 tokenId,
        uint256 amount
    );
    event TransferAccepted(uint256 indexed transferId);
    event TransferRejected(uint256 indexed transferId);
    event UserRoleRequested(address indexed user, string name, string role);
    event UserStatusChanged(address indexed user, UserStatus status);

    // =========================================================================
    // ERRORS
    // =========================================================================

    error NotAdmin();
    error NotApproved();
    error InvalidRole();
    error AlreadyRegistered();
    error UserNotFound();
    error TokenNotFound();
    error TransferNotFound();
    error InsufficientBalance();
    error InvalidTransferDirection();
    error TransferNotPending();
    error NotTransferRecipient();
    error CannotTransferToSelf();
    error ZeroAmount();
    error TokenAlreadyBurned();
    error OnlyConsumerCanBurn();
    error NotProduct();            // solo láminas (parentId > 0) pueden redimirse parcialmente
    error ParentTokenNotFound();
    error ParentTokenBurned();
    error NotFactory();
    error NotRawMaterial();
    error NotTokenCreator();
    error TokenNotCertified();      // bobina aún no certificada, no puede transferirse
    error TokenNotCertifiable();    // no es bobina, o ya está certificada
    error NotCertifier();           // caller no tiene rol certifier

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    constructor() {
        admin = msg.sender;
    }

    // =========================================================================
    // MODIFIERS
    // =========================================================================

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyApproved() {
        uint256 uid = addressToUserId[msg.sender];
        if (uid == 0) revert NotApproved();
        if (users[uid].status != UserStatus.Approved) revert NotApproved();
        _;
    }

    // =========================================================================
    // USER MANAGEMENT
    // =========================================================================

    /// @notice El usuario solicita un rol en el sistema
    /// @param name Nombre o razón social del solicitante
    /// @param role Uno de: "producer", "certifier", "factory", "retailer", "consumer"
    function requestUserRole(string memory name, string memory role) public {
        if (addressToUserId[msg.sender] != 0) revert AlreadyRegistered();
        _validateRole(role);

        uint256 uid = nextUserId++;
        users[uid] = User({
            id:          uid,
            userAddress: msg.sender,
            name:        name,
            role:        role,
            status:      UserStatus.Pending
        });
        addressToUserId[msg.sender] = uid;

        _allUserIds.push(uid);
        _userAddressesByRole[role].push(msg.sender);

        emit UserRoleRequested(msg.sender, name, role);
    }

    /// @notice Admin aprueba, rechaza o cancela un usuario
    function changeStatusUser(address userAddress, UserStatus newStatus) public onlyAdmin {
        uint256 uid = addressToUserId[userAddress];
        if (uid == 0) revert UserNotFound();
        users[uid].status = newStatus;
        emit UserStatusChanged(userAddress, newStatus);
    }

    /// @notice Devuelve la info completa de un usuario por su address
    function getUserInfo(address userAddress) public view returns (
        uint256 id,
        address userAddr,
        string memory name,
        string memory role,
        UserStatus status
    ) {
        uint256 uid = addressToUserId[userAddress];
        if (uid == 0) revert UserNotFound();
        User storage u = users[uid];
        return (u.id, u.userAddress, u.name, u.role, u.status);
    }

    /// @notice Verifica si una address es el admin
    function isAdmin(address userAddress) public view returns (bool) {
        return userAddress == admin;
    }

    // =========================================================================
    // TOKEN MANAGEMENT
    // =========================================================================

    /// @notice Crea un token (Bobina o Lámina)
    /// @param name        Nombre del lote
    /// @param totalSupply Cantidad total (escalada ×100 para Bobinas, entera para Láminas)
    /// @param features    JSON libre con características
    /// @param parentId    0 para Bobinas, tokenId de la Bobina origen para Láminas
    function createToken(
        string memory name,
        uint256 totalSupply,
        string memory features,
        uint256 parentId
    ) public onlyApproved {
        if (totalSupply == 0) revert ZeroAmount();

        uint256 uid  = addressToUserId[msg.sender];
        string memory role = users[uid].role;

        if (parentId == 0) {
            // Solo Fundición (producer) crea Bobinas
            if (!_strEq(role, "producer")) revert InvalidRole();
        } else {
            // Solo Fábrica (factory) crea Láminas
            if (!_strEq(role, "factory")) revert InvalidRole();
            if (tokens[parentId].id == 0)  revert ParentTokenNotFound();
            if (tokens[parentId].burned)   revert ParentTokenBurned();
        }

        uint256 tokenId = nextTokenId++;
        Token storage t = tokens[tokenId];
        t.id          = tokenId;
        t.creator     = msg.sender;
        t.name        = name;
        t.totalSupply = totalSupply;
        t.features    = features;
        t.parentId    = parentId;
        t.dateCreated = block.timestamp;
        t.burned      = false;
        t.certified   = false;  // Las bobinas nacen sin certificar

        t.balance[msg.sender] = totalSupply;

        _allTokenIds.push(tokenId);
        _userTokenIds[msg.sender].push(tokenId);

        emit TokenCreated(tokenId, msg.sender, name, totalSupply, parentId);
    }

    /// @notice El Certificador certifica un lote de bobinas
    /// @param tokenId  ID del token Bobina (parentId debe ser 0)
    /// @param certHash Hash del documento de certificación (SHA256 del PDF, etc.)
    function certifyToken(uint256 tokenId, string memory certHash) public onlyApproved {
        uint256 uid = addressToUserId[msg.sender];
        if (!_strEq(users[uid].role, "certifier")) revert NotCertifier();
        if (tokens[tokenId].id == 0)               revert TokenNotFound();
        if (tokens[tokenId].parentId != 0)         revert TokenNotCertifiable();
        if (tokens[tokenId].certified)             revert TokenNotCertifiable();

        tokens[tokenId].certified = true;
        emit TokenCertified(tokenId, msg.sender, certHash, block.timestamp);
    }

    /// @notice La Fábrica consume bobinas al producir láminas
    /// @param tokenId ID del token Bobina a consumir
    /// @param amount  Cantidad a descontar (escalada ×100)
    function consumeRawMaterial(uint256 tokenId, uint256 amount) public onlyApproved {
        if (amount == 0) revert ZeroAmount();
        uint256 uid = addressToUserId[msg.sender];
        if (!_strEq(users[uid].role, "factory")) revert NotFactory();
        if (tokens[tokenId].id == 0)             revert TokenNotFound();
        if (tokens[tokenId].parentId != 0)       revert NotRawMaterial();
        if (tokens[tokenId].balance[msg.sender] < amount) revert InsufficientBalance();

        tokens[tokenId].balance[msg.sender] -= amount;

        emit MaterialConsumed(msg.sender, tokenId, amount);
    }

    /// @notice El creador actualiza nombre y características de su token
    function updateToken(
        uint256 tokenId,
        string memory name,
        string memory features
    ) public onlyApproved {
        if (tokens[tokenId].id == 0)                   revert TokenNotFound();
        if (tokens[tokenId].burned)                    revert TokenAlreadyBurned();
        if (tokens[tokenId].creator != msg.sender)     revert NotTokenCreator();

        tokens[tokenId].name     = name;
        tokens[tokenId].features = features;

        emit TokenUpdated(tokenId, name, features);
    }

    /// @notice El Cliente quema su token de Lámina al redimir
    function burnToken(uint256 tokenId) public onlyApproved {
        if (tokens[tokenId].id == 0)  revert TokenNotFound();
        if (tokens[tokenId].burned)   revert TokenAlreadyBurned();

        uint256 uid = addressToUserId[msg.sender];
        if (!_strEq(users[uid].role, "consumer")) revert OnlyConsumerCanBurn();
        if (tokens[tokenId].balance[msg.sender] == 0) revert InsufficientBalance();

        uint256 bal = tokens[tokenId].balance[msg.sender];
        tokens[tokenId].balance[msg.sender] = 0;
        tokens[tokenId].burned      = true;
        tokens[tokenId].totalSupply -= bal;

        emit TokenBurned(tokenId, msg.sender);
    }

    /// @notice El Consumer redime una cantidad parcial de láminas.
    ///         Reduce el balance del consumer, el totalSupply de la lámina
    ///         y el totalSupply de la bobina padre en la misma cantidad.
    /// @param tokenId ID del token producto (lámina, parentId > 0)
    /// @param amount  Cantidad a redimir
    function redeemProduct(uint256 tokenId, uint256 amount) public onlyApproved {
        if (tokens[tokenId].id == 0)                       revert TokenNotFound();
        if (tokens[tokenId].burned)                        revert TokenAlreadyBurned();
        if (amount == 0)                                   revert ZeroAmount();
        if (tokens[tokenId].parentId == 0)                 revert NotProduct();

        uint256 uid = addressToUserId[msg.sender];
        if (!_strEq(users[uid].role, "consumer"))          revert OnlyConsumerCanBurn();
        if (tokens[tokenId].balance[msg.sender] < amount)  revert InsufficientBalance();

        tokens[tokenId].balance[msg.sender] -= amount;
        tokens[tokenId].totalSupply         -= amount;

        if (tokens[tokenId].balance[msg.sender] == 0) {
            tokens[tokenId].burned = true;
        }

        uint256 parentId = tokens[tokenId].parentId;
        if (tokens[parentId].totalSupply >= amount) {
            tokens[parentId].totalSupply -= amount;
        }

        emit ProductRedeemed(tokenId, msg.sender, amount, parentId);
    }

    /// @notice Devuelve los campos públicos de un token
    function getToken(uint256 tokenId) public view returns (
        uint256 id,
        address creator,
        string memory name,
        uint256 totalSupply,
        string memory features,
        uint256 parentId,
        uint256 dateCreated,
        bool    burned,
        bool    certified
    ) {
        if (tokens[tokenId].id == 0) revert TokenNotFound();
        Token storage t = tokens[tokenId];
        return (t.id, t.creator, t.name, t.totalSupply, t.features,
                t.parentId, t.dateCreated, t.burned, t.certified);
    }

    /// @notice Balance de un token para una address específica
    function getTokenBalance(uint256 tokenId, address userAddress) public view returns (uint256) {
        return tokens[tokenId].balance[userAddress];
    }

    // =========================================================================
    // TRANSFER MANAGEMENT
    // =========================================================================

    /// @notice Inicia una transferencia de tokens
    /// @dev Flujo válido: producer→factory, factory→retailer, retailer→consumer
    ///      Las bobinas (parentId==0) deben estar certificadas para transferirse.
    function transfer(address to, uint256 tokenId, uint256 amount) public onlyApproved {
        if (amount == 0)      revert ZeroAmount();
        if (to == msg.sender) revert CannotTransferToSelf();
        if (tokens[tokenId].id == 0) revert TokenNotFound();
        if (tokens[tokenId].burned)  revert TokenAlreadyBurned();

        // Validar roles primero (permisos antes que recursos)
        uint256 fromUid = addressToUserId[msg.sender];
        uint256 toUid   = addressToUserId[to];
        if (toUid == 0) revert UserNotFound();
        if (users[toUid].status != UserStatus.Approved) revert NotApproved();
        _validateTransferDirection(users[fromUid].role, users[toUid].role);

        // Verificar certificación y balance
        if (tokens[tokenId].parentId == 0 && !tokens[tokenId].certified)
            revert TokenNotCertified();
        if (tokens[tokenId].balance[msg.sender] < amount) revert InsufficientBalance();

        tokens[tokenId].balance[msg.sender] -= amount;

        uint256 transferId = nextTransferId++;
        transfers[transferId] = Transfer({
            id:          transferId,
            from:        msg.sender,
            to:          to,
            tokenId:     tokenId,
            dateCreated: block.timestamp,
            amount:      amount,
            status:      TransferStatus.Pending
        });

        _userTransferIds[msg.sender].push(transferId);
        _userTransferIds[to].push(transferId);

        emit TransferRequested(transferId, msg.sender, to, tokenId, amount);
    }

    /// @notice El receptor acepta la transferencia
    function acceptTransfer(uint256 transferId) public onlyApproved {
        Transfer storage tr = transfers[transferId];
        if (tr.id == 0)                          revert TransferNotFound();
        if (tr.status != TransferStatus.Pending) revert TransferNotPending();
        if (tr.to != msg.sender)                 revert NotTransferRecipient();

        tr.status = TransferStatus.Accepted;
        tokens[tr.tokenId].balance[msg.sender] += tr.amount;
        _addTokenIfNew(msg.sender, tr.tokenId);

        emit TransferAccepted(transferId);
    }

    /// @notice El receptor rechaza la transferencia — devuelve tokens al emisor
    function rejectTransfer(uint256 transferId) public onlyApproved {
        Transfer storage tr = transfers[transferId];
        if (tr.id == 0)                          revert TransferNotFound();
        if (tr.status != TransferStatus.Pending) revert TransferNotPending();
        if (tr.to != msg.sender)                 revert NotTransferRecipient();

        tr.status = TransferStatus.Rejected;
        tokens[tr.tokenId].balance[tr.from] += tr.amount;

        emit TransferRejected(transferId);
    }

    /// @notice Devuelve los datos de una transferencia
    function getTransfer(uint256 transferId) public view returns (
        uint256 id,
        address from,
        address to,
        uint256 tokenId,
        uint256 dateCreated,
        uint256 amount,
        TransferStatus status
    ) {
        if (transfers[transferId].id == 0) revert TransferNotFound();
        Transfer storage tr = transfers[transferId];
        return (tr.id, tr.from, tr.to, tr.tokenId, tr.dateCreated, tr.amount, tr.status);
    }

    // =========================================================================
    // INDEX QUERIES  (eficientes — O(1) por call, sin iteración on-chain)
    // =========================================================================

    /// @notice Todos los tokenIds en orden cronológico de creación
    function getAllTokenIds() public view returns (uint256[] memory) {
        return _allTokenIds;
    }

    /// @notice TokenIds de un usuario específico en orden cronológico
    function getUserTokenIds(address userAddress) public view returns (uint256[] memory) {
        return _userTokenIds[userAddress];
    }

    /// @notice Todos los userIds en orden de registro
    function getAllUserIds() public view returns (uint256[] memory) {
        return _allUserIds;
    }

    /// @notice Addresses de todos los usuarios con un rol específico
    /// @param role Uno de: "producer", "certifier", "factory", "retailer", "consumer"
    function getUserAddressesByRole(string memory role) public view returns (address[] memory) {
        return _userAddressesByRole[role];
    }

    /// @notice TransferIds relacionados con un usuario
    function getUserTransfers(address userAddress) public view returns (uint256[] memory) {
        return _userTransferIds[userAddress];
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    function _validateRole(string memory role) internal pure {
        if (
            !_strEq(role, "producer")  &&
            !_strEq(role, "certifier") &&
            !_strEq(role, "factory")   &&
            !_strEq(role, "retailer")  &&
            !_strEq(role, "consumer")
        ) revert InvalidRole();
    }

    function _validateTransferDirection(
        string memory fromRole,
        string memory toRole
    ) internal pure {
        bool valid = (
            (_strEq(fromRole, "producer")  && _strEq(toRole, "factory"))  ||
            (_strEq(fromRole, "factory")   && _strEq(toRole, "retailer")) ||
            (_strEq(fromRole, "retailer")  && _strEq(toRole, "consumer"))
        );
        if (!valid) revert InvalidTransferDirection();
    }

    function _addTokenIfNew(address user, uint256 tokenId) internal {
        uint256[] storage ids = _userTokenIds[user];
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == tokenId) return;
        }
        ids.push(tokenId);
    }

    function _strEq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
