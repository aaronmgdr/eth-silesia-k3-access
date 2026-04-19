// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {Kolektyw3AccessNFT} from "../src/Kolektyw3AccessNFT.sol";

contract Deploy is Script {
    function run() external {
        // All addresses must be explicitly set via environment variables
        // This prevents accidental deployments with wrong addresses
        address usdc     = vm.envAddress("USDC_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address owner    = vm.envAddress("OWNER_ADDRESS");

        console2.log("Deploying to network with addresses:");
        console2.log("  USDC:     ", usdc);
        console2.log("  Treasury: ", treasury);
        console2.log("  Owner:    ", owner);

        vm.startBroadcast();
        Kolektyw3AccessNFT nft = new Kolektyw3AccessNFT(usdc, treasury, owner);
        vm.stopBroadcast();

        console2.log("Deployed to:", address(nft));
    }
}
