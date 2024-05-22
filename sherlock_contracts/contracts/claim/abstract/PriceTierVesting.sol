// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {AdvancedDistributor, Distributor, IERC20} from "./AdvancedDistributor.sol";
import {IPriceTierVesting, PriceTier} from "../../interfaces/IPriceTierVesting.sol";
import "../../interfaces/IOracleOrL2OracleWithSequencerCheck.sol";

abstract contract PriceTierVesting is AdvancedDistributor, IPriceTierVesting {
    PriceTier[] private tiers;
    uint256 private start; // time vesting begins
    uint256 private end; // time vesting ends (all tokens are claimable)
    IOracleOrL2OracleWithSequencerCheck private oracle; // oracle providing prices

    constructor(
        IERC20 _token,
        uint256 _total,
        string memory _uri, // information on the sale (e.g. merkle proofs)
        uint256 _voteFactor,
        uint256 _start,
        uint256 _end,
        IOracleOrL2OracleWithSequencerCheck _oracle,
        PriceTier[] memory _tiers,
        uint160 _maxDelayTime,
        uint160 _salt
    )
        AdvancedDistributor(
            _token,
            _total,
            _uri,
            _voteFactor,
            10000,
            _maxDelayTime,
            _salt
        )
    {
        _setPriceTiers(_start, _end, _oracle, _tiers);
    }

    function _getOraclePrice() private view returns (uint256) {
        (
            uint80 roundID,
            int256 _price,
            ,
            /* uint256 startedAt */ uint256 timeStamp,
            uint80 answeredInRound
        ) = oracle.latestRoundData();

        require(_price > 0, "negative price");
        require(answeredInRound != 0, "answer == 0");
        require(timeStamp != 0, "round not complete");
        require(answeredInRound >= roundID, "stale price");

        return uint256(_price);
    }

    function getStart() external view override returns (uint256) {
        return start;
    }

    function getEnd() external view override returns (uint256) {
        return end;
    }

    function getOracle()
        external
        view
        override
        returns (IOracleOrL2OracleWithSequencerCheck)
    {
        return oracle;
    }

    function getPriceTier(uint256 i) public view returns (PriceTier memory) {
        return tiers[i];
    }

    function getPriceTiers() public view returns (PriceTier[] memory) {
        return tiers;
    }

    function getVestedFraction(
        address beneficiary,
        uint256 time, // time in seconds past epoch
        bytes memory /*data*/
    ) public view override returns (uint256) {
        // shift this user's time by their fair delay
        uint256 delayedTime = time - getFairDelayTime(beneficiary);

        // no tokens are vested
        if (delayedTime < start) {
            return 0;
        }

        // all tokens are vested
        if (delayedTime >= end) {
            return fractionDenominator;
        }

        uint256 price = _getOraclePrice();

        for (uint256 i = tiers.length; i != 0; ) {
            unchecked {
                --i;
            }
            if (price > tiers[i].price) {
                return tiers[i].vestedFraction;
            }
        }
        return 0;
    }

    function _setPriceTiers(
        uint256 _start,
        uint256 _end,
        IOracleOrL2OracleWithSequencerCheck _oracle,
        PriceTier[] memory _tiers
    ) private {
        require(_tiers.length > 0, "1+ price tiers required");

        delete tiers;

        uint128 highestPrice = 0;
        uint128 highestFraction = 0;

        for (uint256 i = 0; i < _tiers.length; ) {
            require(_tiers[i].price > highestPrice, "tier prices decrease");
            require(
                _tiers[i].vestedFraction > highestFraction,
                "vested fraction decreases"
            );
            highestPrice = _tiers[i].price;
            highestFraction = _tiers[i].vestedFraction;

            tiers.push(_tiers[i]);

            unchecked {
                ++i;
            }
        }

        require(
            highestFraction == fractionDenominator,
            "highest price tier must vest all tokens"
        );
        require(address(_oracle) != address(0), "oracle == address(0)");

        start = _start;
        end = _end;
        oracle = _oracle;
        emit SetPriceTierConfig(start, end, oracle, tiers);
    }

    // Adjustable admin functions
    function setPriceTiers(
        uint256 _start,
        uint256 _end,
        IOracleOrL2OracleWithSequencerCheck _oracle,
        PriceTier[] memory _tiers
    ) external onlyOwner {
        _setPriceTiers(_start, _end, _oracle, _tiers);
    }
}
