import { Trader, Trade, CrossChainTrade } from "../../generated/schema"
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { SetConfig, HashflowTradeSingleHop, HashflowTradeXChain, SetSweepRecipient } from '../../generated/templates/Trader/Trader'
import { OwnershipTransferred } from "../../generated/Registry/Registry";
import { Trader as TraderTemplate } from "../../generated/templates"

/**
 * Always gets a Trader
 */
 export function getOrCreateTrader(traderAddress: Address, block: ethereum.Block): Trader {
	const traderId = traderAddress.toHexString()
	let trader = Trader.load(traderId)
	if (!trader) {
		TraderTemplate.create(traderAddress)
		trader = new Trader(traderId)
    trader.fee = BigInt.fromI32(0)
    trader.feeRecipient = Address.fromI32(0).toHexString()
    trader.router = 'unknown'
    trader.owner = 'unknown'
    trader.recipient = 'unknown'
		trader.createdAt = block.timestamp
		trader.save()
	}
	return trader
}

export function handleSetConfig(event: SetConfig): void {
	const trader = getOrCreateTrader(event.address, event.block)
  trader.fee = event.params.feeBips
  trader.router = event.params.router.toHexString()
  trader.save()
}

export function handleSetSweepRecipient(event: SetSweepRecipient): void {
	const trader = getOrCreateTrader(event.address, event.block)
  trader.recipient = event.params.recipient.toHexString()
  trader.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
	const trader = getOrCreateTrader(event.address, event.block)
  trader.owner = event.params.newOwner.toHexString()
  trader.save()
}

export function handleHashflowTradeSingleHop(event: HashflowTradeSingleHop): void {
  // create trade
  const tradeId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  const trade = new Trade(tradeId)
  trade.traderContract = event.address.toHexString()
  trade.pool = event.params.quote.pool.toHexString()
  trade.externalAccount = event.params.quote.externalAccount.toHexString()
  trade.trader = event.params.quote.trader.toHexString()
  trade.effectiveTrader = event.params.quote.effectiveTrader.toHexString()
  trade.baseToken = event.params.quote.baseToken.toHexString()
  trade.quoteToken = event.params.quote.quoteToken.toHexString()
  trade.effectiveBaseTokenAmount = event.params.quote.effectiveBaseTokenAmount
  trade.maxBaseTokenAmount = event.params.quote.maxBaseTokenAmount
  trade.maxQuoteTokenAmount = event.params.quote.maxQuoteTokenAmount
  trade.quoteExpiry = event.params.quote.quoteExpiry
  trade.nonce = event.params.quote.nonce
  trade.txid = event.params.quote.txid
  trade.signature = event.params.quote.signature
	trade.createdAt = event.block.timestamp
  trade.save()
}

export function handleHashflowTradeXChain(event: HashflowTradeXChain): void {
  // create trade
  const tradeId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  const trade = new CrossChainTrade(tradeId)
	trade.protocol = BigInt.fromI32(event.params.protocol)
  trade.traderContract = event.address.toHexString()
  trade.srcChainId = BigInt.fromI32(event.params.quote.srcChainId)
  trade.dstChainId = BigInt.fromI32(event.params.quote.dstChainId)
  trade.srcPool = event.params.quote.srcPool.toHexString()
  trade.dstPool = event.params.quote.dstPool.toHexString()
  trade.srcExternalAccount = event.params.quote.srcExternalAccount.toHexString()
  trade.dstExternalAccount = event.params.quote.dstExternalAccount.toHexString()
  trade.trader = event.params.quote.trader.toHexString()
  trade.baseToken = event.params.quote.baseToken.toHexString()
  trade.quoteToken = event.params.quote.quoteToken.toHexString()
  trade.baseTokenAmount = event.params.quote.baseTokenAmount
  trade.quoteTokenAmount = event.params.quote.quoteTokenAmount
  trade.quoteExpiry = event.params.quote.quoteExpiry
  trade.nonce = event.params.quote.nonce
  trade.txid = event.params.quote.txid
  trade.signature = event.params.quote.signature
	trade.createdAt = event.block.timestamp
  trade.save()
}
