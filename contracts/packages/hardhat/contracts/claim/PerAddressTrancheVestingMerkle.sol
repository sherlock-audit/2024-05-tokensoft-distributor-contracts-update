// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import { PerAddressTrancheVesting, Tranche } from './abstract/PerAddressTrancheVesting.sol';
import { MerkleSet } from './abstract/MerkleSet.sol';

contract PerAddressTrancheVestingMerkle is PerAddressTrancheVesting, MerkleSet {
  constructor(
    IERC20 _token,
    uint256 _total,
    string memory _uri, // information on the sale (e.g. merkle proofs)
    uint256 _voteFactor,
    bytes32 _merkleRoot,
    uint160 _maxDelayTime // the maximum delay time for the fair queue
  )
    PerAddressTrancheVesting(
      _token,
      _total,
      _uri,
      _voteFactor,
      _maxDelayTime,
      uint160(uint256(_merkleRoot))
    )
    MerkleSet(_merkleRoot)
  {}

  function NAME() external pure override returns (string memory) {
    return 'PerAddressTrancheVestingMerkle';
  }

  function VERSION() external pure override returns (uint256) {
    return 4;
  }

  function initializeDistributionRecord(
    uint256 index, // the beneficiary's index in the merkle root
    address beneficiary, // the address that will receive tokens
    uint256 amount, // the total claimable by this beneficiary
    Tranche[] calldata tranches, // the tranches for the beneficiary (users can have different vesting schedules)
    bytes32[] calldata merkleProof
  )
    external
    validMerkleProof(keccak256(abi.encodePacked(index, beneficiary, amount, abi.encode(tranches))), merkleProof)
  {
    _initializeDistributionRecord(beneficiary, amount);
  }

  function claim(
    uint256 index, // the beneficiary's index in the merkle root
    address beneficiary, // the address that will receive tokens
    uint256 totalAmount, // the total claimable by this beneficiary
    // TODO: should we be providing the tranches already abi encoded to save gas?
    Tranche[] calldata tranches, // the tranches for the beneficiary (users can have different vesting schedules)
    bytes32[] calldata merkleProof
  )
    external
    validMerkleProof(keccak256(abi.encodePacked(index, beneficiary, totalAmount, abi.encode(tranches))), merkleProof)
    nonReentrant
  {
    bytes memory data = abi.encode(tranches);
    // effects
    uint256 claimedAmount = _executeClaim(beneficiary, totalAmount, data);
    // interactions
    _settleClaim(beneficiary, claimedAmount);
  }

  function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
    _setMerkleRoot(_merkleRoot);
  }
}
