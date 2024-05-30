import {
  Deploy,
  NewSale,
  UpdateStart,
  UpdateEnd,
  Buy,
  RegisterClaimManager,
  SaleManager_v_1_2 as SaleManagerContract,
  UpdateMerkleRoot,
  UpdateMaxQueueTime,
  UpdateUri
} from "../../../generated/SaleManager_v_1_2/SaleManager_v_1_2";

import {
  SaleImplementation as SaleManager,
  PaymentMethod,
  Sale,
  Account,
  Purchase,
  // ClaimManager
} from "../../../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";
import { log } from '@graphprotocol/graph-ts';
import {
  getOrCreateAccount,
  getOrCreateNativePaymentMethod,
  getSale,
  getOrCreateTokenPaymentMethod,
  getSaleImplementation,
  hardCodedSaleIds, hardCodedSaleUris, getOrCreateDistributor
} from "../../lib";

export function handleDeploy(event: Deploy): void {
  let saleManager = SaleManager.load(event.address.toHexString());

  // note that v1.x subgraphs will sometimes catch events from sale managers with other versions
  if (saleManager) return;

  saleManager = new SaleManager(event.address.toHexString());
  const saleManagerContract = SaleManagerContract.bind(event.address);

  const nativePaymentMethod = getOrCreateNativePaymentMethod(event.params.priceOracle, event.block);
  const tokenPaymentMethod = getOrCreateTokenPaymentMethod(
    saleManagerContract.paymentToken(),
    saleManagerContract.paymentTokenDecimals(),
    null,
    event.block
  )

  // Track the payment methods on the v1.x sale manager (it's the same for all sales)
  saleManager.paymentMethods = [nativePaymentMethod.id, tokenPaymentMethod.id];

  // only handle v1.2 sales
  const result = saleManagerContract.try_VERSION();
  if (result.reverted || !['1.2', '1.2.1'].includes(result.value)) {
    log.warning('v1.2 subgraph attempted to handle deployment for sale manager with version: {} in tx: {}', [result.reverted ? 'reverted' : result.value, event.transaction.hash.toHexString()]);
    // do not save this sale manager!
    return;
  }

  saleManager.version = result.value;
  saleManager.saleCount = BigInt.fromI32(0);
  saleManager.purchaseCount = BigInt.fromI32(0);
  saleManager.feeBips = BigInt.fromI32(0);
  saleManager.createdAt = event.block.timestamp;
  saleManager.save();
}

export function handleNewSale(event: NewSale): void {
  log.info('v1.2 mapping: handling new sale with address {} in tx {}', [event.address.toHexString(), event.transaction.hash.toHexString()]);
  const saleManager = getSaleImplementation(event.address);
  if (!saleManager.paymentMethods || (saleManager.paymentMethods as string[]).length == 0) {
    log.error('sale manager payment methods missing at: {}', [saleManager.id]);
    return;
    // throw new Error('sale manager payment methods missing at: ' + saleManager.id);
  }

  saleManager.saleCount = saleManager.saleCount.plus(BigInt.fromI32(1));
  saleManager.save();

  let initialUri = event.params.uri
  const saleId = event.params.saleId.toHexString()

  // check to see if sale has a hard-coded uri
  const hardCodedSaleIndex = hardCodedSaleIds.indexOf(saleId);
  if (hardCodedSaleIndex >= 0) {
    initialUri = hardCodedSaleUris[hardCodedSaleIndex];
  }

  // Create a new sale (saleId is unique)
  const sale = new Sale(event.params.saleId.toHexString());
  sale.idBytes = event.params.saleId;
  sale.merkleRoot = event.params.merkleRoot;
  sale.owner = getOrCreateAccount(event.params.admin, event.block).id;
  sale.recipient = getOrCreateAccount(event.params.recipient, event.block).id;
  // v1.2 saleBuyLimit uses 6 decimals, saleMaximum uses 8 decimals
  sale.saleMaximum = event.params.saleBuyLimit.times(BigInt.fromI32(10).pow(2));
  // v1.2 userBuyLimit uses 6 decimals, userMaximum uses 8 decimals
  sale.userMaximum = event.params.userBuyLimit.times(BigInt.fromI32(10).pow(2));
  // purchaseMinimum not supported
  sale.purchaseMinimum = BigInt.fromI32(0);
  sale.startTime = event.params.startTime;
  sale.endTime = event.params.endTime;
  sale.uris = [initialUri];

  // Payment info (all v1.x contracts use USD as the base currency)
  sale.baseCurrency = 'USD';
  sale.paymentMethods = saleManager.paymentMethods as string[];
  sale.implementation = saleManager.id;
  sale.createdAt = event.block.timestamp;
  sale.maxQueueTime = event.params.maxQueueTime;
  sale.purchaseCount = BigInt.fromI32(0);
  sale.purchaseTotal = BigInt.fromI32(0);
  sale.save();
}

export function handleUpdateStart(event: UpdateStart): void {
  const sale = getSale(event.params.saleId.toHexString());
  sale.startTime = event.params.startTime;
  sale.save();
}

export function handleUpdateEnd(event: UpdateEnd): void {
  const sale = getSale(event.params.saleId.toHexString());
  sale.endTime = event.params.endTime;
  sale.save();
}

