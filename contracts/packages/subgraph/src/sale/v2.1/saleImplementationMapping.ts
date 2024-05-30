import {
  ImplementationConstructor,
  FlatPriceSale_v_2_1 as FlatPriceSaleContract
} from "../../../generated/FlatPriceSale_v_2_1/FlatPriceSale_v_2_1";
import {
  SaleImplementation
} from "../../../generated/schema";
import { log, BigInt } from '@graphprotocol/graph-ts'
import { getOrCreateAccount } from "../../lib";

export function handleImplementationConstructor(event: ImplementationConstructor): void {
  const saleImplementationId = event.address.toHexString();

  const implementation = new SaleImplementation(saleImplementationId);
  const implementationContract = FlatPriceSaleContract.bind(event.address);

  implementation.feeRecipient = getOrCreateAccount(event.params.feeRecipient, event.block).id;
  implementation.feeBips = event.params.feeBips;
  implementation.saleCount = BigInt.fromI32(0);
  implementation.purchaseCount = BigInt.fromI32(0);
  const versionResult = implementationContract.try_VERSION();

  if (versionResult.reverted) {
    log.error('could not call VERSION() on implementation at {} in tx {}', [saleImplementationId, event.transaction.hash.toHexString()]);
    return;
  }

  implementation.version = versionResult.value;
  implementation.createdAt = event.block.timestamp;
  implementation.save();
}
