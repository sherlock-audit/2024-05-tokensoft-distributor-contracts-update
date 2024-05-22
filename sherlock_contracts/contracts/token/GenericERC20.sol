// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract GenericERC20 is ERC20 {
    uint8 private _customDecimals;

    /**
     * @dev Init constructor for setting token name and symbol
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 customDecimals,
        uint256 mintedTokens_
    ) ERC20(name_, symbol_) {
        _mint(msg.sender, mintedTokens_);
        _customDecimals = customDecimals;
    }

    function decimals() public view virtual override returns (uint8) {
        return _customDecimals;
    }
}
