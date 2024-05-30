// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import "../../contracts/claim/factory/TrancheVestingMerkleDistributor.sol";
import "../../contracts/claim/factory/TrancheVestingMerkleDistributorFactory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TrancheVestingMerkleDistributorTest is Test {
	TrancheVestingMerkleDistributor implementation;
	TrancheVestingMerkleDistributor clone;
	TrancheVestingMerkleDistributorFactory factory;
	ERC20 token = new ERC20("Test", "TEST");
	Tranche[] tranches = [Tranche({ time: 1, vestedFraction: 10000 })];

	function setUp() public {
		implementation = new TrancheVestingMerkleDistributor();
		factory = new TrancheVestingMerkleDistributorFactory(
			address(implementation)
		);
		clone = factory.deployDistributor(
			IERC20(token),
			1000,
			"uri",
			tranches,
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
			tranches,
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
