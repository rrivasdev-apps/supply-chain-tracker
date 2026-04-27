// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title SupplyChain - Trazabilidad Industrial de Láminas de Hierro
/// @notice Gestiona el flujo completo: Fundición → Fábrica → Retailer → Consumer
/// @dev Los tokens con parentId == 0 son materias primas (láminas).
///      Los tokens con parentId > 0 son productos terminados (puertas, rejas, etc.)
contract SupplyChain {

    // =========================================================================
    // ENUMS
    // =========================================================================

    enum UserStatus    { Pending, Approved, Rejected, Canceled }
    enum TransferStatus { Pending, Accepted, Rejected }

    // =========================================================================
    // STRUCTS
    // =========================================================================

    struct Token {
        uint256 id;
        address creator;
        string  name;
        uint256 totalSupply;
        string  features;   // JSON libre: calidad lámina ó tipo/subtipo producto
        uint256 parentId;   // 0 = materia prima (lámina), >0 = producto terminado
        uint256 dateCreated;
        bool    burned;     // true cuando el Consumer redime el producto
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
        string     role;      // "producer" | "factory" | "retailer" | "consumer"
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

    // Índices auxiliares para consultas eficientes
    mapping(address => uint256[]) private _userTokenIds;
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
    event TokenUpdated(uint256 indexed tokenId, string name, string features);
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
    event UserRoleRequested(address indexed user, string role);
    event UserStatusChanged(address indexed user, UserStatus status);

    // =========================================================================
    // ERRORS  (gas-efficient vs require strings)
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
    error ParentTokenNotFound();
    error ParentTokenBurned();
    error NotFactory();
    error NotRawMaterial();
    error NotTokenCreator();

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
    /// @param role Uno de: "producer", "factory", "retailer", "consumer"
    function requestUserRole(string memory role) public {
        if (addressToUserId[msg.sender] != 0) revert AlreadyRegistered();
        _validateRole(role);

        uint256 uid = nextUserId++;
        users[uid] = User({
            id:          uid,
            userAddress: msg.sender,
            role:        role,
            status:      UserStatus.Pending
        });
        addressToUserId[msg.sender] = uid;

        emit UserRoleRequested(msg.sender, role);
    }

    /// @notice Admin aprueba, rechaza o cancela un usuario
    function changeStatusUser(address userAddress, UserStatus newStatus) public onlyAdmin {
        uint256 uid = addressToUserId[userAddress];
        if (uid == 0) revert UserNotFound();
        users[uid].status = newStatus;
        emit UserStatusChanged(userAddress, newStatus);
    }

    /// @notice Devuelve la info de un usuario por su address
    function getUserInfo(address userAddress) public view returns (
        uint256 id,
        address userAddr,
        string memory role,
        UserStatus status
    ) {
        uint256 uid = addressToUserId[userAddress];
        if (uid == 0) revert UserNotFound();
        User storage u = users[uid];
        return (u.id, u.userAddress, u.role, u.status);
    }

    /// @notice Verifica si una address es el admin
    function isAdmin(address userAddress) public view returns (bool) {
        return userAddress == admin;
    }

    // =========================================================================
    // TOKEN MANAGEMENT
    // =========================================================================

    /// @notice Crea un token (lámina o producto terminado)
    /// @dev Auto-mint: el totalSupply completo se asigna al creador al instante.
    ///      Para láminas (Producer): parentId = 0, features = JSON calidad libre.
    ///      Para productos (Factory): parentId = tokenId de la lámina usada.
    /// @param name          Nombre descriptivo del token
    /// @param totalSupply   Cantidad total (unidades de lámina o productos)
    /// @param features      JSON con características (calidad, tipo, subtipo, etc.)
    /// @param parentId      0 para materias primas, tokenId de lámina para productos
    function createToken(
        string memory name,
        uint256 totalSupply,
        string memory features,
        uint256 parentId
    ) public onlyApproved {
        if (totalSupply == 0) revert ZeroAmount();

        uint256 uid  = addressToUserId[msg.sender];
        string memory role = users[uid].role;

        // Solo producer puede crear materias primas (parentId == 0)
        if (parentId == 0) {
            if (!_strEq(role, "producer")) revert InvalidRole();
        } else {
            // Solo factory puede crear productos terminados (parentId > 0)
            if (!_strEq(role, "factory")) revert InvalidRole();
            // El token padre debe existir y no estar quemado
            if (tokens[parentId].id == 0) revert ParentTokenNotFound();
            if (tokens[parentId].burned)  revert ParentTokenBurned();
            // Nota: el balance del parentId es verificado por consumeRawMaterial()
            // antes de llamar a createToken() cuando se usa el sistema de estructuras.
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

        // AUTO-MINT: balance completo al creador
        t.balance[msg.sender] = totalSupply;
        _userTokenIds[msg.sender].push(tokenId);

        emit TokenCreated(tokenId, msg.sender, name, totalSupply, parentId);
    }

    /// @notice La fábrica consume materias primas al producir con una estructura (BOM)
    /// @dev Reduce el balance de la fábrica para el material consumido.
    ///      Llamar antes de createToken() para cada material en la estructura.
    /// @param tokenId  Token de materia prima (parentId == 0) a consumir
    /// @param amount   Cantidad a consumir (totalConsumo = amountPerUnit * unidadesAProducir)
    function consumeRawMaterial(uint256 tokenId, uint256 amount) public onlyApproved {
        if (amount == 0) revert ZeroAmount();
        uint256 uid = addressToUserId[msg.sender];
        if (!_strEq(users[uid].role, "factory")) revert NotFactory();
        if (tokens[tokenId].id == 0) revert TokenNotFound();
        if (tokens[tokenId].parentId != 0) revert NotRawMaterial();
        if (tokens[tokenId].balance[msg.sender] < amount) revert InsufficientBalance();

        tokens[tokenId].balance[msg.sender] -= amount;

        emit MaterialConsumed(msg.sender, tokenId, amount);
    }

    /// @notice El creador puede actualizar nombre y características de su token
    function updateToken(
        uint256 tokenId,
        string memory name,
        string memory features
    ) public onlyApproved {
        if (tokens[tokenId].id == 0)        revert TokenNotFound();
        if (tokens[tokenId].burned)          revert TokenAlreadyBurned();
        if (tokens[tokenId].creator != msg.sender) revert NotTokenCreator();

        tokens[tokenId].name     = name;
        tokens[tokenId].features = features;

        emit TokenUpdated(tokenId, name, features);
    }

    /// @notice Quema el token cuando el Consumer redime el producto
    /// @dev Solo el Consumer propietario puede hacer burn
    function burnToken(uint256 tokenId) public onlyApproved {
        if (tokens[tokenId].id == 0)  revert TokenNotFound();
        if (tokens[tokenId].burned)   revert TokenAlreadyBurned();

        uint256 uid = addressToUserId[msg.sender];
        if (!_strEq(users[uid].role, "consumer")) revert OnlyConsumerCanBurn();
        if (tokens[tokenId].balance[msg.sender] == 0) revert InsufficientBalance();

        uint256 bal = tokens[tokenId].balance[msg.sender];
        tokens[tokenId].balance[msg.sender] = 0;
        tokens[tokenId].burned = true;
        tokens[tokenId].totalSupply -= bal;

        emit TokenBurned(tokenId, msg.sender);
    }

    /// @notice Devuelve los campos públicos de un token (sin el mapping de balance)
    function getToken(uint256 tokenId) public view returns (
        uint256 id,
        address creator,
        string memory name,
        uint256 totalSupply,
        string memory features,
        uint256 parentId,
        uint256 dateCreated,
        bool    burned
    ) {
        if (tokens[tokenId].id == 0) revert TokenNotFound();
        Token storage t = tokens[tokenId];
        return (t.id, t.creator, t.name, t.totalSupply, t.features, t.parentId, t.dateCreated, t.burned);
    }

    /// @notice Balance de un token para una address específica
    function getTokenBalance(uint256 tokenId, address userAddress) public view returns (uint256) {
        return tokens[tokenId].balance[userAddress];
    }

    /// @notice Retorna todos los tokenIds que alguna vez tuvo o tiene el usuario
    function getUserTokens(address userAddress) public view returns (uint256[] memory) {
        return _userTokenIds[userAddress];
    }

    // =========================================================================
    // TRANSFER MANAGEMENT
    // =========================================================================

    /// @notice Inicia una transferencia de tokens entre actores
    /// @dev Flujo válido: producer→factory, factory→retailer, retailer→consumer
    ///      La transferencia queda en estado Pending hasta que el receptor acepte o rechace.
    function transfer(address to, uint256 tokenId, uint256 amount) public onlyApproved {
        if (amount == 0) revert ZeroAmount();
        if (to == msg.sender) revert CannotTransferToSelf();
        if (tokens[tokenId].id == 0) revert TokenNotFound();
        if (tokens[tokenId].burned)  revert TokenAlreadyBurned();
        if (tokens[tokenId].balance[msg.sender] < amount) revert InsufficientBalance();

        // Validar dirección del flujo según roles
        uint256 fromUid = addressToUserId[msg.sender];
        uint256 toUid   = addressToUserId[to];
        if (toUid == 0) revert UserNotFound();
        if (users[toUid].status != UserStatus.Approved) revert NotApproved();

        _validateTransferDirection(users[fromUid].role, users[toUid].role);

        // Descontar balance del emisor inmediatamente (queda en escrow implícito)
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

    /// @notice El receptor acepta la transferencia → recibe los tokens
    function acceptTransfer(uint256 transferId) public onlyApproved {
        Transfer storage tr = transfers[transferId];
        if (tr.id == 0) revert TransferNotFound();
        if (tr.status != TransferStatus.Pending) revert TransferNotPending();
        if (tr.to != msg.sender) revert NotTransferRecipient();

        tr.status = TransferStatus.Accepted;

        // Acreditar al receptor
        tokens[tr.tokenId].balance[msg.sender] += tr.amount;
        _addTokenIfNew(msg.sender, tr.tokenId);

        emit TransferAccepted(transferId);
    }

    /// @notice El receptor rechaza la transferencia → devuelve los tokens al emisor
    function rejectTransfer(uint256 transferId) public onlyApproved {
        Transfer storage tr = transfers[transferId];
        if (tr.id == 0) revert TransferNotFound();
        if (tr.status != TransferStatus.Pending) revert TransferNotPending();
        if (tr.to != msg.sender) revert NotTransferRecipient();

        tr.status = TransferStatus.Rejected;

        // Devolver tokens al emisor
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

    /// @notice Retorna todos los transferIds relacionados con un usuario
    function getUserTransfers(address userAddress) public view returns (uint256[] memory) {
        return _userTransferIds[userAddress];
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    function _validateRole(string memory role) internal pure {
        if (
            !_strEq(role, "producer") &&
            !_strEq(role, "factory")  &&
            !_strEq(role, "retailer") &&
            !_strEq(role, "consumer")
        ) revert InvalidRole();
    }

    /// @dev Valida que la dirección de la transferencia sea válida en el flujo
    function _validateTransferDirection(
        string memory fromRole,
        string memory toRole
    ) internal pure {
        bool valid = (
            (_strEq(fromRole, "producer") && _strEq(toRole, "factory"))  ||
            (_strEq(fromRole, "factory")  && _strEq(toRole, "retailer")) ||
            (_strEq(fromRole, "retailer") && _strEq(toRole, "consumer"))
        );
        if (!valid) revert InvalidTransferDirection();
    }

    /// @dev Agrega tokenId al índice del usuario solo si no está ya
    function _addTokenIfNew(address user, uint256 tokenId) internal {
        uint256[] storage ids = _userTokenIds[user];
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == tokenId) return;
        }
        ids.push(tokenId);
    }

    /// @dev Comparación de strings en Solidity via keccak256
    function _strEq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
