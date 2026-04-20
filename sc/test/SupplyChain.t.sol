// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/SupplyChain.sol";

/// @title SupplyChainTest
/// @notice Suite completa de tests para el contrato SupplyChain
/// @dev Ejecutar con: forge test -vvv
///      Para test específico: forge test --match-test <nombre> -vvv
contract SupplyChainTest is Test {

    SupplyChain public sc;

    // Cuentas de prueba (simulan las wallets de Anvil)
    address public adminAddr   = address(0x1);
    address public producerAddr = address(0x2);
    address public factoryAddr  = address(0x3);
    address public retailerAddr = address(0x4);
    address public consumerAddr = address(0x5);
    address public stranger     = address(0x6); // no registrado

    // =========================================================================
    // SETUP
    // =========================================================================

    function setUp() public {
        // Desplegar como admin
        vm.prank(adminAddr);
        sc = new SupplyChain();

        // Registrar y aprobar todos los actores del flujo
        _registerAndApprove(producerAddr, "producer");
        _registerAndApprove(factoryAddr,  "factory");
        _registerAndApprove(retailerAddr, "retailer");
        _registerAndApprove(consumerAddr, "consumer");
    }

    // =========================================================================
    // HELPERS INTERNOS
    // =========================================================================

    function _registerAndApprove(address user, string memory role) internal {
        vm.prank(user);
        sc.requestUserRole(role);
        vm.prank(adminAddr);
        sc.changeStatusUser(user, SupplyChain.UserStatus.Approved);
    }

    /// @dev Crea una lámina de hierro como producer y retorna su tokenId
    function _createLamina(uint256 supply, string memory features) internal returns (uint256) {
        vm.prank(producerAddr);
        sc.createToken("Lamina Hierro", supply, features, 0);
        return sc.nextTokenId() - 1;
    }

    /// @dev Transfiere lámina de producer a factory y devuelve el transferId
    function _transferLaminaToFactory(uint256 tokenId, uint256 amount) internal returns (uint256) {
        vm.prank(producerAddr);
        sc.transfer(factoryAddr, tokenId, amount);
        return sc.nextTransferId() - 1;
    }

    /// @dev Acepta la transferencia como el receptor indicado
    function _accept(address recipient, uint256 transferId) internal {
        vm.prank(recipient);
        sc.acceptTransfer(transferId);
    }

    /// @dev Flujo completo hasta que factory tiene balance de una lámina
    function _setupFactoryWithLamina(uint256 supply) internal returns (uint256 tokenId) {
        tokenId = _createLamina(supply, '{"calidad":"A","espesor":"2mm"}');
        uint256 tId = _transferLaminaToFactory(tokenId, supply);
        _accept(factoryAddr, tId);
    }

    // =========================================================================
    // TESTS: GESTIÓN DE USUARIOS
    // =========================================================================

    function testUserRegistration() public {
        address newUser = address(0x99);
        vm.prank(newUser);
        sc.requestUserRole("retailer");

        (,, string memory role, SupplyChain.UserStatus status) = sc.getUserInfo(newUser);
        assertEq(role, "retailer");
        assertEq(uint(status), uint(SupplyChain.UserStatus.Pending));
    }

    function testAdminApproveUser() public {
        address newUser = address(0x100);
        vm.prank(newUser);
        sc.requestUserRole("consumer");

        vm.prank(adminAddr);
        sc.changeStatusUser(newUser, SupplyChain.UserStatus.Approved);

        (,,, SupplyChain.UserStatus status) = sc.getUserInfo(newUser);
        assertEq(uint(status), uint(SupplyChain.UserStatus.Approved));
    }

    function testAdminRejectUser() public {
        address newUser = address(0x101);
        vm.prank(newUser);
        sc.requestUserRole("producer");

        vm.prank(adminAddr);
        sc.changeStatusUser(newUser, SupplyChain.UserStatus.Rejected);

        (,,, SupplyChain.UserStatus status) = sc.getUserInfo(newUser);
        assertEq(uint(status), uint(SupplyChain.UserStatus.Rejected));
    }

    function testUserStatusChanges() public {
        // Pending → Approved → Canceled
        address newUser = address(0x102);
        vm.prank(newUser);
        sc.requestUserRole("factory");

        vm.prank(adminAddr);
        sc.changeStatusUser(newUser, SupplyChain.UserStatus.Approved);
        (,,, SupplyChain.UserStatus s1) = sc.getUserInfo(newUser);
        assertEq(uint(s1), uint(SupplyChain.UserStatus.Approved));

        vm.prank(adminAddr);
        sc.changeStatusUser(newUser, SupplyChain.UserStatus.Canceled);
        (,,, SupplyChain.UserStatus s2) = sc.getUserInfo(newUser);
        assertEq(uint(s2), uint(SupplyChain.UserStatus.Canceled));
    }

    function testOnlyApprovedUsersCanOperate() public {
        address pendingUser = address(0x103);
        vm.prank(pendingUser);
        sc.requestUserRole("producer");
        // Sin aprobar → no puede crear token
        vm.prank(pendingUser);
        vm.expectRevert(SupplyChain.NotApproved.selector);
        sc.createToken("Test", 10, "{}", 0);
    }

    function testGetUserInfo() public {
        (uint256 id, address addr, string memory role, SupplyChain.UserStatus status)
            = sc.getUserInfo(producerAddr);
        assertEq(id, sc.addressToUserId(producerAddr));
        assertEq(addr, producerAddr);
        assertEq(role, "producer");
        assertEq(uint(status), uint(SupplyChain.UserStatus.Approved));
    }

    function testIsAdmin() public {
        assertTrue(sc.isAdmin(adminAddr));
        assertFalse(sc.isAdmin(producerAddr));
    }

    function testAlreadyRegisteredReverts() public {
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.AlreadyRegistered.selector);
        sc.requestUserRole("producer");
    }

    function testInvalidRoleReverts() public {
        address newUser = address(0x104);
        vm.prank(newUser);
        vm.expectRevert(SupplyChain.InvalidRole.selector);
        sc.requestUserRole("superhero");
    }

    function testOnlyAdminCanChangeStatus() public {
        vm.prank(stranger);
        vm.expectRevert(SupplyChain.NotAdmin.selector);
        sc.changeStatusUser(producerAddr, SupplyChain.UserStatus.Rejected);
    }

    // =========================================================================
    // TESTS: CREACIÓN DE TOKENS (LÁMINAS)
    // =========================================================================

    function testCreateTokenByProducer() public {
        uint256 tokenId = _createLamina(100, '{"calidad":"A","espesor":"2mm","lote":"L001"}');
        (uint256 id,,, uint256 supply,,, , bool burned) = sc.getToken(tokenId);
        assertEq(id, tokenId);
        assertEq(supply, 100);
        assertFalse(burned);
        // Auto-mint: producer tiene el balance completo
        assertEq(sc.getTokenBalance(tokenId, producerAddr), 100);
    }

    function testAutoMintOnCreate() public {
        uint256 tokenId = _createLamina(50, "{}");
        assertEq(sc.getTokenBalance(tokenId, producerAddr), 50);
    }

    function testCreateTokenByFactory() public {
        uint256 laminaId = _setupFactoryWithLamina(10);
        // Factory crea producto terminado con parentId = laminaId
        vm.prank(factoryAddr);
        sc.createToken("Puerta Blindada", 5, '{"type":"puerta","subtipo":"blindada"}', laminaId);
        uint256 prodId = sc.nextTokenId() - 1;
        (,,,,,uint256 parentId,,) = sc.getToken(prodId);
        assertEq(parentId, laminaId);
        assertEq(sc.getTokenBalance(prodId, factoryAddr), 5);
    }

    function testProducerCannotCreateProductToken() public {
        // Producer no puede crear tokens con parentId > 0
        uint256 laminaId = _createLamina(10, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.InvalidRole.selector);
        sc.createToken("Intento incorrecto", 5, "{}", laminaId);
    }

    function testFactoryCannotCreateRawMaterial() public {
        // Factory no puede crear tokens con parentId == 0
        vm.prank(factoryAddr);
        vm.expectRevert(SupplyChain.InvalidRole.selector);
        sc.createToken("No deberia", 10, "{}", 0);
    }

    function testTokenWithParentId() public {
        uint256 laminaId = _setupFactoryWithLamina(20);
        vm.prank(factoryAddr);
        sc.createToken("Reja Ornamental", 3, '{"type":"reja","subtipo":"ornamental"}', laminaId);
        uint256 rejaId = sc.nextTokenId() - 1;
        (,,,,,uint256 parentId,,) = sc.getToken(rejaId);
        assertEq(parentId, laminaId);
    }

    function testTokenMetadata() public {
        string memory features = '{"calidad":"A+","espesor":"3mm","certificado":"ISO9001"}';
        uint256 tokenId = _createLamina(10, features);
        (,,,, string memory feat,,,) = sc.getToken(tokenId);
        assertEq(feat, features);
    }

    function testTokenBalance() public {
        uint256 tokenId = _createLamina(200, "{}");
        assertEq(sc.getTokenBalance(tokenId, producerAddr), 200);
        assertEq(sc.getTokenBalance(tokenId, factoryAddr),  0);
    }

    function testGetToken() public {
        uint256 tokenId = _createLamina(10, "{}");
        (uint256 id, address creator, string memory name,,,,, ) = sc.getToken(tokenId);
        assertEq(id, tokenId);
        assertEq(creator, producerAddr);
        assertEq(name, "Lamina Hierro");
    }

    function testGetUserTokens() public {
        _createLamina(10, "{}");
        _createLamina(20, "{}");
        uint256[] memory ids = sc.getUserTokens(producerAddr);
        assertEq(ids.length, 2);
    }

    function testZeroSupplyReverts() public {
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.ZeroAmount.selector);
        sc.createToken("Zero", 0, "{}", 0);
    }

    function testCreateWithNonExistentParentReverts() public {
        vm.prank(factoryAddr);
        vm.expectRevert(SupplyChain.ParentTokenNotFound.selector);
        sc.createToken("Ghost product", 5, "{}", 9999);
    }

    function testCreateWithoutBalanceOfParentReverts() public {
        // Lámina existe pero factory no tiene balance (no ha recibido transferencia)
        uint256 laminaId = _createLamina(10, "{}");
        vm.prank(factoryAddr);
        vm.expectRevert(SupplyChain.InsufficientBalance.selector);
        sc.createToken("Producto sin lamina", 5, "{}", laminaId);
    }

    // =========================================================================
    // TESTS: TRANSFERENCIAS
    // =========================================================================

    function testTransferFromProducerToFactory() public {
        uint256 tokenId = _createLamina(100, "{}");
        vm.prank(producerAddr);
        sc.transfer(factoryAddr, tokenId, 50);
        uint256 tId = sc.nextTransferId() - 1;

        (,address from, address to,,, uint256 amount, SupplyChain.TransferStatus status)
            = sc.getTransfer(tId);
        assertEq(from, producerAddr);
        assertEq(to,   factoryAddr);
        assertEq(amount, 50);
        assertEq(uint(status), uint(SupplyChain.TransferStatus.Pending));
        // Balance del sender se descuenta al iniciar la transferencia
        assertEq(sc.getTokenBalance(tokenId, producerAddr), 50);
    }

    function testAcceptTransfer() public {
        uint256 tokenId = _createLamina(100, "{}");
        uint256 tId = _transferLaminaToFactory(tokenId, 60);

        _accept(factoryAddr, tId);

        (,,,,,, SupplyChain.TransferStatus status) = sc.getTransfer(tId);
        assertEq(uint(status), uint(SupplyChain.TransferStatus.Accepted));
        assertEq(sc.getTokenBalance(tokenId, factoryAddr), 60);
        assertEq(sc.getTokenBalance(tokenId, producerAddr), 40);
    }

    function testRejectTransfer() public {
        uint256 tokenId = _createLamina(100, "{}");
        uint256 tId = _transferLaminaToFactory(tokenId, 30);

        vm.prank(factoryAddr);
        sc.rejectTransfer(tId);

        (,,,,,, SupplyChain.TransferStatus status) = sc.getTransfer(tId);
        assertEq(uint(status), uint(SupplyChain.TransferStatus.Rejected));
        // Tokens devueltos al emisor
        assertEq(sc.getTokenBalance(tokenId, producerAddr), 100);
        assertEq(sc.getTokenBalance(tokenId, factoryAddr),  0);
    }

    function testTransferFromFactoryToRetailer() public {
        uint256 laminaId = _setupFactoryWithLamina(10);
        vm.prank(factoryAddr);
        sc.createToken("Puerta", 3, '{"type":"puerta"}', laminaId);
        uint256 prodId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, prodId, 2);
        uint256 tId = sc.nextTransferId() - 1;
        _accept(retailerAddr, tId);

        assertEq(sc.getTokenBalance(prodId, retailerAddr), 2);
    }

    function testTransferFromRetailerToConsumer() public {
        uint256 laminaId = _setupFactoryWithLamina(10);
        vm.prank(factoryAddr);
        sc.createToken("Marco", 5, '{"type":"marco"}', laminaId);
        uint256 prodId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, prodId, 5);
        _accept(retailerAddr, sc.nextTransferId() - 1);

        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, prodId, 3);
        _accept(consumerAddr, sc.nextTransferId() - 1);

        assertEq(sc.getTokenBalance(prodId, consumerAddr), 3);
    }

    function testTransferInsufficientBalance() public {
        uint256 tokenId = _createLamina(10, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.InsufficientBalance.selector);
        sc.transfer(factoryAddr, tokenId, 100);
    }

    function testGetTransfer() public {
        uint256 tokenId = _createLamina(10, "{}");
        _transferLaminaToFactory(tokenId, 10);
        uint256 tId = sc.nextTransferId() - 1;

        (uint256 id, address from, address to, uint256 tknId,,,) = sc.getTransfer(tId);
        assertEq(id,    tId);
        assertEq(from,  producerAddr);
        assertEq(to,    factoryAddr);
        assertEq(tknId, tokenId);
    }

    function testGetUserTransfers() public {
        uint256 tokenId = _createLamina(100, "{}");
        _transferLaminaToFactory(tokenId, 10);
        _transferLaminaToFactory(tokenId, 20);
        uint256[] memory producerTxs = sc.getUserTransfers(producerAddr);
        uint256[] memory factoryTxs  = sc.getUserTransfers(factoryAddr);
        assertEq(producerTxs.length, 2);
        assertEq(factoryTxs.length,  2);
    }

    // =========================================================================
    // TESTS: VALIDACIONES Y PERMISOS
    // =========================================================================

    function testInvalidRoleTransfer() public {
        // Producer no puede transferir a Consumer directamente
        uint256 tokenId = _createLamina(10, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.InvalidTransferDirection.selector);
        sc.transfer(consumerAddr, tokenId, 5);
    }

    function testUnapprovedUserCannotCreateToken() public {
        address pending = address(0x200);
        vm.prank(pending);
        sc.requestUserRole("producer");
        vm.prank(pending);
        vm.expectRevert(SupplyChain.NotApproved.selector);
        sc.createToken("Test", 10, "{}", 0);
    }

    function testUnapprovedUserCannotTransfer() public {
        uint256 tokenId = _createLamina(10, "{}");
        address pending = address(0x201);
        vm.prank(pending);
        sc.requestUserRole("factory");
        vm.prank(pending);
        vm.expectRevert(SupplyChain.NotApproved.selector);
        sc.transfer(factoryAddr, tokenId, 5);
    }

    function testConsumerCannotTransfer() public {
        // Consumer no puede iniciar transferencias (no hay destino válido en el flujo)
        uint256 laminaId = _setupFactoryWithLamina(10);
        vm.prank(factoryAddr);
        sc.createToken("Puerta", 2, '{"type":"puerta"}', laminaId);
        uint256 prodId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, prodId, 2);
        _accept(retailerAddr, sc.nextTransferId() - 1);

        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, prodId, 2);
        _accept(consumerAddr, sc.nextTransferId() - 1);

        // Consumer intenta transferir a alguien → dirección inválida
        vm.prank(consumerAddr);
        vm.expectRevert(SupplyChain.InvalidTransferDirection.selector);
        sc.transfer(retailerAddr, prodId, 1);
    }

    function testTransferToSameAddress() public {
        uint256 tokenId = _createLamina(10, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.CannotTransferToSelf.selector);
        sc.transfer(producerAddr, tokenId, 5);
    }

    // =========================================================================
    // TESTS: CASOS EDGE
    // =========================================================================

    function testTransferZeroAmount() public {
        uint256 tokenId = _createLamina(10, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.ZeroAmount.selector);
        sc.transfer(factoryAddr, tokenId, 0);
    }

    function testTransferNonExistentToken() public {
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.TokenNotFound.selector);
        sc.transfer(factoryAddr, 9999, 1);
    }

    function testAcceptNonExistentTransfer() public {
        vm.prank(factoryAddr);
        vm.expectRevert(SupplyChain.TransferNotFound.selector);
        sc.acceptTransfer(9999);
    }

    function testDoubleAcceptTransfer() public {
        uint256 tokenId = _createLamina(10, "{}");
        uint256 tId = _transferLaminaToFactory(tokenId, 5);
        _accept(factoryAddr, tId);

        vm.prank(factoryAddr);
        vm.expectRevert(SupplyChain.TransferNotPending.selector);
        sc.acceptTransfer(tId);
    }

    function testTransferAfterRejection() public {
        uint256 tokenId = _createLamina(10, "{}");
        uint256 tId = _transferLaminaToFactory(tokenId, 5);

        vm.prank(factoryAddr);
        sc.rejectTransfer(tId);

        // Tokens devueltos, producer puede volver a transferir
        vm.prank(producerAddr);
        sc.transfer(factoryAddr, tokenId, 10);
        uint256 tId2 = sc.nextTransferId() - 1;
        _accept(factoryAddr, tId2);
        assertEq(sc.getTokenBalance(tokenId, factoryAddr), 10);
    }

    function testOnlyRecipientCanAccept() public {
        uint256 tokenId = _createLamina(10, "{}");
        uint256 tId = _transferLaminaToFactory(tokenId, 5);

        vm.prank(retailerAddr); // no es el destinatario
        vm.expectRevert(SupplyChain.NotTransferRecipient.selector);
        sc.acceptTransfer(tId);
    }

    // =========================================================================
    // TESTS: BURN
    // =========================================================================

    function testBurnByConsumer() public {
        uint256 laminaId = _setupFactoryWithLamina(10);
        vm.prank(factoryAddr);
        sc.createToken("Puerta", 2, '{"type":"puerta"}', laminaId);
        uint256 prodId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, prodId, 2);
        _accept(retailerAddr, sc.nextTransferId() - 1);

        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, prodId, 2);
        _accept(consumerAddr, sc.nextTransferId() - 1);

        vm.prank(consumerAddr);
        sc.burnToken(prodId);

        (,,,,,,, bool burned) = sc.getToken(prodId);
        assertTrue(burned);
        assertEq(sc.getTokenBalance(prodId, consumerAddr), 0);
    }

    function testOnlyConsumerCanBurn() public {
        uint256 tokenId = _createLamina(10, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.OnlyConsumerCanBurn.selector);
        sc.burnToken(tokenId);
    }

    function testDoubleBurnReverts() public {
        uint256 laminaId = _setupFactoryWithLamina(5);
        vm.prank(factoryAddr);
        sc.createToken("Puerta", 1, '{"type":"puerta"}', laminaId);
        uint256 prodId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, prodId, 1);
        _accept(retailerAddr, sc.nextTransferId() - 1);
        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, prodId, 1);
        _accept(consumerAddr, sc.nextTransferId() - 1);

        vm.prank(consumerAddr);
        sc.burnToken(prodId);

        vm.prank(consumerAddr);
        vm.expectRevert(SupplyChain.TokenAlreadyBurned.selector);
        sc.burnToken(prodId);
    }

    function testTransferBurnedTokenReverts() public {
        uint256 laminaId = _setupFactoryWithLamina(5);
        vm.prank(factoryAddr);
        sc.createToken("Puerta", 1, '{"type":"puerta"}', laminaId);
        uint256 prodId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, prodId, 1);
        _accept(retailerAddr, sc.nextTransferId() - 1);
        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, prodId, 1);
        _accept(consumerAddr, sc.nextTransferId() - 1);
        vm.prank(consumerAddr);
        sc.burnToken(prodId);

        // Intentar transferir un token quemado
        vm.prank(retailerAddr);
        vm.expectRevert(SupplyChain.TokenAlreadyBurned.selector);
        sc.transfer(consumerAddr, prodId, 1);
    }

    // =========================================================================
    // TESTS: EVENTOS
    // =========================================================================

    function testUserRegisteredEvent() public {
        address newUser = address(0x300);
        vm.prank(newUser);
        vm.expectEmit(true, false, false, true);
        emit SupplyChain.UserRoleRequested(newUser, "producer");
        sc.requestUserRole("producer");
    }

    function testUserStatusChangedEvent() public {
        vm.prank(adminAddr);
        vm.expectEmit(true, false, false, true);
        emit SupplyChain.UserStatusChanged(producerAddr, SupplyChain.UserStatus.Rejected);
        sc.changeStatusUser(producerAddr, SupplyChain.UserStatus.Rejected);
    }

    function testTokenCreatedEvent() public {
        vm.prank(producerAddr);
        vm.expectEmit(false, true, false, false);
        emit SupplyChain.TokenCreated(1, producerAddr, "Lamina Hierro", 100, 0);
        sc.createToken("Lamina Hierro", 100, "{}", 0);
    }

    function testTransferInitiatedEvent() public {
        uint256 tokenId = _createLamina(10, "{}");
        vm.prank(producerAddr);
        vm.expectEmit(false, true, true, false);
        emit SupplyChain.TransferRequested(1, producerAddr, factoryAddr, tokenId, 10);
        sc.transfer(factoryAddr, tokenId, 10);
    }

    function testTransferAcceptedEvent() public {
        uint256 tokenId = _createLamina(10, "{}");
        uint256 tId = _transferLaminaToFactory(tokenId, 10);
        vm.prank(factoryAddr);
        vm.expectEmit(true, false, false, false);
        emit SupplyChain.TransferAccepted(tId);
        sc.acceptTransfer(tId);
    }

    function testTransferRejectedEvent() public {
        uint256 tokenId = _createLamina(10, "{}");
        uint256 tId = _transferLaminaToFactory(tokenId, 10);
        vm.prank(factoryAddr);
        vm.expectEmit(true, false, false, false);
        emit SupplyChain.TransferRejected(tId);
        sc.rejectTransfer(tId);
    }

    function testTokenBurnedEvent() public {
        uint256 laminaId = _setupFactoryWithLamina(5);
        vm.prank(factoryAddr);
        sc.createToken("Puerta", 1, '{"type":"puerta"}', laminaId);
        uint256 prodId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, prodId, 1);
        _accept(retailerAddr, sc.nextTransferId() - 1);
        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, prodId, 1);
        _accept(consumerAddr, sc.nextTransferId() - 1);

        vm.prank(consumerAddr);
        vm.expectEmit(true, true, false, false);
        emit SupplyChain.TokenBurned(prodId, consumerAddr);
        sc.burnToken(prodId);
    }

    // =========================================================================
    // TESTS: FLUJO COMPLETO
    // =========================================================================

    function testCompleteSupplyChainFlow() public {
        // 1. Producer crea lámina (auto-mint)
        uint256 laminaId = _createLamina(50, '{"calidad":"A","espesor":"2mm","lote":"L2025-01"}');
        assertEq(sc.getTokenBalance(laminaId, producerAddr), 50);

        // 2. Producer transfiere a Factory
        uint256 t1 = _transferLaminaToFactory(laminaId, 50);
        assertEq(sc.getTokenBalance(laminaId, producerAddr), 0);

        // 3. Factory acepta la lámina
        _accept(factoryAddr, t1);
        assertEq(sc.getTokenBalance(laminaId, factoryAddr), 50);

        // 4. Factory crea producto con parentId = laminaId
        vm.prank(factoryAddr);
        sc.createToken(
            "Puerta Blindada M90",
            10,
            '{"type":"puerta","subtipo":"blindada","talla":"90x210","peso":"85kg"}',
            laminaId
        );
        uint256 prodId = sc.nextTokenId() - 1;
        assertEq(sc.getTokenBalance(prodId, factoryAddr), 10);

        // 5. Factory transfiere producto a Retailer
        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, prodId, 10);
        uint256 t2 = sc.nextTransferId() - 1;

        // 6. Retailer acepta
        _accept(retailerAddr, t2);
        assertEq(sc.getTokenBalance(prodId, retailerAddr), 10);

        // 7. Retailer transfiere al Consumer
        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, prodId, 1);
        uint256 t3 = sc.nextTransferId() - 1;

        // 8. Consumer acepta
        _accept(consumerAddr, t3);
        assertEq(sc.getTokenBalance(prodId, consumerAddr), 1);

        // 9. Consumer redime (burn)
        vm.prank(consumerAddr);
        sc.burnToken(prodId);
        (,,,,,,, bool burned) = sc.getToken(prodId);
        assertTrue(burned);

        // Verificar trazabilidad: el producto tiene parentId = laminaId
        (,,,,,uint256 parentId,,) = sc.getToken(prodId);
        assertEq(parentId, laminaId);
    }

    function testMultipleTokensFlow() public {
        // Dos láminas distintas → dos productos distintos
        uint256 l1 = _createLamina(30, '{"calidad":"A"}');
        uint256 l2 = _createLamina(20, '{"calidad":"B"}');

        _accept(factoryAddr, _transferLaminaToFactory(l1, 30));
        _accept(factoryAddr, _transferLaminaToFactory(l2, 20));

        vm.prank(factoryAddr);
        sc.createToken("Puerta", 5, '{"type":"puerta"}', l1);
        uint256 p1 = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.createToken("Reja", 4, '{"type":"reja"}', l2);
        uint256 p2 = sc.nextTokenId() - 1;

        assertEq(sc.getTokenBalance(p1, factoryAddr), 5);
        assertEq(sc.getTokenBalance(p2, factoryAddr), 4);

        // Verificar tokens del factory: láminas + productos en su índice
        uint256[] memory factoryTokens = sc.getUserTokens(factoryAddr);
        // l1, l2 (recibidas) + p1, p2 (creadas)
        assertEq(factoryTokens.length, 4);
    }

    function testTraceabilityFlow() public {
        // Verifica que la cadena de parentId se puede reconstruir completamente
        uint256 laminaId = _setupFactoryWithLamina(10);

        vm.prank(factoryAddr);
        sc.createToken("Marco Reforzado", 2, '{"type":"marco","subtipo":"reforzado"}', laminaId);
        uint256 marcoId = sc.nextTokenId() - 1;

        // Verificar que marco apunta a lámina
        (,,,,,uint256 parentId,,) = sc.getToken(marcoId);
        assertEq(parentId, laminaId);

        // Verificar que lámina es materia prima (parentId == 0)
        (,,,,,uint256 laminaParent,,) = sc.getToken(laminaId);
        assertEq(laminaParent, 0);

        // Trazabilidad completa: marco → lámina → origen (parentId=0)
        assertTrue(parentId > 0);          // es producto terminado
        assertEq(laminaParent, 0);         // la lámina es materia prima
    }
}
