// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./AdvancedDistributorInitializable.sol";
import {Tranche} from "../../interfaces/ITrancheVesting.sol";

abstract contract PerAddressTrancheVestingInitializable is
    Initializable,
    AdvancedDistributorInitializable
{
    function __PerAddressTrancheVesting_init(
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
            10000, // vested fraction
            _maxDelayTime,
            _salt,
            _owner
        );
    }

    /**
     * @notice Get the vested fraction for a beneficiary at a given time.
     * @dev Before the first tranche time, the vested fraction will be 0. At times between
     * tranche_i and tranche_i+1, the vested fraction will be tranche_i+1's vested fraction.
     * After the last tranche time, the vested fraction will be the fraction denominator.
     */
    function getVestedFraction(
        address beneficiary,
        uint256 time,
        bytes memory data
    ) public view override returns (uint256) {
        Tranche[] memory tranches = abi.decode(data, (Tranche[]));

        uint256 delay = getFairDelayTime(beneficiary);
        for (uint256 i = tranches.length; i != 0; ) {
            unchecked {
                --i;
            }

            if (time - delay > tranches[i].time) {
                return tranches[i].vestedFraction;
            }
        }

        return 0;
    }
}
