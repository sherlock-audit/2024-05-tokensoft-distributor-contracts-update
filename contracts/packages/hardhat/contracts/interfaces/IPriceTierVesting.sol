// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IOracleOrL2OracleWithSequencerCheck.sol";

// time and vested fraction must monotonically increase in the tranche array
struct PriceTier {
	uint128 price; // block.timestamp upon which the tranche vests
	uint128 vestedFraction; // fraction of tokens unlockable
}

interface IPriceTierVesting {
	event SetPriceTierConfig(
		uint256 start,
		uint256 end,
		IOracleOrL2OracleWithSequencerCheck oracle,
		PriceTier[] tiers
	);

	function getStart() external view returns (uint256);

	function getEnd() external view returns (uint256);

	function getOracle() external view returns (IOracleOrL2OracleWithSequencerCheck);

	function getPriceTier(uint256 i) external view returns (PriceTier memory);

	function getPriceTiers() external view returns (PriceTier[] memory);

	function setPriceTiers(
		uint256 _start,
		uint256 _end,
		IOracleOrL2OracleWithSequencerCheck _oracle,
		PriceTier[] memory _tiers
	) external;
}
