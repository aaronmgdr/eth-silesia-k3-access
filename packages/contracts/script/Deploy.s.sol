// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {Kolektyw3AccessNFT} from "../src/Kolektyw3AccessNFT.sol";

contract Deploy is Script {
    function run() external {
        // Defaults: Anvil test addresses; override via env for real networks
        address usdc     = vm.envOr("USDC_ADDRESS",     address(0x833589FCd6edb6E08F4c7C32d4f71B1566469C18));
        address treasury = vm.envOr("TREASURY_ADDRESS", address(0x70997970C51812e339D9B73b0245Ad59E1FF86f0));
        address owner    = vm.envOr("OWNER_ADDRESS",    address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266));

        console2.log("Network addresses:");
        console2.log("  USDC:     ", usdc);
        console2.log("  Treasury: ", treasury);
        console2.log("  Owner:    ", owner);

        vm.startBroadcast();
        Kolektyw3AccessNFT nft = new Kolektyw3AccessNFT(usdc, treasury, owner);
        vm.stopBroadcast();

        console2.log("Deployed to:", address(nft));
    }
}
