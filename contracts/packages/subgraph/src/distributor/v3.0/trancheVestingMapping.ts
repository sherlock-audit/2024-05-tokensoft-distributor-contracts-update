import { log, store } from '@graphprotocol/graph-ts'
import { SetTranche } from '../../../generated/templates/TrancheVesting/ITrancheVesting'
import { getDistributor } from '../../lib';
import { Tranche, TrancheVesting } from '../../../generated/schema';

export function handleSetTranche(event: SetTranche): void {
	const trancheVestingId = event.address.toHexString() + '-trancheVesting'
  let trancheVesting = TrancheVesting.load(trancheVestingId);

  if (trancheVesting) {
    const trancheId = trancheVestingId + '-' + event.params.index.toString();
    let tranche = Tranche.load(trancheId);

    if (!tranche) {
      tranche = new Tranche(trancheId);
      tranche.trancheVesting = trancheVestingId;
      tranche.index = event.params.index;
      tranche.createdAt = event.block.timestamp;
    } else {
      if (event.params.index.toString() == '0') {
        // delete all existing tranches for this distributor
        if (!trancheVesting) {
          trancheVesting = new TrancheVesting(trancheVestingId)
          trancheVesting.distributor = event.address.toHexString();
          trancheVesting.createdAt = event.block.timestamp;
        }
        
        let checkForMoreTranches = true
        let i = 1
        while (checkForMoreTranches) {
          const trancheId = trancheVestingId + `-${i}`
          let foundTranche = Tranche.load(trancheId);
          
          if (foundTranche) {
            store.remove('Tranche', foundTranche.id);
            i++;
          }  else  {
            checkForMoreTranches = false
          }
        }
      }
    }
	
    tranche.time = event.params.time;
    tranche.vestedFraction = event.params.VestedFraction;

	  tranche.save();
  }
}