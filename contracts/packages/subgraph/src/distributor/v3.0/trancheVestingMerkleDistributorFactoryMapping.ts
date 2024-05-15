import { DistributorDeployed } from '../../../generated/TrancheVestingMerkleDistributorFactory/TrancheVestingMerkleDistributorFactory'
import { getOrCreateAdvancedDistributor, getOrCreateTrancheVesting, getOrCreateMerkleSet } from '../../lib'

export function handleDistributorDeployed(event: DistributorDeployed): void {
  const distributorAddress = event.params.distributor.toHexString()
  getOrCreateAdvancedDistributor(distributorAddress, event.block)
  getOrCreateTrancheVesting(distributorAddress, event.block)
  getOrCreateMerkleSet(distributorAddress, event.block)
}
