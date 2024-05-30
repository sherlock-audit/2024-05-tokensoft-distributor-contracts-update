import {
  SweepNative,
  SweepToken,
  Initialize,
  Update,
  SetPaymentTokenInfo,
  Buy,
  OwnershipTransferred,
  RegisterDistributor,
  FlatPriceSale_v_2_1 as FlatPriceSaleContract
} from "../../../generated/FlatPriceSale_v_2_1/FlatPriceSale_v_2_1";

import {
  SaleImplementation,
  PaymentMethod,
  Sale,
  Purchase
} from "../../../generated/schema";
import { log, BigInt, ByteArray } from '@graphprotocol/graph-ts'
import { getOrCreateAccount, getOrCreateNativePaymentMethod, getOrCreateTokenPaymentMethod, getSale, getOrCreateDistributor } from "../../lib";

export function handleInitialize(event: Initialize): void {
  // We are now handling the initialization in the sale factory event
  const saleId = event.address.toHexString();

  const sale = Sale.load(saleId);
  if (!sale) {
    log.error('no sale with id {} in tx {}', [saleId, event.transaction.hash.toHexString()]);
  }
}
export function handleSetPaymentTokenInfo(event: SetPaymentTokenInfo): void {
  // only called during sale initialization
  const saleId = event.address.toHexString();
  const sale = Sale.load(saleId);
  if (!sale) {
    log.error('missing sale {}', [saleId]);
    return;
    // throw new Error('missing sale: ' + saleId);
  }

  const paymentMethod = getOrCreateTokenPaymentMethod(
    event.params.token, 
    event.params.paymentTokenInfo.decimals,
    event.params.paymentTokenInfo.oracle,
    event.block
  );

  const paymentMethods = sale.paymentMethods;
  paymentMethods.push(paymentMethod.id);
  sale.paymentMethods = paymentMethods;
  sale.save();
}

export function handleUpdate(event: Update): void {
  const saleId = event.address.toHexString();
  const sale = Sale.load(saleId);
  if (!sale) {
    log.error('missing sale {}', [saleId]);
    return;
    // throw new Error('no sale to update: ' + saleId);
  }

  // save config
  sale.recipient = getOrCreateAccount(event.params.config.recipient, event.block).id;
  sale.merkleRoot = event.params.config.merkleRoot;
  sale.saleMaximum = event.params.config.saleMaximum;
  sale.userMaximum = event.params.config.userMaximum;
  sale.purchaseMinimum = event.params.config.purchaseMinimum;
  sale.startTime = event.params.config.startTime;
  sale.endTime = event.params.config.endTime;
  sale.maxQueueTime = event.params.config.maxQueueTime;

  const uris = sale.uris;
  // only save novel URIs
  if (uris[0] != event.params.config.URI) {
    uris.unshift(event.params.config.URI);
  }
  sale.uris = uris;
  sale.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  // Note that this is called during initialization!
  // TODO: fix this, the matching sale isn't being found in the subgraph
  log.info('ownership transfered at address {} from {} to {}', [event.address.toHexString(), event.params.previousOwner.toHexString(), event.params.newOwner.toHexString()])
  // const saleId = event.address.toHexString();
  // const sale = Sale.load(saleId);
  // if (!sale) {
  //   throw new Error('missing sale: ' + saleId);
  // }

  // const ownerId = event.params.newOwner.toHexString();

  // let owner = Account.load(ownerId);

  // if (owner === null) {
  //   owner = new Account(ownerId);
  //   owner.createdAt = event.block.timestamp;
  //   owner.save()
  // }

  // sale.owner = owner.id;
  // sale.save();
}

export function handleBuy(event: Buy): void {
  // Query the contract to get the payment token info
  const saleContract = FlatPriceSaleContract.bind(event.address);

  // The buy event uses token == address(0) to signify a native purchase
  let paymentMethod: PaymentMethod;
  const isNative  = event.params.token.toHexString() == '0x0000000000000000000000000000000000000000'
  if (isNative) {
    // native payment
    const nativeOracle = saleContract.nativeTokenPriceOracle();
    paymentMethod = getOrCreateNativePaymentMethod(nativeOracle, event.block);
  } else {
    // ERC20 payment
    const paymentTokenInfo = saleContract.getPaymentToken(event.params.token);
    paymentMethod = getOrCreateTokenPaymentMethod(event.params.token, paymentTokenInfo.decimals, paymentTokenInfo.oracle, event.block);
  }

  const saleId = event.address.toHexString();
  const sale = Sale.load(saleId);
  if (!sale) {
    log.error('missing sale {}', [saleId]);
    return;
    // throw new Error('no sale to update: ' + saleId);
  }

  const buyer = getOrCreateAccount(event.params.buyer, event.block);

  let price: BigInt;
  // calculate a price
  if (event.params.tokenValue > BigInt.fromI32(0)) {
    // calculate the price from the transaction
    price = event.params.baseCurrencyValue.times(BigInt.fromI32(10).pow(paymentMethod.decimals as u8).div(event.params.tokenValue));
  } else {
    // fallback for 0 value transactions
    price = BigInt.fromI32(0);
  }
  
  // Create a new purchase
  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let purchase = new Purchase(id);
  purchase.sale = sale.id;
  purchase.buyer = buyer.id;
  purchase.baseCurrencyValue = event.params.baseCurrencyValue;
  purchase.paymentMethod = paymentMethod.id;
  purchase.price = price;
  purchase.spent = event.params.tokenValue;
  purchase.fee = event.params.tokenFee;
  purchase.transactionHash = event.transaction.hash.toHexString();
  purchase.createdAt = event.block.timestamp;
  // copy the uri at the time of purchase to this record (reference for purchased token price)
  purchase.uri = sale.uris[0];
  purchase.save();

  // update the sale metrics
  sale.purchaseTotal = sale.purchaseTotal.plus(purchase.baseCurrencyValue);
  sale.purchaseCount = sale.purchaseCount.plus(BigInt.fromI32(1));
  sale.save();

  // update the payment method metrics
  paymentMethod.purchaseTotal = paymentMethod.purchaseTotal.plus(purchase.spent);
  paymentMethod.purchaseCount = paymentMethod.purchaseCount.plus(BigInt.fromI32(1));
  paymentMethod.save()

  // update the sale implementation metrics
  const implementation = SaleImplementation.load(sale.implementation);
  if (!implementation) {
    log.error('missing implementation {}', [sale.implementation]);
    return;
    // throw new Error('no sale to update: ' + sale.implementation);
  }

  implementation.purchaseCount = implementation.purchaseCount.plus(BigInt.fromI32(1));
  implementation.save();
}

export function handleSweepToken(event: SweepToken): void {
// TODO: handle sweeps
}

export function handleSweepNative(event: SweepNative): void {
// TODO: handle sweeps
}

export function handleRegisterDistributor(event: RegisterDistributor): void {
  const sale = getSale(event.address.toHexString());
  const distributor = getOrCreateDistributor(event.params.distributor, event.block);

  sale.distributor = distributor.id;
  sale.save();
}
