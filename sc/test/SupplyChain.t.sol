// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/SupplyChain.sol";

contract SupplyChainTest is Test {

    // Eventos re-declarados para vm.expectEmit
    event TokenCreated(uint256 indexed tokenId, address indexed creator, string name, uint256 totalSupply, uint256 parentId);
    event TokenBurned(uint256 indexed tokenId, address indexed burner);
    event TokenCertified(uint256 indexed tokenId, address indexed certifier, string certHash, uint256 date);
    event MaterialConsumed(address indexed factory, uint256 indexed tokenId, uint256 amount);
    event TransferRequested(uint256 indexed transferId, address indexed from, address indexed to, uint256 tokenId, uint256 amount);
    event TransferAccepted(uint256 indexed transferId);
    event TransferRejected(uint256 indexed transferId);
    event UserRoleRequested(address indexed user, string name, string role);
    event UserStatusChanged(address indexed user, SupplyChain.UserStatus status);

    SupplyChain public sc;

    address public adminAddr     = address(0x1);
    address public producerAddr  = address(0x2);
    address public factoryAddr   = address(0x3);
    address public retailerAddr  = address(0x4);
    address public consumerAddr  = address(0x5);
    address public certifierAddr = address(0x6);
    address public stranger      = address(0x7);

    // =========================================================================
    // SETUP
    // =========================================================================

    function setUp() public {
        vm.prank(adminAddr);
        sc = new SupplyChain();

        _registerAndApprove(producerAddr,  "Fundicion Norte",    "producer");
        _registerAndApprove(certifierAddr, "Lab Certificador",   "certifier");
        _registerAndApprove(factoryAddr,   "Fabrica Industrial", "factory");
        _registerAndApprove(retailerAddr,  "Distribuidor XYZ",   "retailer");
        _registerAndApprove(consumerAddr,  "Cliente Final",      "consumer");
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    function _registerAndApprove(address user, string memory name, string memory role) internal {
        vm.prank(user);
        sc.requestUserRole(name, role);
        vm.prank(adminAddr);
        sc.changeStatusUser(user, SupplyChain.UserStatus.Approved);
    }

    function _createBobina(uint256 supply, string memory features) internal returns (uint256) {
        vm.prank(producerAddr);
        sc.createToken("Bobina A36", supply, features, 0);
        return sc.nextTokenId() - 1;
    }

    function _certifyToken(uint256 tokenId) internal {
        vm.prank(certifierAddr);
        sc.certifyToken(tokenId, "sha256-cert-hash-test");
    }

    function _createAndCertifyBobina(uint256 supply, string memory features) internal returns (uint256) {
        uint256 tokenId = _createBobina(supply, features);
        _certifyToken(tokenId);
        return tokenId;
    }

    function _transferBobinaToFactory(uint256 tokenId, uint256 amount) internal returns (uint256) {
        vm.prank(producerAddr);
        sc.transfer(factoryAddr, tokenId, amount);
        return sc.nextTransferId() - 1;
    }

    function _accept(address recipient, uint256 transferId) internal {
        vm.prank(recipient);
        sc.acceptTransfer(transferId);
    }

    /// Flujo completo: crea bobina certificada → transfiere a fábrica → acepta
    function _setupFactoryWithBobina(uint256 supply) internal returns (uint256 tokenId) {
        tokenId = _createAndCertifyBobina(supply, '{"grado":"A36","colada":"C001"}');
        uint256 tId = _transferBobinaToFactory(tokenId, supply);
        _accept(factoryAddr, tId);
    }

    // =========================================================================
    // TESTS: GESTIÓN DE USUARIOS
    // =========================================================================

    function testUserRegistration() public {
        address newUser = address(0x99);
        vm.prank(newUser);
        sc.requestUserRole("Retailer Test", "retailer");

        (,, string memory name, string memory role, SupplyChain.UserStatus status) = sc.getUserInfo(newUser);
        assertEq(name, "Retailer Test");
        assertEq(role, "retailer");
        assertEq(uint(status), uint(SupplyChain.UserStatus.Pending));
    }

    function testAdminApproveUser() public {
        address newUser = address(0x100);
        vm.prank(newUser);
        sc.requestUserRole("Nuevo Cliente", "consumer");

        vm.prank(adminAddr);
        sc.changeStatusUser(newUser, SupplyChain.UserStatus.Approved);

        (,,,, SupplyChain.UserStatus status) = sc.getUserInfo(newUser);
        assertEq(uint(status), uint(SupplyChain.UserStatus.Approved));
    }

    function testAdminRejectUser() public {
        address newUser = address(0x101);
        vm.prank(newUser);
        sc.requestUserRole("Rechazado", "producer");

        vm.prank(adminAddr);
        sc.changeStatusUser(newUser, SupplyChain.UserStatus.Rejected);

        (,,,, SupplyChain.UserStatus status) = sc.getUserInfo(newUser);
        assertEq(uint(status), uint(SupplyChain.UserStatus.Rejected));
    }

    function testUserStatusChanges() public {
        address newUser = address(0x102);
        vm.prank(newUser);
        sc.requestUserRole("Fab Temporal", "factory");

        vm.prank(adminAddr);
        sc.changeStatusUser(newUser, SupplyChain.UserStatus.Approved);
        (,,,, SupplyChain.UserStatus s1) = sc.getUserInfo(newUser);
        assertEq(uint(s1), uint(SupplyChain.UserStatus.Approved));

        vm.prank(adminAddr);
        sc.changeStatusUser(newUser, SupplyChain.UserStatus.Canceled);
        (,,,, SupplyChain.UserStatus s2) = sc.getUserInfo(newUser);
        assertEq(uint(s2), uint(SupplyChain.UserStatus.Canceled));
    }

    function testOnlyApprovedUsersCanOperate() public {
        address pendingUser = address(0x103);
        vm.prank(pendingUser);
        sc.requestUserRole("Pendiente", "producer");
        vm.prank(pendingUser);
        vm.expectRevert(SupplyChain.NotApproved.selector);
        sc.createToken("Test", 10, "{}", 0);
    }

    function testGetUserInfo() public {
        (uint256 id, address addr, string memory name, string memory role, SupplyChain.UserStatus status)
            = sc.getUserInfo(producerAddr);
        assertEq(id, sc.addressToUserId(producerAddr));
        assertEq(addr, producerAddr);
        assertEq(name, "Fundicion Norte");
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
        sc.requestUserRole("Otro nombre", "producer");
    }

    function testInvalidRoleReverts() public {
        address newUser = address(0x104);
        vm.prank(newUser);
        vm.expectRevert(SupplyChain.InvalidRole.selector);
        sc.requestUserRole("Superhero", "superhero");
    }

    function testOnlyAdminCanChangeStatus() public {
        vm.prank(stranger);
        vm.expectRevert(SupplyChain.NotAdmin.selector);
        sc.changeStatusUser(producerAddr, SupplyChain.UserStatus.Rejected);
    }

    // =========================================================================
    // TESTS: ÍNDICES DE USUARIOS
    // =========================================================================

    function testGetAllUserIds() public {
        uint256[] memory ids = sc.getAllUserIds();
        assertEq(ids.length, 5); // producer, certifier, factory, retailer, consumer
    }

    function testGetUserAddressesByRole() public {
        address[] memory producers = sc.getUserAddressesByRole("producer");
        assertEq(producers.length, 1);
        assertEq(producers[0], producerAddr);

        address[] memory certifiers = sc.getUserAddressesByRole("certifier");
        assertEq(certifiers.length, 1);
        assertEq(certifiers[0], certifierAddr);
    }

    function testGetUserAddressesByRoleMultiple() public {
        address newFactory = address(0x200);
        _registerAndApprove(newFactory, "Segunda Fabrica", "factory");

        address[] memory factories = sc.getUserAddressesByRole("factory");
        assertEq(factories.length, 2);
    }

    // =========================================================================
    // TESTS: CREACIÓN DE TOKENS (BOBINAS)
    // =========================================================================

    function testCreateBobinaByProducer() public {
        uint256 tokenId = _createBobina(10000, '{"grado":"A36","colada":"C001"}');
        (uint256 id,,, uint256 supply,,,, bool burned, bool certified) = sc.getToken(tokenId);
        assertEq(id, tokenId);
        assertEq(supply, 10000);
        assertFalse(burned);
        assertFalse(certified); // nacen sin certificar
        assertEq(sc.getTokenBalance(tokenId, producerAddr), 10000);
    }

    function testAutoMintOnCreate() public {
        uint256 tokenId = _createBobina(5000, "{}");
        assertEq(sc.getTokenBalance(tokenId, producerAddr), 5000);
    }

    function testCreateLaminaByFactory() public {
        uint256 bobinaId = _setupFactoryWithBobina(100);
        vm.prank(factoryAddr);
        sc.createToken("Lamina 2mm", 50, '{"espesor_mm":"2","ancho_mm":"1200"}', bobinaId);
        uint256 laminaId = sc.nextTokenId() - 1;
        (,,,,, uint256 parentId,,, ) = sc.getToken(laminaId);
        assertEq(parentId, bobinaId);
        assertEq(sc.getTokenBalance(laminaId, factoryAddr), 50);
    }

    function testProducerCannotCreateLamina() public {
        uint256 bobinaId = _createBobina(100, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.InvalidRole.selector);
        sc.createToken("Intento invalido", 5, "{}", bobinaId);
    }

    function testFactoryCannotCreateBobina() public {
        vm.prank(factoryAddr);
        vm.expectRevert(SupplyChain.InvalidRole.selector);
        sc.createToken("No deberia", 100, "{}", 0);
    }

    function testTokenMetadata() public {
        string memory features = '{"grado":"A36","colada":"C2025-01","peso_kg":"1500"}';
        uint256 tokenId = _createBobina(150000, features);
        (,,,, string memory feat,,,,) = sc.getToken(tokenId);
        assertEq(feat, features);
    }

    function testGetToken() public {
        uint256 tokenId = _createBobina(100, "{}");
        (uint256 id, address creator, string memory name,,,,,, ) = sc.getToken(tokenId);
        assertEq(id, tokenId);
        assertEq(creator, producerAddr);
        assertEq(name, "Bobina A36");
    }

    function testGetUserTokenIds() public {
        _createBobina(100, "{}");
        _createBobina(200, "{}");
        uint256[] memory ids = sc.getUserTokenIds(producerAddr);
        assertEq(ids.length, 2);
    }

    function testGetAllTokenIds() public {
        _createBobina(100, "{}");
        _createBobina(200, "{}");
        uint256[] memory ids = sc.getAllTokenIds();
        assertEq(ids.length, 2);
    }

    function testAllTokenIdsChronological() public {
        uint256 t1 = _createBobina(100, "{}");
        uint256 t2 = _createBobina(200, "{}");
        uint256[] memory ids = sc.getAllTokenIds();
        assertEq(ids[0], t1);
        assertEq(ids[1], t2);
    }

    function testZeroSupplyReverts() public {
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.ZeroAmount.selector);
        sc.createToken("Zero", 0, "{}", 0);
    }

    function testCreateWithNonExistentParentReverts() public {
        vm.prank(factoryAddr);
        vm.expectRevert(SupplyChain.ParentTokenNotFound.selector);
        sc.createToken("Ghost", 5, "{}", 9999);
    }

    // =========================================================================
    // TESTS: CERTIFICACIÓN
    // =========================================================================

    function testCertifyBobina() public {
        uint256 tokenId = _createBobina(10000, "{}");
        (,,,,,,,, bool certBefore) = sc.getToken(tokenId);
        assertFalse(certBefore);

        _certifyToken(tokenId);

        (,,,,,,,, bool certAfter) = sc.getToken(tokenId);
        assertTrue(certAfter);
    }

    function testCertifyEmitsEvent() public {
        uint256 tokenId = _createBobina(10000, "{}");
        vm.prank(certifierAddr);
        vm.expectEmit(true, true, false, false);
        emit TokenCertified(tokenId, certifierAddr, "sha256-cert-hash-test", block.timestamp);
        sc.certifyToken(tokenId, "sha256-cert-hash-test");
    }

    function testOnlyCertifierCanCertify() public {
        uint256 tokenId = _createBobina(10000, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.NotCertifier.selector);
        sc.certifyToken(tokenId, "hash");
    }

    function testCannotCertifyLamina() public {
        uint256 bobinaId = _setupFactoryWithBobina(100);
        vm.prank(factoryAddr);
        sc.createToken("Lamina", 50, "{}", bobinaId);
        uint256 laminaId = sc.nextTokenId() - 1;

        vm.prank(certifierAddr);
        vm.expectRevert(SupplyChain.TokenNotCertifiable.selector);
        sc.certifyToken(laminaId, "hash");
    }

    function testCannotCertifyTwice() public {
        uint256 tokenId = _createBobina(10000, "{}");
        _certifyToken(tokenId);

        vm.prank(certifierAddr);
        vm.expectRevert(SupplyChain.TokenNotCertifiable.selector);
        sc.certifyToken(tokenId, "hash2");
    }

    function testTransferUncertifiedBobinaReverts() public {
        uint256 tokenId = _createBobina(10000, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.TokenNotCertified.selector);
        sc.transfer(factoryAddr, tokenId, 5000);
    }

    function testTransferCertifiedBobinaSucceeds() public {
        uint256 tokenId = _createAndCertifyBobina(10000, "{}");
        vm.prank(producerAddr);
        sc.transfer(factoryAddr, tokenId, 5000);
        uint256 tId = sc.nextTransferId() - 1;
        _accept(factoryAddr, tId);
        assertEq(sc.getTokenBalance(tokenId, factoryAddr), 5000);
    }

    function testLaminaDoesNotRequireCertificationForTransfer() public {
        // Las láminas (parentId > 0) no necesitan certificación para transferirse
        uint256 bobinaId = _setupFactoryWithBobina(100);
        vm.prank(factoryAddr);
        sc.createToken("Lamina 2mm", 50, "{}", bobinaId);
        uint256 laminaId = sc.nextTokenId() - 1;

        // Transferir lámina sin certificar → debe funcionar
        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, laminaId, 10);
        uint256 tId = sc.nextTransferId() - 1;
        _accept(retailerAddr, tId);
        assertEq(sc.getTokenBalance(laminaId, retailerAddr), 10);
    }

    // =========================================================================
    // TESTS: CONSUME RAW MATERIAL
    // =========================================================================

    function testConsumeRawMaterial() public {
        uint256 bobinaId = _setupFactoryWithBobina(100);
        assertEq(sc.getTokenBalance(bobinaId, factoryAddr), 100);

        vm.prank(factoryAddr);
        sc.consumeRawMaterial(bobinaId, 30);

        assertEq(sc.getTokenBalance(bobinaId, factoryAddr), 70);
    }

    function testConsumeRawMaterialEvent() public {
        uint256 bobinaId = _setupFactoryWithBobina(50);

        vm.prank(factoryAddr);
        vm.expectEmit(true, true, false, true);
        emit MaterialConsumed(factoryAddr, bobinaId, 20);
        sc.consumeRawMaterial(bobinaId, 20);
    }

    function testConsumeRawMaterialInsufficientBalance() public {
        uint256 bobinaId = _setupFactoryWithBobina(10);

        vm.prank(factoryAddr);
        vm.expectRevert(SupplyChain.InsufficientBalance.selector);
        sc.consumeRawMaterial(bobinaId, 100);
    }

    function testConsumeRawMaterialZeroAmountReverts() public {
        uint256 bobinaId = _setupFactoryWithBobina(10);

        vm.prank(factoryAddr);
        vm.expectRevert(SupplyChain.ZeroAmount.selector);
        sc.consumeRawMaterial(bobinaId, 0);
    }

    function testConsumeRawMaterialOnlyFactory() public {
        uint256 bobinaId = _createBobina(10, "{}");

        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.NotFactory.selector);
        sc.consumeRawMaterial(bobinaId, 5);
    }

    function testConsumeLaminaReverts() public {
        uint256 bobinaId = _setupFactoryWithBobina(10);
        vm.prank(factoryAddr);
        sc.createToken("Lamina", 5, "{}", bobinaId);
        uint256 laminaId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        vm.expectRevert(SupplyChain.NotRawMaterial.selector);
        sc.consumeRawMaterial(laminaId, 1);
    }

    function testConsumeAndCreateLaminaFlow() public {
        uint256 b1 = _setupFactoryWithBobina(100);

        // Segunda bobina
        uint256 b2 = _createAndCertifyBobina(200, '{"grado":"B"}');
        uint256 t2 = _transferBobinaToFactory(b2, 200);
        _accept(factoryAddr, t2);

        // Consumir bobinas para producir láminas
        vm.prank(factoryAddr);
        sc.consumeRawMaterial(b1, 30);
        vm.prank(factoryAddr);
        sc.consumeRawMaterial(b2, 50);

        vm.prank(factoryAddr);
        sc.createToken("Lamina 2mm", 10, '{"espesor_mm":"2","bobinaOrigen":"b1+b2"}', b1);
        uint256 laminaId = sc.nextTokenId() - 1;

        assertEq(sc.getTokenBalance(laminaId, factoryAddr), 10);
        assertEq(sc.getTokenBalance(b1, factoryAddr), 70);
        assertEq(sc.getTokenBalance(b2, factoryAddr), 150);
    }

    // =========================================================================
    // TESTS: TRANSFERENCIAS
    // =========================================================================

    function testTransferFromProducerToFactory() public {
        uint256 tokenId = _createAndCertifyBobina(100, "{}");
        vm.prank(producerAddr);
        sc.transfer(factoryAddr, tokenId, 50);
        uint256 tId = sc.nextTransferId() - 1;

        (,address from, address to,,, uint256 amount, SupplyChain.TransferStatus status)
            = sc.getTransfer(tId);
        assertEq(from, producerAddr);
        assertEq(to,   factoryAddr);
        assertEq(amount, 50);
        assertEq(uint(status), uint(SupplyChain.TransferStatus.Pending));
        assertEq(sc.getTokenBalance(tokenId, producerAddr), 50);
    }

    function testAcceptTransfer() public {
        uint256 tokenId = _createAndCertifyBobina(100, "{}");
        uint256 tId = _transferBobinaToFactory(tokenId, 60);
        _accept(factoryAddr, tId);

        (,,,,,, SupplyChain.TransferStatus status) = sc.getTransfer(tId);
        assertEq(uint(status), uint(SupplyChain.TransferStatus.Accepted));
        assertEq(sc.getTokenBalance(tokenId, factoryAddr), 60);
        assertEq(sc.getTokenBalance(tokenId, producerAddr), 40);
    }

    function testRejectTransfer() public {
        uint256 tokenId = _createAndCertifyBobina(100, "{}");
        uint256 tId = _transferBobinaToFactory(tokenId, 30);

        vm.prank(factoryAddr);
        sc.rejectTransfer(tId);

        (,,,,,, SupplyChain.TransferStatus status) = sc.getTransfer(tId);
        assertEq(uint(status), uint(SupplyChain.TransferStatus.Rejected));
        assertEq(sc.getTokenBalance(tokenId, producerAddr), 100);
        assertEq(sc.getTokenBalance(tokenId, factoryAddr),  0);
    }

    function testTransferFromFactoryToRetailer() public {
        uint256 bobinaId = _setupFactoryWithBobina(10);
        vm.prank(factoryAddr);
        sc.createToken("Lamina 3mm", 5, '{"espesor_mm":"3"}', bobinaId);
        uint256 laminaId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, laminaId, 2);
        uint256 tId = sc.nextTransferId() - 1;
        _accept(retailerAddr, tId);

        assertEq(sc.getTokenBalance(laminaId, retailerAddr), 2);
    }

    function testTransferFromRetailerToConsumer() public {
        uint256 bobinaId = _setupFactoryWithBobina(10);
        vm.prank(factoryAddr);
        sc.createToken("Lamina 1mm", 5, '{"espesor_mm":"1"}', bobinaId);
        uint256 laminaId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, laminaId, 5);
        _accept(retailerAddr, sc.nextTransferId() - 1);

        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, laminaId, 3);
        _accept(consumerAddr, sc.nextTransferId() - 1);

        assertEq(sc.getTokenBalance(laminaId, consumerAddr), 3);
    }

    function testTransferInsufficientBalance() public {
        uint256 tokenId = _createAndCertifyBobina(10, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.InsufficientBalance.selector);
        sc.transfer(factoryAddr, tokenId, 100);
    }

    function testGetTransfer() public {
        uint256 tokenId = _createAndCertifyBobina(10, "{}");
        _transferBobinaToFactory(tokenId, 10);
        uint256 tId = sc.nextTransferId() - 1;

        (uint256 id, address from, address to, uint256 tknId,,,) = sc.getTransfer(tId);
        assertEq(id,    tId);
        assertEq(from,  producerAddr);
        assertEq(to,    factoryAddr);
        assertEq(tknId, tokenId);
    }

    function testGetUserTransfers() public {
        uint256 tokenId = _createAndCertifyBobina(100, "{}");
        _transferBobinaToFactory(tokenId, 10);
        _transferBobinaToFactory(tokenId, 20);
        uint256[] memory producerTxs = sc.getUserTransfers(producerAddr);
        uint256[] memory factoryTxs  = sc.getUserTransfers(factoryAddr);
        assertEq(producerTxs.length, 2);
        assertEq(factoryTxs.length,  2);
    }

    // =========================================================================
    // TESTS: VALIDACIONES Y PERMISOS
    // =========================================================================

    function testInvalidRoleTransfer() public {
        uint256 tokenId = _createAndCertifyBobina(10, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.InvalidTransferDirection.selector);
        sc.transfer(consumerAddr, tokenId, 5);
    }

    function testUnapprovedUserCannotCreateToken() public {
        address pending = address(0x200);
        vm.prank(pending);
        sc.requestUserRole("Pendiente", "producer");
        vm.prank(pending);
        vm.expectRevert(SupplyChain.NotApproved.selector);
        sc.createToken("Test", 10, "{}", 0);
    }

    function testUnapprovedUserCannotTransfer() public {
        uint256 tokenId = _createAndCertifyBobina(10, "{}");
        address pending = address(0x201);
        vm.prank(pending);
        sc.requestUserRole("Pendiente2", "factory");
        vm.prank(pending);
        vm.expectRevert(SupplyChain.NotApproved.selector);
        sc.transfer(factoryAddr, tokenId, 5);
    }

    function testConsumerCannotTransfer() public {
        uint256 bobinaId = _setupFactoryWithBobina(10);
        vm.prank(factoryAddr);
        sc.createToken("Lamina", 2, "{}", bobinaId);
        uint256 laminaId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, laminaId, 2);
        _accept(retailerAddr, sc.nextTransferId() - 1);
        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, laminaId, 2);
        _accept(consumerAddr, sc.nextTransferId() - 1);

        vm.prank(consumerAddr);
        vm.expectRevert(SupplyChain.InvalidTransferDirection.selector);
        sc.transfer(retailerAddr, laminaId, 1);
    }

    function testTransferToSameAddress() public {
        uint256 tokenId = _createAndCertifyBobina(10, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.CannotTransferToSelf.selector);
        sc.transfer(producerAddr, tokenId, 5);
    }

    function testCertifierCannotTransfer() public {
        // El certificador no puede transferir tokens (no está en el flujo)
        uint256 bobinaId = _setupFactoryWithBobina(10);
        vm.prank(certifierAddr);
        vm.expectRevert(SupplyChain.InvalidTransferDirection.selector);
        sc.transfer(factoryAddr, bobinaId, 5);
    }

    // =========================================================================
    // TESTS: CASOS EDGE
    // =========================================================================

    function testTransferZeroAmount() public {
        uint256 tokenId = _createAndCertifyBobina(10, "{}");
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
        uint256 tokenId = _createAndCertifyBobina(10, "{}");
        uint256 tId = _transferBobinaToFactory(tokenId, 5);
        _accept(factoryAddr, tId);

        vm.prank(factoryAddr);
        vm.expectRevert(SupplyChain.TransferNotPending.selector);
        sc.acceptTransfer(tId);
    }

    function testTransferAfterRejection() public {
        uint256 tokenId = _createAndCertifyBobina(10, "{}");
        uint256 tId = _transferBobinaToFactory(tokenId, 5);

        vm.prank(factoryAddr);
        sc.rejectTransfer(tId);

        // Tokens devueltos, se puede retransferir
        vm.prank(producerAddr);
        sc.transfer(factoryAddr, tokenId, 10);
        uint256 tId2 = sc.nextTransferId() - 1;
        _accept(factoryAddr, tId2);
        assertEq(sc.getTokenBalance(tokenId, factoryAddr), 10);
    }

    function testOnlyRecipientCanAccept() public {
        uint256 tokenId = _createAndCertifyBobina(10, "{}");
        uint256 tId = _transferBobinaToFactory(tokenId, 5);

        vm.prank(retailerAddr);
        vm.expectRevert(SupplyChain.NotTransferRecipient.selector);
        sc.acceptTransfer(tId);
    }

    // =========================================================================
    // TESTS: BURN
    // =========================================================================

    function testBurnByConsumer() public {
        uint256 bobinaId = _setupFactoryWithBobina(10);
        vm.prank(factoryAddr);
        sc.createToken("Lamina 2mm", 2, "{}", bobinaId);
        uint256 laminaId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, laminaId, 2);
        _accept(retailerAddr, sc.nextTransferId() - 1);
        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, laminaId, 2);
        _accept(consumerAddr, sc.nextTransferId() - 1);

        vm.prank(consumerAddr);
        sc.burnToken(laminaId);

        (,,,,,,, bool burned,) = sc.getToken(laminaId);
        assertTrue(burned);
        assertEq(sc.getTokenBalance(laminaId, consumerAddr), 0);
    }

    function testOnlyConsumerCanBurn() public {
        uint256 tokenId = _createBobina(10, "{}");
        vm.prank(producerAddr);
        vm.expectRevert(SupplyChain.OnlyConsumerCanBurn.selector);
        sc.burnToken(tokenId);
    }

    function testDoubleBurnReverts() public {
        uint256 bobinaId = _setupFactoryWithBobina(5);
        vm.prank(factoryAddr);
        sc.createToken("Lamina", 1, "{}", bobinaId);
        uint256 laminaId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, laminaId, 1);
        _accept(retailerAddr, sc.nextTransferId() - 1);
        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, laminaId, 1);
        _accept(consumerAddr, sc.nextTransferId() - 1);

        vm.prank(consumerAddr);
        sc.burnToken(laminaId);
        vm.prank(consumerAddr);
        vm.expectRevert(SupplyChain.TokenAlreadyBurned.selector);
        sc.burnToken(laminaId);
    }

    function testTransferBurnedTokenReverts() public {
        uint256 bobinaId = _setupFactoryWithBobina(5);
        vm.prank(factoryAddr);
        sc.createToken("Lamina", 1, "{}", bobinaId);
        uint256 laminaId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, laminaId, 1);
        _accept(retailerAddr, sc.nextTransferId() - 1);
        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, laminaId, 1);
        _accept(consumerAddr, sc.nextTransferId() - 1);
        vm.prank(consumerAddr);
        sc.burnToken(laminaId);

        vm.prank(retailerAddr);
        vm.expectRevert(SupplyChain.TokenAlreadyBurned.selector);
        sc.transfer(consumerAddr, laminaId, 1);
    }

    // =========================================================================
    // TESTS: EVENTOS
    // =========================================================================

    function testUserRegisteredEvent() public {
        address newUser = address(0x300);
        vm.prank(newUser);
        vm.expectEmit(true, false, false, true);
        emit UserRoleRequested(newUser, "Nuevo Productor", "producer");
        sc.requestUserRole("Nuevo Productor", "producer");
    }

    function testUserStatusChangedEvent() public {
        vm.prank(adminAddr);
        vm.expectEmit(true, false, false, true);
        emit UserStatusChanged(producerAddr, SupplyChain.UserStatus.Rejected);
        sc.changeStatusUser(producerAddr, SupplyChain.UserStatus.Rejected);
    }

    function testTokenCreatedEvent() public {
        vm.prank(producerAddr);
        vm.expectEmit(false, true, false, false);
        emit TokenCreated(1, producerAddr, "Bobina A36", 10000, 0);
        sc.createToken("Bobina A36", 10000, "{}", 0);
    }

    function testTokenCertifiedEvent() public {
        uint256 tokenId = _createBobina(10000, "{}");
        vm.prank(certifierAddr);
        vm.expectEmit(true, true, false, false);
        emit TokenCertified(tokenId, certifierAddr, "sha256-cert-hash-test", block.timestamp);
        sc.certifyToken(tokenId, "sha256-cert-hash-test");
    }

    function testTransferInitiatedEvent() public {
        uint256 tokenId = _createAndCertifyBobina(10, "{}");
        vm.prank(producerAddr);
        vm.expectEmit(false, true, true, false);
        emit TransferRequested(1, producerAddr, factoryAddr, tokenId, 10);
        sc.transfer(factoryAddr, tokenId, 10);
    }

    function testTransferAcceptedEvent() public {
        uint256 tokenId = _createAndCertifyBobina(10, "{}");
        uint256 tId = _transferBobinaToFactory(tokenId, 10);
        vm.prank(factoryAddr);
        vm.expectEmit(true, false, false, false);
        emit TransferAccepted(tId);
        sc.acceptTransfer(tId);
    }

    function testTransferRejectedEvent() public {
        uint256 tokenId = _createAndCertifyBobina(10, "{}");
        uint256 tId = _transferBobinaToFactory(tokenId, 10);
        vm.prank(factoryAddr);
        vm.expectEmit(true, false, false, false);
        emit TransferRejected(tId);
        sc.rejectTransfer(tId);
    }

    function testTokenBurnedEvent() public {
        uint256 bobinaId = _setupFactoryWithBobina(5);
        vm.prank(factoryAddr);
        sc.createToken("Lamina", 1, "{}", bobinaId);
        uint256 laminaId = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, laminaId, 1);
        _accept(retailerAddr, sc.nextTransferId() - 1);
        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, laminaId, 1);
        _accept(consumerAddr, sc.nextTransferId() - 1);

        vm.prank(consumerAddr);
        vm.expectEmit(true, true, false, false);
        emit TokenBurned(laminaId, consumerAddr);
        sc.burnToken(laminaId);
    }

    // =========================================================================
    // TESTS: FLUJO COMPLETO
    // =========================================================================

    function testCompleteSupplyChainFlow() public {
        // 1. Fundición crea bobina
        uint256 bobinaId = _createBobina(150000, '{"grado":"A36","colada":"C2025-01","peso_kg":"1500"}');
        assertEq(sc.getTokenBalance(bobinaId, producerAddr), 150000);
        (,,,,,,,, bool certBefore) = sc.getToken(bobinaId);
        assertFalse(certBefore);

        // 2. Certificador certifica el lote
        _certifyToken(bobinaId);
        (,,,,,,,, bool certAfter) = sc.getToken(bobinaId);
        assertTrue(certAfter);

        // 3. Fundición transfiere bobina a Fábrica
        uint256 t1 = _transferBobinaToFactory(bobinaId, 150000);
        _accept(factoryAddr, t1);
        assertEq(sc.getTokenBalance(bobinaId, factoryAddr), 150000);

        // 4. Fábrica consume bobina y produce láminas
        vm.prank(factoryAddr);
        sc.consumeRawMaterial(bobinaId, 50000);

        vm.prank(factoryAddr);
        sc.createToken("Lamina 2mm x 1200mm", 100, '{"espesor_mm":"2","ancho_mm":"1200","largo_mm":"2400"}', bobinaId);
        uint256 laminaId = sc.nextTokenId() - 1;
        assertEq(sc.getTokenBalance(laminaId, factoryAddr), 100);

        // 5. Fábrica transfiere láminas a Distribuidor
        vm.prank(factoryAddr);
        sc.transfer(retailerAddr, laminaId, 100);
        _accept(retailerAddr, sc.nextTransferId() - 1);
        assertEq(sc.getTokenBalance(laminaId, retailerAddr), 100);

        // 6. Distribuidor transfiere al Cliente
        vm.prank(retailerAddr);
        sc.transfer(consumerAddr, laminaId, 20);
        _accept(consumerAddr, sc.nextTransferId() - 1);
        assertEq(sc.getTokenBalance(laminaId, consumerAddr), 20);

        // 7. Cliente redime (burn)
        vm.prank(consumerAddr);
        sc.burnToken(laminaId);
        (,,,,,,, bool burned,) = sc.getToken(laminaId);
        assertTrue(burned);

        // 8. Verificar trazabilidad: lámina → bobina
        (,,,,, uint256 parentId,,,) = sc.getToken(laminaId);
        assertEq(parentId, bobinaId);

        // 9. Verificar que bobina es materia prima
        (,,,,, uint256 bobinaParent,,,) = sc.getToken(bobinaId);
        assertEq(bobinaParent, 0);
    }

    function testMultipleBobinasFlow() public {
        uint256 b1 = _createAndCertifyBobina(100000, '{"grado":"A36"}');
        uint256 b2 = _createAndCertifyBobina(80000,  '{"grado":"A572"}');

        _accept(factoryAddr, _transferBobinaToFactory(b1, 100000));
        _accept(factoryAddr, _transferBobinaToFactory(b2, 80000));

        vm.prank(factoryAddr);
        sc.createToken("Lamina 2mm", 50, '{"espesor_mm":"2"}', b1);
        uint256 l1 = sc.nextTokenId() - 1;

        vm.prank(factoryAddr);
        sc.createToken("Lamina 4mm", 40, '{"espesor_mm":"4"}', b2);
        uint256 l2 = sc.nextTokenId() - 1;

        assertEq(sc.getTokenBalance(l1, factoryAddr), 50);
        assertEq(sc.getTokenBalance(l2, factoryAddr), 40);

        // Verificar índices: factory tiene b1, b2 (recibidas) + l1, l2 (creadas)
        uint256[] memory factoryTokens = sc.getUserTokenIds(factoryAddr);
        assertEq(factoryTokens.length, 4);

        // All tokens index
        uint256[] memory allTokens = sc.getAllTokenIds();
        assertEq(allTokens.length, 4); // b1, b2, l1, l2
    }

    function testCertifierViewsAllProducers() public {
        // Registrar un segundo productor
        address producer2 = address(0x400);
        _registerAndApprove(producer2, "Fundicion Sur", "producer");

        vm.prank(producerAddr);
        sc.createToken("Bobina Norte 1", 100, "{}", 0);
        vm.prank(producer2);
        sc.createToken("Bobina Sur 1", 200, "{}", 0);

        // Todos los tokens visibles para el certificador
        uint256[] memory allTokens = sc.getAllTokenIds();
        assertEq(allTokens.length, 2);

        // Filtrar por productor: getUserTokenIds por cada address de "producer"
        address[] memory producers = sc.getUserAddressesByRole("producer");
        assertEq(producers.length, 2);

        uint256[] memory tokensNorte = sc.getUserTokenIds(producerAddr);
        uint256[] memory tokensSur   = sc.getUserTokenIds(producer2);
        assertEq(tokensNorte.length, 1);
        assertEq(tokensSur.length,   1);
    }
}
