// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script} from "forge-std/Script.sol";
import {ContinuousVestingMerkleDistributor} from "../../contracts/claim/factory/ContinuousVestingMerkleDistributor.sol";

contract ContinuousVestingMerkleDistributorScript is Script {
    function run() public {
        ContinuousVestingMerkleDistributor implementation;
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        implementation = new ContinuousVestingMerkleDistributor();
        vm.stopBroadcast();
    }
}
