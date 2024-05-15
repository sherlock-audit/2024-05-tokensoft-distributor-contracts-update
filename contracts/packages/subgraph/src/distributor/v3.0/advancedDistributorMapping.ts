import { log } from '@graphprotocol/graph-ts'
import { OwnershipTransferred, SweepToken, SweepNative, Adjust, SetToken, SetTotal, SetUri, SetVoteFactor, SetSweepRecipient } from "../../../generated/templates/AdvancedDistributor/AdvancedDistributor";

import { getDistributor, getAdvancedDistributor, getDistributionRecord, createAdjustment, getOrCreateAccount } from "../../lib";
import { IDistributor } from '../../../generated/templates/Distributor/IDistributor';

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
	log.info('Updating advanced distributor {} owner to {}', [event.address.toHexString(), event.params.newOwner.toHexString()])
	const advancedDistributor = getAdvancedDistributor(event.address);
	advancedDistributor.owner = event.params.newOwner.toHexString();
	advancedDistributor.save();
}

export function handleSweepToken(event: SweepToken): void {
	// TODO
}

export function handleSweepNative(event: SweepNative): void {
	// TODO
}

export function handleSweepRecipient(event: SetSweepRecipient): void {
	const advancedDistributor = getAdvancedDistributor(event.address);
	log.info('Updating distributor {} recipient to {}', [event.address.toHexString(), event.params.recipient.toHexString()])
	advancedDistributor.sweepRecipient = getOrCreateAccount(event.params.recipient, event.block).id;
	advancedDistributor.save();
}

export function handleAdjust(event: Adjust): void {
	const distributor = getDistributor(event.address);
	const advancedDistributor = getAdvancedDistributor(event.address);
	const distributionRecord = getDistributionRecord(event.address, event.params.beneficiary);
	const adjustment = createAdjustment(event.transaction, distributionRecord, event.params.amount, distributor.uris[0], event.block);

	distributor.total = distributor.total.plus(adjustment.amount);
	distributor.save();
}

export function handleSetToken(event: SetToken): void {
	log.info('Updating distributor {} token to {}', [event.address.toHexString(), event.params.token.toHexString()])
	const distributor = getDistributor(event.address);
	distributor.token = event.params.token;
	distributor.save();
}

export function handleSetTotal(event: SetTotal): void {
	log.info('Updating distributor {} total to {}', [event.address.toHexString(), event.params.total.toString()])
	const distributor = getDistributor(event.address);
	distributor.total = event.params.total;
	distributor.save();
}

export function handleSetUri(event: SetUri): void {
	// the uri emitted by the event is indexed, so the string value is hashed and we can't decode it
	// we can call into the contract to get it instead
	const distributorContract = IDistributor.bind(event.address);
	const uriResult = distributorContract.try_uri()
	const uri = uriResult.reverted ? 'unknown - uri() call failed' : uriResult.value

	log.info('Updating distributor {} uri to {}', [event.address.toHexString(), uri])
	const distributor = getDistributor(event.address);
  let uris: string[] = distributor.uris;
	uris.unshift(uri);
	distributor.uris = uris
	distributor.save()
}

export function handleSetVoteFactor(event: SetVoteFactor): void {
	const advancedDistributor = getAdvancedDistributor(event.address);
	advancedDistributor.voteFactor = event.params.voteFactor;
	advancedDistributor.save();
}
