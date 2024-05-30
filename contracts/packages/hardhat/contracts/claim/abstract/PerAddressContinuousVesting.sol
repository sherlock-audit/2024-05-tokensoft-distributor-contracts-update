// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import { Distributor, AdvancedDistributor } from "./AdvancedDistributor.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract PerAddressContinuousVesting is AdvancedDistributor {
	constructor(
		IERC20 _token,
		uint256 _total,
		string memory _uri,
		uint256 _voteFactor,
    uint160 _maxDelayTime,
		uint160 _salt
	)
		// use a large fraction denominator to provide the highest resolution on continuous vesting.
		AdvancedDistributor(_token, _total, _uri, _voteFactor, 10**18, _maxDelayTime, _salt)
	{}

	function getVestedFraction(
		address beneficiary,
		uint256 time, // time is in seconds past the epoch (e.g. block.timestamp)
    bytes memory data
	) public view override returns (uint256) {
    (uint256 start, uint256 cliff, uint256 end) = abi.decode(data, (uint256, uint256, uint256));

		uint256 delayedTime = time- getFairDelayTime(beneficiary);
		// no tokens are vested
		if (delayedTime <= cliff) {
			return 0;
		}

		// all tokens are vested
		if (delayedTime >= end) {
			return fractionDenominator;
		}

		// some tokens are vested
		return (fractionDenominator * (delayedTime - start)) / (end - start);
	}
}
