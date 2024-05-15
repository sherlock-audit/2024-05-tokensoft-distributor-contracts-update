// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import { Distributor, AdvancedDistributor } from "./AdvancedDistributor.sol";
import { IContinuousVesting } from "../../interfaces/IContinuousVesting.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract ContinuousVesting is AdvancedDistributor, IContinuousVesting {
	uint256 private start; // time vesting clock begins
	uint256 private cliff; // time vesting begins (all tokens vested prior to the cliff are immediately claimable)
	uint256 private end; // time vesting clock ends

	constructor(
		IERC20 _token,
		uint256 _total,
		string memory _uri,
		uint256 _voteFactor,
		uint256 _start,
		uint256 _cliff,
		uint256 _end,
    uint160 _maxDelayTime,
		uint160 _salt
	)
		// use a large fraction denominator to provide the highest resolution on continuous vesting.
		AdvancedDistributor(_token, _total, _uri, _voteFactor, 10**18, _maxDelayTime, _salt)
	{
		require(_start <= _cliff, "vesting cliff before start");
		require(_cliff <= _end, "vesting end before cliff");
		require(_end <= 4102444800, "vesting ends after 4102444800 (Jan 1 2100)");

		start = _start;
		cliff = _cliff;
		end = _end;

		emit SetContinuousVesting(start, cliff, end);
	}

	function getVestedFraction(
		address beneficiary,
		uint256 time, // time is in seconds past the epoch (e.g. block.timestamp)
    bytes memory /*data*/
	) public view override returns (uint256) {
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

	function getVestingConfig()
		external
		view
		returns (
			uint256,
			uint256,
			uint256
		)
	{
		return (start, cliff, end);
	}

	// Adjustable admin functions
	function setVestingConfig(
		uint256 _start,
		uint256 _cliff,
		uint256 _end
	) external onlyOwner {
		start = _start;
		cliff = _cliff;
		end = _end;
		emit SetContinuousVesting(start, cliff, end);
	}
}
