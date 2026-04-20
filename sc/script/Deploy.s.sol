// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/SupplyChain.sol";

/// @notice Script de despliegue del contrato SupplyChain
/// @dev Uso:
///   forge script script/Deploy.s.sol \
///     --rpc-url http://localhost:8545 \
///     --private-key <PRIVATE_KEY> \
///     --broadcast
contract DeploySupplyChain is Script {
    function run() external {
        // La private key que pases con --private-key será el admin del contrato
        vm.startBroadcast();

        SupplyChain sc = new SupplyChain();

        vm.stopBroadcast();

        // Log de la dirección para copiar al frontend (contracts/config.ts)
        console.log("=================================================");
        console.log("SupplyChain deployed at:", address(sc));
        console.log("Admin address:          ", msg.sender);
        console.log("=================================================");
        console.log("Copia la direccion en: web/src/contracts/config.ts");
    }
}
