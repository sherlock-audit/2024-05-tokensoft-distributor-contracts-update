import { log } from "@graphprotocol/graph-ts";
import { SetContinuousVesting } from '../../../generated/templates/IContinuousVesting/IContinuousVesting'
import { ContinuousVesting } from '../../../generated/schema';

export function handleSetContinuousVesting(event: SetContinuousVesting): void {
  const continuousVestingId = `${event.address.toHexString()}-continuousVesting`
  log.info('Updating continuous vesting config {} - start {}, end {}, cliff {}', [continuousVestingId, event.params.start.toHex(), event.params.end.toHex(), event.params.cliff.toHex()])
  let continuousVesting = ContinuousVesting.load(continuousVestingId);
  if (continuousVesting) {
    continuousVesting.start = event.params.start
		continuousVesting.end = event.params.end
		continuousVesting.cliff = event.params.cliff
		continuousVesting.save()
  }
}