export function handleUpdateMerkleRoot(event: UpdateMerkleRoot): void {
  const sale = getSale(event.params.saleId.toHexString());
  sale.merkleRoot = event.params.merkleRoot;
  sale.save();
}

export function handleUpdateUri(event: UpdateUri): void {
  const saleId = event.params.saleId.toHexString()
  const sale = getSale(saleId);

  // check to see if sale has a hard-coded uri
  let uris: string[] = sale.uris;
  const hardCodedSaleIndex = hardCodedSaleIds.indexOf(saleId);
  if (hardCodedSaleIndex >= 0) {
    uris.unshift(hardCodedSaleUris[hardCodedSaleIndex]);
  } else {
    uris.unshift(event.params.uri);
  }

  sale.uris = uris;
  sale.save();
}

export function handleBuy(event: Buy): void {
  const saleManager = getSaleImplementation(event.address);
  const sale = getSale(event.params.saleId.toHexString());

  // the native payment method is first in the array
  const nativePaymentMethod = PaymentMethod.load(sale.paymentMethods[0])
  // ERC20 (v1.x sales only support payments with one ERC20) is second in the array
  const tokenPaymentMethod = PaymentMethod.load(sale.paymentMethods[1])

  if (!nativePaymentMethod) {
    log.error('missing payment method: {}', [sale.paymentMethods[0]]);
    return;
    // throw new Error('missing payment method: ' + paymentMethodId);
  }
  
  if (!tokenPaymentMethod) {
    log.error('missing payment method: {}', [sale.paymentMethods[1]]);
    return;
    // throw new Error('missing payment method: ' + paymentMethodId);
  }

  let spent: BigInt;
  let price: BigInt;
  let baseCurrencyValue: BigInt;

  if (!event.params.native) {
    // ERC20 purchase: the number of ERC20 tokens spent
    spent = event.params.value;
    // v1.x ERC20 purchases are taken at par (eg 1 USDC = $1.00) with 8 decimals
    price = BigInt.fromI32(100000000);
    // same as the number of payment tokens: just convert to 8 decimals
    baseCurrencyValue = event.params.value.times(BigInt.fromI32(10).pow(8 - tokenPaymentMethod.decimals as u8))
  } else if (event.params.value > BigInt.fromI32(0)) {
    // Real native payment: get the number of native tokens spent from the transaction on-chain
    spent = event.transaction.value;
    // calculate the price from the transaction (find the ratio between erc20 and native tokens, convert to 8 decimals)
    price = event.params.value.times(BigInt.fromI32(10).pow((8 + nativePaymentMethod.decimals - tokenPaymentMethod.decimals) as u8)).div(event.transaction.value)
    // for native transactions, v1.x contracts use the event value field to represent the ERC20-equivalent value: just convert to 8 decimals
    baseCurrencyValue = event.params.value.times(BigInt.fromI32(10).pow(8 - tokenPaymentMethod.decimals as u8))
  } else {
    // fallback for 0 value transactions
    price = BigInt.fromI32(0);
    baseCurrencyValue = BigInt.fromI32(0);
    spent = BigInt.fromI32(0);
  }

  // which payment method was used on-chain?
  const paymentMethod = event.params.native ? nativePaymentMethod : tokenPaymentMethod
  // Create a new purchase
  const id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let purchase = new Purchase(id);
  purchase.sale = sale.id;
  purchase.buyer = getOrCreateAccount(event.transaction.from, event.block).id;
  purchase.spent = spent;
  purchase.price = price;
  purchase.baseCurrencyValue = baseCurrencyValue;
  purchase.paymentMethod = paymentMethod.id;
  purchase.transactionHash = event.transaction.hash.toHexString();
  purchase.uri = sale.uris[0];
  purchase.createdAt = event.block.timestamp;
  purchase.fee = BigInt.fromI32(0);
  purchase.save();

  // update the payment method metrics
  paymentMethod.purchaseTotal = paymentMethod.purchaseTotal.plus(spent);
  paymentMethod.purchaseCount = paymentMethod.purchaseCount.plus(BigInt.fromI32(1));
  paymentMethod.save()

  // update the sale
  sale.purchaseTotal = sale.purchaseTotal.plus(baseCurrencyValue);
  sale.purchaseCount = sale.purchaseCount.plus(BigInt.fromI32(1));
  sale.save();

  // update the sale manager
  saleManager.purchaseCount = saleManager.purchaseCount.plus(BigInt.fromI32(1));
  saleManager.save();
}

export function handleRegisterClaimManager(event: RegisterClaimManager): void {
  // Sale should always be present at this ID
  log.warning('v1.2 sale manager mapping: HANDLING REGISTER CLAIM MANAGER at address {}, distributor {}',[event.params.saleId.toHexString(), event.params.claimManager.toHexString()] )
  const sale = getSale(event.params.saleId.toHexString());
  const distributor = getOrCreateDistributor(event.params.claimManager, event.block);
  sale.distributor = distributor.id;
  sale.save();
}

export function handleUpdateMaxQueueTime(event: UpdateMaxQueueTime): void {
  const sale = getSale(event.params.saleId.toHexString());
  sale.maxQueueTime = event.params.maxQueueTime;
  sale.save();
}
