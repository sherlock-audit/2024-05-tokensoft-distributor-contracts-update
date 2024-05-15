// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import "../../contracts/claim/factory/ContinuousVestingMerkleDistributor.sol";
import "../../contracts/claim/factory/ContinuousVestingMerkleDistributorFactory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ContinuousVestingMerkleDistributorTest is Test {
    ContinuousVestingMerkleDistributor implementation;
    ContinuousVestingMerkleDistributor clone;
    ContinuousVestingMerkleDistributorFactory factory;
    ERC20 token = new ERC20("Test", "TEST");

    function setUp() public {
        implementation = new ContinuousVestingMerkleDistributor();
        factory = new ContinuousVestingMerkleDistributorFactory(address(implementation));
        clone = factory.deployDistributor(
            IERC20(token),
            1000,
            "uri",
            1698796800,
            1698796800,
            1730419200,
            bytes32(0),
            0,
            address(this),
            0
        );
    }

    function test_Initialize_fails_as_disabled() public {
        vm.expectRevert("Initializable: contract is already initialized");
        implementation.initialize(
            IERC20(address(0)),
            0,
            "",
            0,
            0,
            0,
            bytes32(0),
            0,
            address(0)
        );
    }

    function test_TransferOwnership_fails_as_not_owner() public {
        vm.startPrank(address(1));
        
        vm.expectRevert("Ownable: caller is not the owner");
        implementation.transferOwnership(address(1));
        
        vm.expectRevert("Ownable: caller is not the owner");
        clone.transferOwnership(address(1));
    }

    function test_SetSweepRecipient_fails_as_not_owner() public {
        vm.startPrank(address(1));
        
        vm.expectRevert("Ownable: caller is not the owner");
        implementation.setSweepRecipient(payable(address(1)));
        
        vm.expectRevert("Ownable: caller is not the owner");
        clone.setSweepRecipient(payable(address(1)));
    }
}
