import { InitializeDistributionRecord, InitializeDistributor, Claim } from "../../../generated/templates/Distributor/IDistributor";
import { createClaim, getOrCreateDistributionRecord, getDistributor, getOrCreateDistributor, getSale } from "../../lib";

export function handleInitializeDistributor(event: InitializeDistributor): void {
  const distributor = getOrCreateDistributor(event.address, event.block)

  // V2P sale on goerli
  if (event.address.toHexString() == '0x44e383df8a31be32b4c3deb4c736d01079008cf2') {
    const sale = getSale('0xb487e5baf64912643fa9d03a080640d64cd2abad')
    sale.distributor = distributor.id
    sale.save()
  }

  // Starfish public sale on mainnet
  if (event.address.toHexString() == '0x1f56f6a9ad23850fb4ded9c32f25c28cd5d5c8aa') {
    const sale = getSale('0x7dc55b8542d88504f01a1a72e2bee07427dcad13')
    sale.distributor = distributor.id
    sale.save()
  }
}

export function handleInitializeDistributionRecord(event: InitializeDistributionRecord): void {
  getOrCreateDistributionRecord(event.address, event.params.beneficiary, event.block);
}

export function handleClaim(event: Claim): void {
  const distributor = getDistributor(event.address);
  const distributionRecord = getOrCreateDistributionRecord(event.address, event.params.beneficiary, event.block);
  createClaim(event.transaction, distributionRecord, event.params.beneficiary, event.params.amount, distributor.uris[0], event.block);
  // update claimed amount
  distributionRecord.claimed = distributionRecord.claimed.plus(event.params.amount);
  distributionRecord.save();

  distributor.claimed = distributor.claimed.plus(event.params.amount);
  distributor.save();
}
