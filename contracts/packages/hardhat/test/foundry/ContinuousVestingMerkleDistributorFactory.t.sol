// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import "forge-std/Test.sol";

import "../../contracts/claim/factory/ContinuousVestingMerkleDistributorFactory.sol";
import "../../contracts/claim/factory/ContinuousVestingMerkleDistributor.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ContinuousVestingMerkleDistributorFactoryTest is Test {
	ContinuousVestingMerkleDistributor implementation;
	ContinuousVestingMerkleDistributor clone;
	ContinuousVestingMerkleDistributorFactory factory;
	ERC20 token = new ERC20("Test", "TEST");

	function setUp() public {
		implementation = new ContinuousVestingMerkleDistributor();
		factory = new ContinuousVestingMerkleDistributorFactory(
			address(implementation)
		);
	}

	function test_SetUp() public {
		assertEq(address(factory.getImplementation()), address(implementation));
	}

	function test_DeployDistributor() public {
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

		assertEq(clone.owner(), address(this));
		assertEq(clone.getSweepRecipient(), address(this));
	}

	function test_PredictDistributorAddress() public {
		address nextCloneAddress = factory.predictDistributorAddress(
			IERC20(token),
			1000,
			"uri",
			1698796800,
			1698796800,
			1730419200,
			bytes32(0),
			0,
			address(this),
			1
		);
		ContinuousVestingMerkleDistributor nextClone = factory
			.deployDistributor(
				IERC20(token),
				1000,
				"uri",
				1698796800,
				1698796800,
				1730419200,
				bytes32(0),
				0,
				address(this),
				1
			);

		assertEq(nextCloneAddress, address(nextClone));
	}
}
