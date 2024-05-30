import {
  NewSale,
  UpdateStart,
  UpdateEnd,
  Buy,
  RegisterClaimManager,
  SaleManager_v_1_0 as SaleManagerContract,
  UpdateMerkleRoot,
  UpdateMaxQueueTime
} from "../../../generated/SaleManager_v_1_0/SaleManager_v_1_0";

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
import { getOrCreateAccount, getOrCreateDistributor, getOrCreateNativePaymentMethod, getOrCreateTokenPaymentMethod, getSale, getSaleImplementation } from "../../lib";

/**
 * Legacy v1.0 sale manager contracts are patched with the uri field to match subsequent contracts
 * Note that the v1.0 contract had no events emitted on deployment of the sale manager
 */

export function handleNewSale(event: NewSale): void {
  log.info('v1.0 mapping: handling new sale with address {} in tx {}', [event.address.toHexString(), event.transaction.hash.toHexString()]);
  // Track the sale manager if not already tracked
  let saleManager = SaleManager.load(event.address.toHexString());
  const saleManagerContract = SaleManagerContract.bind(event.address);

  if (!saleManager) {
    // missing deploy event: need to create the sale manager
    saleManager = new SaleManager(event.address.toHexString());

    const nativePaymentMethod = getOrCreateNativePaymentMethod(saleManagerContract.getPriceOracle(), event.block);
    const tokenPaymentMethod = getOrCreateTokenPaymentMethod(
      saleManagerContract.paymentToken(),
      saleManagerContract.paymentTokenDecimals(),
      null,
      event.block
    )

    // Track the payment methods on the v1.x sale manager (it's the same for all sales)
    saleManager.paymentMethods = [nativePaymentMethod.id, tokenPaymentMethod.id];
    saleManager.version = '1.0';
    saleManager.createdAt = event.block.timestamp;
    saleManager.saleCount = BigInt.fromI32(0);
    saleManager.purchaseCount = BigInt.fromI32(0);
    saleManager.feeBips = BigInt.fromI32(0);
  }

  // Spoof the URI for relevant v1.0 sales. Sale IDs are globally unique so these checks will only match match one v1.0 contract sale each
  let patchedUris = ['unknown sale']
  // test sale (localhost)
  if (event.params.saleId.toHexString() == '0x428d81cb657b2d776ef5dcd3a44559d6b21cb1417dce76f91bf47bec7fc8af81') {
    patchedUris = ['https://example.com/example'];
  }

  // bloop 1 (a goerli staging sale on https://goerli.etherscan.io/address/0xa069807cEa167873fD230507e2b85c1d052b5902)
  else if (event.params.saleId.toHexString() == '0x00675ef683d60da9dfada0a206eb798b54b040378fb00b6710b538399482ac29') {
    patchedUris = ['ipfs://QmRoqWFDYWnjhMrnQmpCUZHAbeq9wc5TntHrYGEDR3Dafs'];
  }

  // softernet 3 (fuji staging sale)
  else if (event.params.saleId.toHexString() == '0x40ec790102f5ec91cae4fe3f9ea47fabb71134d08ce21527ca164101a57e3af9') {
    patchedUris = ['ipfs://QmWKX3CpBadyZpGk5YRSPRQu6sj7S2bvDbcssPerbSmjcB'];
  }

  // arc public sale (prod)
  else if (event.params.saleId.toHexString() == '0x7c24c606f97396b7073e52623b850227a4a148bcb7f5315ee9fa40fc3674c3a2') {
    patchedUris = ['ipfs://QmYVYaDze7bXaoG6VztoZXfGwpJfY5MBVEqkdpUt4okrnH'];
  }

  // rand pre sale (prod)
  else if (event.params.saleId.toHexString() == '0x9ba1d4803aea6509a6f44430227962415235f6a8be5d6ae1601ab521fee5f0f4') {
    patchedUris = ['ipfs://QmU7AMZUvG1DiRGBVzhHJR8cWtqgdZrgumERfyQizqKJGo'];
  }

  // phat loot 1 (prod)
  else if (event.params.saleId.toHexString() == '0x1901a0a83d6605d80d417d125828c1a08d3ef3460e50821ec20b3e3b13cddeb2') {
    patchedUris = ['ipfs://QmfXdm1LuxrpGzDEqzDYV9CM12bdKVe4NWuHEhqLh8FtXF'];
  }

  // phat loot 2 (prod)
  else if (event.params.saleId.toHexString() == '0x1ca211b8a36965edb72ab56c06a36fc197e604352835b3b995aab2450f9be78e') {
    patchedUris = ['ipfs://QmTeU78q1S7jS9mmM6vW5eMdrwvtMCUVaEouBYmJA471wc'];
  }

  log.info('set patched uri to {}', patchedUris);

  const seller = getOrCreateAccount(event.params.seller, event.block);

  if (!saleManager.paymentMethods) {
    log.error('v1.0 sale manager is missing paymentMethods at: {}', [saleManager.id]);
    return;
    // throw new Error('v1.0 sale manager is missing paymentMethods at: ' + saleManager.id);
  }

  // Create a new sale (saleId is unique)
  const sale = new Sale(event.params.saleId.toHexString());
  sale.idBytes = event.params.saleId;
  sale.merkleRoot = event.params.merkleRoot;
  // v1.0: owner and recipient are both the same address
  sale.owner = seller.id;
  sale.recipient = seller.id;
  // v1.0 saleBuyLimit uses 6 decimals, saleMaximum uses 8 decimals
  sale.saleMaximum = event.params.saleBuyLimit.times(BigInt.fromI32(10).pow(2));
  // v1.0 userBuyLimit uses 6 decimals, userMaximum uses 8 decimals
  sale.userMaximum = event.params.userBuyLimit.times(BigInt.fromI32(10).pow(2));
  // purchase minimum is not supported
  sale.purchaseMinimum = BigInt.fromI32(0);
  sale.startTime = event.params.startTime;
  sale.endTime = event.params.endTime;
  sale.uris = patchedUris;
  sale.paymentMethods = saleManager.paymentMethods as string[];
  sale.implementation = saleManager.id;
  sale.createdAt = event.block.timestamp;
  sale.maxQueueTime = event.params.maxQueueTime;
  sale.baseCurrency = 'USD';
  sale.purchaseCount = BigInt.fromI32(0);
  sale.purchaseTotal = BigInt.fromI32(0);
  sale.save();

  saleManager.saleCount = saleManager.saleCount.plus(BigInt.fromI32(1));
  saleManager.save();
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
  purchase.fee = BigInt.fromI32(0);
  purchase.baseCurrencyValue = baseCurrencyValue;
  purchase.paymentMethod = paymentMethod.id;
  purchase.transactionHash = event.transaction.hash.toHexString();
  purchase.uri = sale.uris[0];
  purchase.createdAt = event.block.timestamp;
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
  log.warning('*** v1.0 sale manager mapping: HANDLING REGISTER CLAIM MANAGER at address {}, distributor {} *** ',[event.params.saleId.toHexString(), event.params.claimManager.toHexString()] )
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
