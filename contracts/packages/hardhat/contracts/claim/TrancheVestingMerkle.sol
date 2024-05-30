// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import { TrancheVesting, Tranche } from './abstract/TrancheVesting.sol';
import { MerkleSet } from './abstract/MerkleSet.sol';

contract TrancheVestingMerkle is TrancheVesting, MerkleSet {
  constructor(
    IERC20 _token,
    uint256 _total,
    string memory _uri, // information on the sale (e.g. merkle proofs)
    uint256 _voteFactor,
    Tranche[] memory _tranches,
    bytes32 _merkleRoot,
    uint160 _maxDelayTime // the maximum delay time for the fair queue
  )
    TrancheVesting(
      _token,
      _total,
      _uri,
      _voteFactor,
      _tranches,
      _maxDelayTime,
      uint160(uint256(_merkleRoot))
    )
    MerkleSet(_merkleRoot)
  {}

  function NAME() external pure override returns (string memory) {
    return 'TrancheVestingMerkle';
  }

  function VERSION() external pure override returns (uint256) {
    return 3;
  }

  function initializeDistributionRecord(
    uint256 index, // the beneficiary's index in the merkle root
    address beneficiary, // the address that will receive tokens
    uint256 amount, // the total claimable by this beneficiary
    bytes32[] calldata merkleProof
  )
    external
    validMerkleProof(keccak256(abi.encodePacked(index, beneficiary, amount)), merkleProof)
  {
    _initializeDistributionRecord(beneficiary, amount);
  }

  function claim(
    uint256 index, // the beneficiary's index in the merkle root
    address beneficiary, // the address that will receive tokens
    uint256 totalAmount, // the total claimable by this beneficiary
    bytes32[] calldata merkleProof
  )
    external
    validMerkleProof(keccak256(abi.encodePacked(index, beneficiary, totalAmount)), merkleProof)
    nonReentrant
  {
    // effects
    uint256 claimedAmount = _executeClaim(beneficiary, totalAmount, new bytes(0));
    // interactions
    _settleClaim(beneficiary, claimedAmount);
  }

  function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
    _setMerkleRoot(_merkleRoot);
  }
}
