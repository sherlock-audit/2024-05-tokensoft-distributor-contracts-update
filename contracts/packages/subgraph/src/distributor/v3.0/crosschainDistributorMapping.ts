import { log, BigInt, dataSource } from "@graphprotocol/graph-ts";
import { CrosschainClaim } from "../../../generated/templates/CrosschainDistributor/CrosschainDistributor";
import { Claim } from "../../../generated/schema";
import { getOrCreateAccount, getOrCreateDistributor, getDistributor, getOrCreateDistributionRecord, createClaim } from '../../lib';

const networkToChainId = new Map<string, i32>();
networkToChainId.set('arbitrum-one', 42161);
networkToChainId.set('arbitrum-goerli', 421613);
networkToChainId.set('avalanche', 43114);
networkToChainId.set('fuji', 43113);
networkToChainId.set('gnosis', 100);
networkToChainId.set('goerli', 5);
networkToChainId.set('mainnet', 1);
networkToChainId.set('matic', 137);
networkToChainId.set('mumbai', 80001);
networkToChainId.set('optimism', 10);
networkToChainId.set('optimism-goerli', 420);

const domainIdToChainId = new Map<i32, i32>();
domainIdToChainId.set(6448936, 1);
domainIdToChainId.set(1869640809, 10);
domainIdToChainId.set(1886350457, 137);
domainIdToChainId.set(1634886255, 42161);
domainIdToChainId.set(6450786, 56);
domainIdToChainId.set(6778479, 100);
domainIdToChainId.set(1735353714, 5);
domainIdToChainId.set(1735356532, 420);
domainIdToChainId.set(9991, 80001);
domainIdToChainId.set(1734439522, 421613);
domainIdToChainId.set(2053862260, 280);
domainIdToChainId.set(1668247156, 1668247156);
domainIdToChainId.set(1887071092, 1442);
domainIdToChainId.set(0, networkToChainId[dataSource.network()]);

export function handleCrosschainClaim(event: CrosschainClaim): void {
  const distributor = getOrCreateDistributor(event.address, event.block);
  const distributionRecord = getOrCreateDistributionRecord(event.address, event.params.beneficiary, event.block);
  const claim = createClaim(event.transaction, distributionRecord, event.params.beneficiary, event.params.amount, distributor.uris[0], event.block);
  // update claimed amount
  distributionRecord.claimed = distributionRecord.claimed + event.params.amount;
  distributionRecord.save();

  const recipientId = event.params.recipient;
  const recipient = getOrCreateAccount(recipientId, event.block);
  
  claim.recipient = recipient.id;
  claim.recipientChain = BigInt.fromI32(domainIdToChainId[event.params.recipientDomain.toI32()]);
  claim.transferId = event.params.id
  claim.save();
}