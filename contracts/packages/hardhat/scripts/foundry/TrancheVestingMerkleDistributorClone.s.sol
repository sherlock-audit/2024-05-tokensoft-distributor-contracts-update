// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Script} from "forge-std/Script.sol";
import {TrancheVestingMerkleDistributor} from
    "../../contracts/claim/factory/TrancheVestingMerkleDistributor.sol";
import {TrancheVestingMerkleDistributorFactory} from
    "../../contracts/claim/factory/TrancheVestingMerkleDistributorFactory.sol";
import {Tranche} from "../../contracts/interfaces/ITrancheVesting.sol";

// you can run this script with dynamic clone args (except for the tranches, see below) like this:
// forge script script/foundry/TrancheVestingMerkleDistributorClone.s.sol:TrancheVestingMerkleDistributorCloneScript \
// --sig "run(address,uint256,string,bytes32,uint160,uint256)" \
// 0x75DF62a7E0a37b0E00aEC2d8D7D477B3e689094F 1000000000000000000000 "ipfs://" 0x00000000000000000000000000000000 0 0 -vvvv

contract TrancheVestingMerkleDistributorCloneScript is Script {
    function run(
        address token,
        uint256 total,
        string calldata uri,
        bytes32 merkleRoot,
        uint160 maxDelayTime,
        uint256 nonce
    ) public {
        // couldn't figure out how to set tranches from command line
        // be sure to set tranches here prior to running this script to deploy to 
        // test/mainnets
        Tranche[] memory tranches = new Tranche[](1);
        tranches[0] = Tranche(1, 10000);
        TrancheVestingMerkleDistributor implementation;
        TrancheVestingMerkleDistributor clone;
        TrancheVestingMerkleDistributorFactory factory;
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        implementation = new TrancheVestingMerkleDistributor();
        factory = new TrancheVestingMerkleDistributorFactory(address(implementation));
        clone = factory.deployDistributor(
            IERC20(token), total, uri, tranches, merkleRoot, maxDelayTime, vm.addr(deployerPrivateKey), nonce
        );
        vm.stopBroadcast();
    }
}
