// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../interfaces/IOracleOrL2OracleWithSequencerCheck.sol";

/**
 * @title L2OracleWithSequencerCheck
 * @author 
 * @notice Data feed oracle for use on optimistic L2s (Arbiturm, Optimism, Base, 
 * Metis) that uses a data feed that tracks the last known status of the 
 * L2 sequencer at a given point in time, and reverts if the sequencer is 
 * down, or is up but a specified grace period has not passed.
 * 
 * @dev For a list of available Sequencer Uptime Feed proxy addresses, see: 
 * https://docs.chain.link/docs/data-feeds/l2-sequencer-feeds
 */
contract L2OracleWithSequencerCheck is IOracleOrL2OracleWithSequencerCheck {
    AggregatorV3Interface internal dataFeed;
    AggregatorV3Interface internal sequencerUptimeFeed;

    uint256 private constant GRACE_PERIOD_TIME = 3600;

    error SequencerDown();
    error GracePeriodNotOver();

    constructor(address _dataFeed, address _sequencerUptimeFeed) {
        dataFeed = AggregatorV3Interface(
            _dataFeed
        );
        sequencerUptimeFeed = AggregatorV3Interface(
            _sequencerUptimeFeed
        );
    }

    //// @dev Checks the sequencer status and returns the latest data
    function latestRoundData() public view returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
        (
            /*uint80 roundID*/,
            int256 _answer,
            uint256 _startedAt,
            /*uint256 updatedAt*/,
            /*uint80 answeredInRound*/
        ) = sequencerUptimeFeed.latestRoundData();

        // Answer == 0: Sequencer is up
        // Answer == 1: Sequencer is down
        bool isSequencerUp = _answer == 0;
        if (!isSequencerUp) {
            revert SequencerDown();
        }

        // Make sure the grace period has passed after the
        // sequencer is back up.
        uint256 timeSinceUp = block.timestamp - _startedAt;
        if (timeSinceUp <= GRACE_PERIOD_TIME) {
            revert GracePeriodNotOver();
        }

        return dataFeed.latestRoundData();
    }

    function decimals() public view returns (uint8) {
        return dataFeed.decimals();
    }
}
