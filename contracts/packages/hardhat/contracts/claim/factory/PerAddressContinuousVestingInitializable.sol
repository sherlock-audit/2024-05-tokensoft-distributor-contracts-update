// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./AdvancedDistributorInitializable.sol";

abstract contract PerAddressContinuousVestingInitializable is Initializable, AdvancedDistributorInitializable {
    function __ContinuousVesting_init(
        IERC20 _token,
        uint256 _total,
        string memory _uri,
        uint160 _maxDelayTime,
        uint160 _salt,
        address _owner
    ) internal onlyInitializing {
        __AdvancedDistributor_init(
            _token,
            _total,
            _uri,
            10000, // 1x voting power
            10 ** 18, // provides the highest resolution possible for continuous vesting
            _maxDelayTime,
            _salt,
            _owner
        );
    }

    function getVestedFraction(
        address beneficiary,
        uint256 time, // time is in seconds past the epoch (e.g. block.timestamp)
        bytes memory data
    ) public view override returns (uint256) {
        (uint256 start, uint256 cliff, uint256 end) = abi.decode(data, (uint256, uint256, uint256));

        uint256 delayedTime = time - getFairDelayTime(beneficiary);
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
