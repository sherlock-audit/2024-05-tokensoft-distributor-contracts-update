// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

import { DistributionRecord } from '../interfaces/IDistributor.sol';
import { TrancheVesting, Tranche } from './abstract/TrancheVesting.sol';
import { MerkleSet } from './abstract/MerkleSet.sol';
import { FlatPriceSale } from '../sale/v2/FlatPriceSale.sol';

contract TrancheVestingSale_2_0 is TrancheVesting {
  FlatPriceSale public immutable sale;
  uint256 public immutable price;
  uint8 public immutable soldTokenDecimals;

  modifier validSaleParticipant(address beneficiary) {
    require(sale.buyerTotal(beneficiary) != 0, 'no purchases found');

    _;
  }

  constructor(
    FlatPriceSale _sale, // where the purchase occurred
    IERC20 _token, // the purchased token
    uint8 _soldTokenDecimals, // the number of decimals used by the purchased token
    // the price of the purchased token denominated in the sale's base currency with 8 decimals
    // e.g. if the sale was selling $FOO at $0.55 per token, price = 55000000
    uint256 _price,
    Tranche[] memory tranches, // vesting tranches
    uint256 voteWeightBips, // the factor for voting power (e.g. 15000 means users have a 50% voting bonus for unclaimed tokens)
    string memory _uri // information on the sale (e.g. merkle proofs)
  )
    TrancheVesting(
      _token,
      (_sale.total() * 10 ** _soldTokenDecimals) / _price,
      _uri,
      voteWeightBips,
      tranches,
      0, // no delay
      0 // no salt
    )
  {
    require(address(_sale) != address(0), 'TVS_2_0_D: sale is address(0)');

    // previously deployed v2.0 sales did not implement the isOver() method
    (, , , , , , uint256 endTime, , ) = _sale.config();
    require(endTime < block.timestamp, 'TVS_2_0_D: sale not over yet');
    require(_price != 0, 'TVS_2_0_D: price is 0');

    sale = _sale;
    soldTokenDecimals = _soldTokenDecimals;
    price = _price;
  }

  function NAME() external pure virtual override returns (string memory) {
    return 'TrancheVestingSale_2_0';
  }

  // File specific version - starts at 1, increments on every solidity diff
  function VERSION() external pure virtual override returns (uint256) {
    return 5;
  }

  function getPurchasedAmount(address buyer) public view returns (uint256) {
    /**
    Get the quantity purchased from the sale and convert it to native tokens
  
    Example: if a user buys $1.11 of a FOO token worth $0.50 each, the purchased amount will be 2.22 FOO
    - buyer total: 111000000 ($1.11 with 8 decimals)
    - decimals: 6 (the token being purchased has 6 decimals)
    - price: 50000000 ($0.50 with 8 decimals)

    Calculation: 111000000 * 1000000 / 50000000

    Returns purchased amount: 2220000 (2.22 with 6 decimals)
    */
    return (sale.buyerTotal(buyer) * (10 ** soldTokenDecimals)) / price;
  }

  function initializeDistributionRecord(
    address beneficiary // the address that will receive tokens
  ) external validSaleParticipant(beneficiary) {
    _initializeDistributionRecord(beneficiary, getPurchasedAmount(beneficiary));
  }

  function claim(
    address beneficiary // the address that will receive tokens
  ) external validSaleParticipant(beneficiary) nonReentrant {
    uint256 totalClaimableAmount = getTotalClaimableAmount(beneficiary);

    // effects
    uint256 claimedAmount = super._executeClaim(beneficiary, totalClaimableAmount, new bytes(0));
    
    // interactions
    _settleClaim(beneficiary, claimedAmount);
  }

  function getDistributionRecord(
    address beneficiary
  ) external view virtual override returns (DistributionRecord memory) {
    DistributionRecord memory record = records[beneficiary];

    // workaround prior to initialization
    if (!record.initialized) {
      record.total = uint120(getPurchasedAmount(beneficiary));
    }
    return record;
  }

  // get the number of tokens currently claimable by a specific user
  function getClaimableAmount(address beneficiary, bytes memory data) public view override returns (uint256) {
    if (records[beneficiary].initialized) return super.getClaimableAmount(beneficiary, data);

    // we can get the claimable amount prior to initialization
    return
      (getPurchasedAmount(beneficiary) * getVestedFraction(beneficiary, block.timestamp, new bytes(0))) /
      fractionDenominator;
  }

  // get the total number of tokens claimable regardless of vesting
  function getTotalClaimableAmount(address beneficiary) internal view returns (uint256) {
    // check the distribution record first, if the user's claimable
    // amount was adjusted, it will be initialized/total updated
    if (records[beneficiary].initialized) return records[beneficiary].total;

    return getPurchasedAmount(beneficiary);
  }
}
