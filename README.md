
# Tokensoft Distributor Contracts Update contest details

- Join [Sherlock Discord](https://discord.gg/MABEWyASkp)
- Submit findings using the issue page in your private contest repo (label issues as med or high)
- [Read for more details](https://docs.sherlock.xyz/audits/watsons)

# Q&A

### Q: On what chains are the smart contracts going to be deployed?
Any EVM-compatible networks (Ethereum, Base, Polygon, BSC, etc.)
___

### Q: If you are integrating tokens, are you allowing only whitelisted tokens to work with the codebase or any complying with the standard? Are they assumed to have certain properties, e.g. be non-reentrant? Are there any types of <a href="https://github.com/d-xo/weird-erc20" target="_blank" rel="noopener noreferrer">weird tokens</a> you want to integrate?
Any Standard ERC-20 Token and USDC/USDT
___

### Q: Are the admins of the protocols your contracts integrate with (if any) TRUSTED or RESTRICTED? If these integrations are trusted, should auditors also assume they are always responsive, for example, are oracles trusted to provide non-stale information, or VRF providers to respond within a designated timeframe?
RESTRICTED - There are no external integrations.
___

### Q: Are there any protocol roles? Please list them and provide whether they are TRUSTED or RESTRICTED, or provide a more comprehensive description of what a role can and can't do/impact.
It is safe to assume that the owner of these distributor contracts are trusted. They should be able to sweep the funds and also add / remove tokens as well.
___

### Q: For permissioned functions, please list all checks and requirements that will be made before calling the function.
There are many functions which have an onlyOwner modifier, onlyRole(ADMIN_ROLE) modifier, and onlyInitializing modifier.
___

### Q: Is the codebase expected to comply with any EIPs? Can there be/are there any deviations from the specification?
No
___

### Q: Are there any off-chain mechanisms or off-chain procedures for the protocol (keeper bots, arbitrage bots, etc.)?
No
___

### Q: If the codebase is to be deployed on an L2, what should be the behavior of the protocol in case of sequencer issues (if applicable)? Should Sherlock assume that the Sequencer won't misbehave, including going offline?
We assume Sequencer won't misbehave or go offline.
___

### Q: Should potential issues, like broken assumptions about function behavior, be reported if they could pose risks in future integrations, even if they might not be an issue in the context of the scope? If yes, can you elaborate on properties/invariants that should hold?
Yes, please tells us about any potential issues.
___

### Q: Please discuss any design choices you made.
The PerAddress prefix attached to contracts are a variation of existing contracts (i.e. PerAddressTrancheVestingMerkleDistributor.sol) which have been previously audited.

The distribution records are initialized by passing in a merkle proof, representing the user's vesting schedule, and on claim the merkle proof is also provided and validated before the claim is executed.
___

### Q: Please list any known issues/acceptable risks that should not result in a valid finding.
Some known issues may exist from a previous Sherlock audit (see: 2023-06-tokensoft-judging on Github).
___

### Q: We will report issues where the core protocol functionality is inaccessible for at least 7 days. Would you like to override this value?
No
___

### Q: Please provide links to previous audits (if any).
https://github.com/sherlock-audit/2023-06-tokensoft-judging
https://drive.google.com/file/d/1NN9_7hyEe5XXXjZ9ghgLFbbNNXLskMw6/view
https://drive.google.com/file/d/1RgWGgAtBJIpqFpNQtLfRXT6ZOzoUbs8c/view
___

### Q: Please list any relevant protocol resources.
https://github.com/SoftDAO/contracts
https://www.tokensoft.com/
___

### Q: Additional audit information.
n/a
___



# Audit scope


[contracts @ fb34000f9b2e0863c5e9fb001caf52de0e47cfee](https://github.com/SoftDAO/contracts/tree/fb34000f9b2e0863c5e9fb001caf52de0e47cfee)
- [contracts/packages/hardhat/contracts/claim/PerAddressContinuousVestingMerkle.sol](contracts/packages/hardhat/contracts/claim/PerAddressContinuousVestingMerkle.sol)
- [contracts/packages/hardhat/contracts/claim/PerAddressTrancheVestingMerkle.sol](contracts/packages/hardhat/contracts/claim/PerAddressTrancheVestingMerkle.sol)
- [contracts/packages/hardhat/contracts/claim/abstract/AdvancedDistributor.sol](contracts/packages/hardhat/contracts/claim/abstract/AdvancedDistributor.sol)
- [contracts/packages/hardhat/contracts/claim/abstract/Distributor.sol](contracts/packages/hardhat/contracts/claim/abstract/Distributor.sol)
- [contracts/packages/hardhat/contracts/claim/abstract/MerkleSet.sol](contracts/packages/hardhat/contracts/claim/abstract/MerkleSet.sol)
- [contracts/packages/hardhat/contracts/claim/abstract/PerAddressContinuousVesting.sol](contracts/packages/hardhat/contracts/claim/abstract/PerAddressContinuousVesting.sol)
- [contracts/packages/hardhat/contracts/claim/abstract/PerAddressTrancheVesting.sol](contracts/packages/hardhat/contracts/claim/abstract/PerAddressTrancheVesting.sol)
- [contracts/packages/hardhat/contracts/claim/factory/AdvancedDistributorInitializable.sol](contracts/packages/hardhat/contracts/claim/factory/AdvancedDistributorInitializable.sol)
- [contracts/packages/hardhat/contracts/claim/factory/DistributorInitializable.sol](contracts/packages/hardhat/contracts/claim/factory/DistributorInitializable.sol)
- [contracts/packages/hardhat/contracts/claim/factory/FairQueueInitializable.sol](contracts/packages/hardhat/contracts/claim/factory/FairQueueInitializable.sol)
- [contracts/packages/hardhat/contracts/claim/factory/MerkleSetInitializable.sol](contracts/packages/hardhat/contracts/claim/factory/MerkleSetInitializable.sol)
- [contracts/packages/hardhat/contracts/claim/factory/PerAddressContinuousVestingInitializable.sol](contracts/packages/hardhat/contracts/claim/factory/PerAddressContinuousVestingInitializable.sol)
- [contracts/packages/hardhat/contracts/claim/factory/PerAddressContinuousVestingMerkleDistributor.sol](contracts/packages/hardhat/contracts/claim/factory/PerAddressContinuousVestingMerkleDistributor.sol)
- [contracts/packages/hardhat/contracts/claim/factory/PerAddressContinuousVestingMerkleDistributorFactory.sol](contracts/packages/hardhat/contracts/claim/factory/PerAddressContinuousVestingMerkleDistributorFactory.sol)
- [contracts/packages/hardhat/contracts/claim/factory/PerAddressTrancheVestingInitializable.sol](contracts/packages/hardhat/contracts/claim/factory/PerAddressTrancheVestingInitializable.sol)
- [contracts/packages/hardhat/contracts/claim/factory/PerAddressTrancheVestingMerkleDistributor.sol](contracts/packages/hardhat/contracts/claim/factory/PerAddressTrancheVestingMerkleDistributor.sol)
- [contracts/packages/hardhat/contracts/claim/factory/PerAddressTrancheVestingMerkleDistributorFactory.sol](contracts/packages/hardhat/contracts/claim/factory/PerAddressTrancheVestingMerkleDistributorFactory.sol)
- [contracts/packages/hardhat/contracts/interfaces/IDistributor.sol](contracts/packages/hardhat/contracts/interfaces/IDistributor.sol)
- [contracts/packages/hardhat/contracts/interfaces/ITrancheVesting.sol](contracts/packages/hardhat/contracts/interfaces/ITrancheVesting.sol)
- [contracts/packages/hardhat/contracts/utilities/Registry.sol](contracts/packages/hardhat/contracts/utilities/Registry.sol)
- [contracts/packages/hardhat/contracts/utilities/Sweepable.sol](contracts/packages/hardhat/contracts/utilities/Sweepable.sol)

