// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Script} from "forge-std/Script.sol";
import {ContinuousVestingMerkleDistributor} from
    "../../contracts/claim/factory/ContinuousVestingMerkleDistributor.sol";
import {ContinuousVestingMerkleDistributorFactory} from
    "../../contracts/claim/factory/ContinuousVestingMerkleDistributorFactory.sol";

// you can run this script with dynamic clone args like this:
// forge script script/foundry/ContinuousVestingMerkleDistributorClone.s.sol \
// --sig "run(address,uint256,string,uint256,uint256,uint256,bytes32,uint160,uint256)" \
// 0x75DF62a7E0a37b0E00aEC2d8D7D477B3e689094F 1000000000000000000000 "ipfs://" 1 1 1001 0x00000000000000000000000000000000 0 0 -vvvv

contract ContinuousVestingMerkleDistributorCloneScript is Script {
    function run(
        address token,
        uint256 total,
        string calldata uri,
        uint256 start,
        uint256 cliff,
        uint256 end,
        bytes32 merkleRoot,
        uint160 maxDelayTime,
        uint256 nonce
    ) public {
        ContinuousVestingMerkleDistributor implementation;
        ContinuousVestingMerkleDistributor clone;
        ContinuousVestingMerkleDistributorFactory factory;
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        implementation = new ContinuousVestingMerkleDistributor();
        factory = new ContinuousVestingMerkleDistributorFactory(address(implementation));
        clone = factory.deployDistributor(
            IERC20(token), total, uri, start, cliff, end, merkleRoot, maxDelayTime, vm.addr(deployerPrivateKey), nonce
        );
        vm.stopBroadcast();
    }
}
