import { DistributorDeployed } from '../../../generated/ContinuousVestingMerkleDistributorFactory/ContinuousVestingMerkleDistributorFactory'
import { getOrCreateAdvancedDistributor, getOrCreateContinuousVesting, getOrCreateMerkleSet } from '../../lib'

export function handleDistributorDeployed(event: DistributorDeployed): void {
  const distributorAddress = event.params.distributor.toHexString()
  getOrCreateAdvancedDistributor(distributorAddress, event.block)
  getOrCreateContinuousVesting(distributorAddress, event.block)
  getOrCreateMerkleSet(distributorAddress, event.block)
}
