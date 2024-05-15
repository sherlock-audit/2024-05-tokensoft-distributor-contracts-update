// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import { PerAddressContinuousVesting } from './abstract/PerAddressContinuousVesting.sol';
import { MerkleSet } from './abstract/MerkleSet.sol';

contract PerAddressContinuousVestingMerkle is PerAddressContinuousVesting, MerkleSet {

  constructor(
    IERC20 _token, // the token being claimed
    uint256 _total, // the total claimable by all users
    string memory _uri, // information on the sale (e.g. merkle proofs)
    uint256 _voteFactor, // votes have this weight
    bytes32 _merkleRoot, // the merkle root for claim membership (also used as salt for the fair queue delay time),
    uint160 _maxDelayTime // the maximum delay time for the fair queue
  )
    PerAddressContinuousVesting(
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
    return 'PerAddressContinuousVestingMerkle';
  }

  function VERSION() external pure override returns (uint256) {
    return 4;
  }

  function initializeDistributionRecord(
    uint256 index, // the beneficiary's index in the merkle root
    address beneficiary, // the address that will receive tokens
    uint256 amount, // the total claimable by this beneficiary
    uint256 start, // the start of the vesting period
    uint256 cliff, // cliff time
    uint256 end, // the end of the vesting period
    bytes32[] calldata merkleProof
  )
    external
    validMerkleProof(keccak256(abi.encodePacked(index, beneficiary, amount, start, cliff, end)), merkleProof)
  {
    _initializeDistributionRecord(beneficiary, amount);
  }

  function claim(
    uint256 index, // the beneficiary's index in the merkle root
    address beneficiary, // the address that will receive tokens
    uint256 totalAmount, // the total claimable by this beneficiary
    uint256 start, // the start of the vesting period
    uint256 cliff, // cliff time
    uint256 end, // the end of the vesting period
    bytes32[] calldata merkleProof
  )
    external
    validMerkleProof(keccak256(abi.encodePacked(index, beneficiary, totalAmount, start, cliff, end)), merkleProof)
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
