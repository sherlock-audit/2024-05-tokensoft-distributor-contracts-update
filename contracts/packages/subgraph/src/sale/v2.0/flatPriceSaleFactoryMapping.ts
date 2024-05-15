import { BigInt } from "@graphprotocol/graph-ts";
import {NewSale} from "../../../generated/FlatPriceSaleFactory/FlatPriceSaleFactory";
import { getOrCreateAccount, getOrCreateNativePaymentMethod } from "../../lib";
import {SaleImplementation, Sale} from "../../../generated/schema";
import { FlatPriceSale } from '../../../generated/templates'

// When the clone factory clones an existing implementation contract, save the  sale
export function handleNewSale(event: NewSale): void {
  FlatPriceSale.create(event.params.clone)

  const implementationId = event.params.implementation.toHexString();
  const saleImplementation = SaleImplementation.load(implementationId);

  const saleId = event.params.clone.toHexString();
  
  let sale = Sale.load(saleId);
  if (sale) {
    throw new Error('cloning to an existing sale at: ' + saleId);
  }

  sale = new Sale(saleId);
  sale.idBytes = event.params.clone;
  sale.implementation = implementationId;
  sale.owner = getOrCreateAccount(event.transaction.from, event.block).id;

  // save config
  sale.recipient = getOrCreateAccount(event.params.config.recipient, event.block).id;
  sale.merkleRoot = event.params.config.merkleRoot;
  sale.saleMaximum = event.params.config.saleMaximum;
  sale.userMaximum = event.params.config.userMaximum;
  sale.purchaseMinimum = event.params.config.purchaseMinimum;
  sale.startTime = event.params.config.startTime;
  sale.endTime = event.params.config.endTime;
  sale.maxQueueTime = event.params.config.maxQueueTime;
  sale.uris = [event.params.config.URI];

  // save payment info
  sale.baseCurrency = event.params.baseCurrency;
  sale.paymentMethods = event.params.nativePaymentsEnabled
    ? [getOrCreateNativePaymentMethod(event.params.nativeOracle, event.block).id]
    : [];
  
  sale.purchaseCount = BigInt.fromI32(0);
  sale.purchaseTotal = BigInt.fromI32(0);

  sale.createdAt = event.block.timestamp;

  sale.save();
}
