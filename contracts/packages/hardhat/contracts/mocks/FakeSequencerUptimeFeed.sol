// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV2V3Interface.sol";

contract FakeSequencerUptimeFeed is AggregatorV2V3Interface {
	int256 private answer;
	string private oracleDescription;
	uint256 private startedAt = 1692820776;
	uint256 private updatedAt = 1692820776;

	constructor(int256 _answer, string memory _oracleDescription) {
		answer = _answer;
		oracleDescription = _oracleDescription;
	}

	function decimals() external pure returns (uint8) {
		return 0;
	}

	function description() external view returns (string memory) {
		return oracleDescription;
	}

	function version() external pure returns (uint256) {
		return 1;
	}

	function setAnswer(int256 _answer) public {
		answer = _answer;
		startedAt = block.timestamp;
		updatedAt = block.timestamp;
	}

  function getAnswer(uint256 /* roundId */) external view returns (int256) {
    return answer;
  }

  function getTimestamp(uint256 /* roundId */) external view returns (uint256) {
    return startedAt;
  }

  function latestAnswer() external view returns (int256) {
    return answer;
  }

  function latestRound() external pure returns (uint256) {
    return 18446744073709552139;
  }

  function latestTimestamp() external view returns (uint256) {
    return startedAt;
  }

	function latestRoundData()
		external
		view
		returns (
			uint80 roundId,
			int256,
			uint256,
			uint256,
			uint80 answeredInRound
		)
	{
		return (18446744073709552139, answer, startedAt, updatedAt, 18446744073709552139);
	}

	function getRoundData(uint80 /* roundId */)
		external
		view
		returns (
			uint80 roundId,
			int256,
			uint256,
			uint256,
			uint80 answeredInRound
		)
	{
		return (18446744073709552139, answer, startedAt, updatedAt, 18446744073709552139);
	}
}
