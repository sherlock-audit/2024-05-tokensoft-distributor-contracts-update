import { Address, ethereum, BigInt, Bytes, log, store } from "@graphprotocol/graph-ts";
import { IDistributor } from "../generated/templates/Distributor/IDistributor";
import { Distributor as DistributorTemplate, AdvancedDistributor as AdvancedDistributorTemplate, CrosschainDistributor, TrancheVesting as TrancheVestingTemplate, MerkleSet as MerkleSetTemplate } from '../generated/templates'
import { IERC20Metadata } from '../generated/Registry/IERC20Metadata'
import { ITrancheVesting } from '../generated/Registry/ITrancheVesting'
import { IContinuousVesting } from '../generated/Registry/IContinuousVesting'
import { IPriceTierVesting } from '../generated/Registry/IPriceTierVesting'
import { IMerkleSet } from '../generated/Registry/IMerkleSet'
import {
	Account, Adjustment, AdvancedDistributor, Claim, ContinuousVesting, DistributionRecord, Distributor, MerkleSet, PaymentMethod, RegisteredAddress, Registry, Sale, SaleImplementation, Tranche, PriceTier, TrancheVesting } from "../generated/schema";
import { AdvancedDistributor as AdvancedDistributorContract } from "../generated/templates/AdvancedDistributor/AdvancedDistributor";

/**
 * Always gets an Account record from and Address
 */
export function getOrCreateAccount(address: Address, block: ethereum.Block): Account {
	// Get or create owner entity
	const accountId = address.toHexString();

	let account = Account.load(accountId);
	if (account === null) {
		account = new Account(accountId);
		account.createdAt = block.timestamp;
		account.save()
	}
	return account
}

/**
 * Always gets a Native Payment Method record
 */
export function getOrCreateNativePaymentMethod(oracle: Address, block: ethereum.Block): PaymentMethod {
	const paymentMethodId = 'native-' + oracle.toHexString();
	let paymentMethod = PaymentMethod.load(paymentMethodId);
	if (!paymentMethod) {
		paymentMethod = new PaymentMethod(paymentMethodId);
		paymentMethod.native = true;
		paymentMethod.token = null;
		paymentMethod.oracle = oracle;
		// all EVMs use 18 decimals for the native token
		paymentMethod.decimals = 18;
		paymentMethod.symbol = null;
		paymentMethod.purchaseTotal = BigInt.fromI32(0);
		paymentMethod.purchaseCount = BigInt.fromI32(0);
		paymentMethod.save()
	}
	return paymentMethod
}

/**
 * Always gets a Token Payment Method record
 */
export function getOrCreateTokenPaymentMethod(token: Address, decimals: i32, oracle: Address | null, block: ethereum.Block): PaymentMethod {
	const paymentMethodId = token.toHexString() + '-' + (oracle ? oracle.toHexString() : 'v1.x_priced_at_par');
	let paymentMethod = PaymentMethod.load(paymentMethodId);
	if (!paymentMethod) {
		paymentMethod = new PaymentMethod(paymentMethodId);
		paymentMethod.native = false;
		paymentMethod.token = token;
		// v1.x contracts have no oracle for the token payment method (assume none)
		paymentMethod.oracle = oracle;
		paymentMethod.decimals = decimals;
		paymentMethod.purchaseTotal = BigInt.fromI32(0);
		paymentMethod.purchaseCount = BigInt.fromI32(0);

		// call the token contract get_symbol and set paymentMethod.symbol
		const tokenContract = IERC20Metadata.bind(token)
		const symbolResult = tokenContract.try_symbol()
		if (!symbolResult.reverted) paymentMethod.symbol = symbolResult.value

		paymentMethod.save()
	}
	return paymentMethod
}

/**
 * Always gets a Distributor
 */
export function getOrCreateDistributor(distributorAddress: Address, block: ethereum.Block): Distributor {
	const distributorId = distributorAddress.toHexString();
	let distributor = Distributor.load(distributorId);

	if (!distributor) {
		DistributorTemplate.create(distributorAddress)

		const distributorContract = IDistributor.bind(distributorAddress);
		distributor = new Distributor(distributorId);

		const nameResult = distributorContract.try_NAME();
		if (!nameResult.reverted) {
			distributor.name = nameResult.value;
		} else distributor.name = 'Unknown';

		const versionResult = distributorContract.try_VERSION();
		if (!versionResult.reverted) distributor.version = versionResult.value;
		else distributor.version = BigInt.fromI32(0);

		const tokenResult = distributorContract.try_token();
		if (!tokenResult.reverted) {
			distributor.token = tokenResult.value;
			const tokenContract = IERC20Metadata.bind(tokenResult.value)

			const symbolResult = tokenContract.try_symbol()
			if (!symbolResult.reverted) distributor.tokenSymbol = symbolResult.value
			else distributor.tokenSymbol = 'Unknown'

			const decimalsResult = tokenContract.try_decimals()
			if (!decimalsResult.reverted) distributor.tokenDecimals = BigInt.fromI32(decimalsResult.value)
			else distributor.tokenDecimals = BigInt.fromI32(18)
		} else {
			distributor.token = Bytes.fromI32(0);
			distributor.tokenSymbol = 'Unknown';
			distributor.tokenDecimals = BigInt.fromI32(18);
		}

		const totalResult = distributorContract.try_total();
		if (!totalResult.reverted) {
			distributor.total = totalResult.value;
			distributor.remaining = totalResult.value;
		} else {
			distributor.total = BigInt.fromI32(0);
			distributor.remaining = BigInt.fromI32(0);
		}

		const uriResult = distributorContract.try_uri();
		if (!uriResult.reverted) distributor.uris = [uriResult.value];
		else distributor.uris = ['unknown'];

		const fractionDenominatorResult = distributorContract.try_getFractionDenominator();
		if (fractionDenominatorResult.reverted) {
			// default to a fraction denominator of 10000 (fractions are specified in basis points)
			distributor.fractionDenominator = BigInt.fromI32(10000);
		} else {
			distributor.fractionDenominator = fractionDenominatorResult.value;
		}

		distributor.claimed = BigInt.fromI32(0);
		distributor.createdAt = block.timestamp;
		distributor.save();
	}

	return distributor;
}

export function getAdvancedDistributor(address: Address): AdvancedDistributor {
	const advancedDistributor = AdvancedDistributor.load(`${address.toHexString()}-advanced`);
	if (!advancedDistributor) throw new Error('advancedDistributor not found with id: ' + address.toHexString());
	return advancedDistributor;
}

export function getOrCreateAdvancedDistributor(distributorId: string, block: ethereum.Block): AdvancedDistributor {
	const distributorAddress: Address = Address.fromString(distributorId)
	const advancedDistributorId = `${distributorId}-advanced`;

	let advancedDistributor = AdvancedDistributor.load(advancedDistributorId);

	if (advancedDistributor) {
		// nothing needs to be set up
		return advancedDistributor
	}

	// get the base distributor
	let distributor = Distributor.load(distributorId);
	if (!distributor) {
		distributor = getOrCreateDistributor(distributorAddress, block)
	}
	
	// update the total
	const distributorContract = IDistributor.bind(distributorAddress);
	const totalResult = distributorContract.try_total();
	if (!totalResult.reverted) {
		distributor.total = totalResult.value;
	}

	// update the uri
	const uriResult = distributorContract.try_uri();
	if (!uriResult.reverted) {
		let uris = distributor.uris
		uris.unshift(uriResult.value)
		distributor.uris = uris
	}

	distributor.save()

	// start listening to the distributor address for advanced distributor events
	AdvancedDistributorTemplate.create(distributorAddress)

	// bind to the address for contract calls
	const advancedDistributorContract = AdvancedDistributorContract.bind(distributorAddress);

	// create a new entity in the graphql database
	advancedDistributor = new AdvancedDistributor(distributorId + '-advanced');
	advancedDistributor.distributor = distributorId

	const ownerResult = advancedDistributorContract.try_owner();
	advancedDistributor.owner = ownerResult.reverted ? null : getOrCreateAccount(ownerResult.value, block).id;

	// get sweep recipient
	const sweepRecipient = advancedDistributorContract.try_getSweepRecipient();
	advancedDistributor.sweepRecipient = sweepRecipient.reverted ? null : getOrCreateAccount(sweepRecipient.value, block).id;

	// the address parameter here can be any value (not used at present)
	const voteFactorResult = advancedDistributorContract.try_getVoteFactor(distributorAddress);
	if (!voteFactorResult.reverted) advancedDistributor.voteFactor = voteFactorResult.value;

	advancedDistributor.createdAt = block.timestamp;
	advancedDistributor.save();

	return advancedDistributor;
}


export function getOrCreateTrancheVesting(distributorId: string, block: ethereum.Block): TrancheVesting | null {
	log.info('Trying to add tranche vesting info for distributor {}', [distributorId])
	const distributorAddress: Address = Address.fromString(distributorId)
	const distributorContract = ITrancheVesting.bind(distributorAddress)

	const tranchesResult = distributorContract.try_getTranches()

	if (tranchesResult.reverted) {
		log.error('Could not call distributor.getTranches() on distributor {}, is it mis-registered as tranche vesting?', [distributorId])
		return null
	}
	
	const trancheVestingId = `${distributorId}-trancheVesting`
	let trancheVesting: TrancheVesting | null = TrancheVesting.load(trancheVestingId)
	if (!trancheVesting) {
		TrancheVestingTemplate.create(distributorAddress)
		trancheVesting = new TrancheVesting(trancheVestingId)
		trancheVesting.distributor = distributorId
		trancheVesting.createdAt = block.timestamp
		trancheVesting.save()
	}

	
	// add new tranches
	for (let i = 0; i < tranchesResult.value.length; i++) {
		const tranche = tranchesResult.value[i]
		const trancheId = `${distributorId}-trancheVesting-${i.toString()}`
		let t = Tranche.load(trancheId)

		if (!t) {
			t = new Tranche(trancheId)
			t.createdAt = block.timestamp
		}

		t.trancheVesting = trancheVestingId
		t.index = BigInt.fromI32(i)
		t.time = tranche.time
		t.vestedFraction = tranche.vestedFraction
		t.save()
	}

	// remove old tranches if they exist
	let checkForMoreTranches = true
	let i = tranchesResult.value.length
	while (checkForMoreTranches) {
		const trancheId = trancheVestingId + `-${i}`
		let foundTranche = Tranche.load(trancheId);
		
		if (foundTranche) {
			store.remove('Tranche', foundTranche.id);
			i++;
		}  else  {
			checkForMoreTranches = false
		}
	}

	return trancheVesting
}

export function getOrCreatePriceTiers(distributorId: string, block: ethereum.Block): PriceTier[] | null {
	log.info('Trying to add price tier vesting info to distributor {}', [distributorId])
	const distributorAddress: Address = Address.fromString(distributorId)
	const distributorContract = IPriceTierVesting.bind(distributorAddress)

	const priceTiersResult = distributorContract.try_getPriceTiers()

	if (priceTiersResult.reverted) {
		log.error('Could not call distributor.getPriceTiers() on distributor {}, is it mis-registered as tranche vesting?', [distributorId])
		return null
	}

	const oracleResult = distributorContract.try_getOracle()

	if (oracleResult.reverted) {
		log.error('Could not call distributor.getPriceTiers() on distributor {}, is it mis-registered as tranche vesting?', [distributorId])
		return null
	}

	const priceTiers: PriceTier[] = []

	for (let i = 0; i < priceTiersResult.value.length; i++) {
		const priceTier = priceTiersResult.value[i]
		const tierId = `${distributorId}-priceTierVesting-${priceTier.price}`
		let t = PriceTier.load(tierId)

		if (!t) {
			t = new PriceTier(tierId)
			t.distributor = distributorId
			t.price = priceTier.price
			t.oracle = oracleResult.value.toHexString()
			t.vestedFraction = priceTier.vestedFraction
			t.createdAt = block.timestamp
			t.save()
		}

		priceTiers.push(t)
	}

	// TODO: handle vesting updates?
	return priceTiers
}

export function getOrCreateContinuousVesting(distributorId: string, block: ethereum.Block): ContinuousVesting | null {
	log.info('Trying to add continuous vesting info to distributor {}', [distributorId])
	const id = `${distributorId}-continuousVesting`

	let continuousVesting = ContinuousVesting.load(id);

	if (!continuousVesting) {
		continuousVesting = new ContinuousVesting(id);
		continuousVesting.createdAt = block.timestamp;

		const distributorAddress: Address = Address.fromString(distributorId)
		const distributorContract = IContinuousVesting.bind(distributorAddress)
		const result = distributorContract.try_getVestingConfig()

		if (result.reverted) {
			log.error('Could not call distributor.getVestingConfig() on distributor {}, is it mis-registered as continuous vesting?', [distributorId])
			return null
		}

		continuousVesting.start = result.value.value0
		continuousVesting.cliff = result.value.value1
		continuousVesting.end = result.value.value2
		continuousVesting.distributor = distributorId
		continuousVesting.save()
	} else {
		log.info('**** CONTINUOUSVESTING {} {}', [continuousVesting.id, continuousVesting.createdAt.toString()])
	}

	return continuousVesting
}
export function getOrCreateMerkleSet(distributorId: string, block: ethereum.Block): MerkleSet | null {
	log.info('Trying to add merkle set info to distributor {}', [distributorId])
	const id = `${distributorId}-merkleSet`

	let merkleSet = MerkleSet.load(id);

	if (!merkleSet) {
		log.info('new Merkle Set {}', [id])
		MerkleSetTemplate.create(Address.fromString(distributorId))
		const distributorAddress: Address = Address.fromString(distributorId)
		const merkleSetContract = IMerkleSet.bind(distributorAddress)

		merkleSet = new MerkleSet(id);
		const getMerkleRootResult = merkleSetContract.try_getMerkleRoot()

		if (getMerkleRootResult.reverted) {
			log.error('Could not call getMerkleRoot() on {}, is it an IMerkleSet contract?', [distributorId])
			return null
		}

		merkleSet.distributor = distributorId
		merkleSet.root = getMerkleRootResult.value.toHexString()
		merkleSet.createdAt = block.timestamp;
		merkleSet.save()
	}

	return merkleSet
}

/**
 * Get an existing sale or throw
 */
export function getSale(saleId: string): Sale {
	const sale = Sale.load(saleId);
	if (!sale) throw new Error('sale not found with id: ' + saleId);
	return sale;
}

/**
 * Get an existing sale implementation (sale manager for v1.x contracts) or throw
 */
export function getSaleImplementation(id: Address): SaleImplementation {
	const saleImplementation = SaleImplementation.load(id.toHexString());
	if (!saleImplementation) throw new Error('saleImplementation not found with id: ' + id.toHexString());
	return saleImplementation;
}

export function getDistributor(id: Address): Distributor {
	const distributor = Distributor.load(id.toHexString());
	if (!distributor) throw new Error('distributor not found with id: ' + id.toHexString());
	return distributor;
}

/**
 * Create a distribution record or throw
 */
export function createDistributionRecord(distributorAddress: Address, beneficiaryAddress: Address, block: ethereum.Block): DistributionRecord {
	const distributionRecordId = distributorAddress.toHexString() + '-' + beneficiaryAddress.toHexString();
	let distributionRecord = DistributionRecord.load(distributionRecordId);

	if (distributionRecord) throw new Error('distribution record already exists with id: ' + distributionRecordId);

	distributionRecord = new DistributionRecord(distributionRecordId);
	distributionRecord.distributor = distributorAddress.toHexString();

  const beneficiaryAccount = getOrCreateAccount(beneficiaryAddress, block);
	distributionRecord.beneficiary = beneficiaryAccount.id;
	distributionRecord.claimed = BigInt.fromI32(0);
	distributionRecord.createdAt = block.timestamp;
	distributionRecord.save();

	return distributionRecord;
}

export function getDistributionRecord(distributorAddress: Address, beneficiaryAddress: Address): DistributionRecord {
	const distributionRecordId = distributorAddress.toHexString() + '-' + beneficiaryAddress.toHexString();
	let distributionRecord = DistributionRecord.load(distributionRecordId);
	if (!distributionRecord) throw new Error('distributionRecord not found with id: ' + distributionRecordId);
	return distributionRecord
}

export function getOrCreateDistributionRecord(distributorAddress: Address, beneficiaryAddress: Address, block: ethereum.Block): DistributionRecord {
	const distributionRecordId = distributorAddress.toHexString() + '-' + beneficiaryAddress.toHexString();
	let distributionRecord = DistributionRecord.load(distributionRecordId);
	if (!distributionRecord) {
		return createDistributionRecord(distributorAddress, beneficiaryAddress, block)
	}

	return distributionRecord
}

/**
 * Get or create a registry
 */
export function getOrCreateRegistry(registryId: string, block: ethereum.Block): Registry {
	let registry = Registry.load(registryId);

	if (!registry) {
		registry = new Registry(registryId);
		registry.owner = Address.fromI32(0).toHexString();
		registry.admins = [];
		registry.createdAt = block.timestamp;
		registry.save()
	}

	return registry
}

/**
 * Get or create a registered contract
 */
export function getOrCreateRegisteredAddress(
	registeredAddressId: string,
	block: ethereum.Block,
	registryId: string
): RegisteredAddress {
	let registeredAddress = RegisteredAddress.load(registeredAddressId);

	if (registeredAddress) return registeredAddress

	registeredAddress = new RegisteredAddress(registeredAddressId);
	registeredAddress.registry = registryId;
	registeredAddress.interfaceIds = [];
	registeredAddress.interfaceNames = [];
	registeredAddress.createdAt = block.timestamp;
	registeredAddress.save()

	return registeredAddress
}

export function getRegisteredAddress(registeredAddressId: string): RegisteredAddress {
	const registeredAddress = RegisteredAddress.load(registeredAddressId);
	if (!registeredAddress) throw new Error('registeredAddress not found with id: ' + registeredAddressId);
	return registeredAddress;
}

/**
 * Create a claim or throw
 */

export function createClaim(transaction: ethereum.Transaction, distributionRecord: DistributionRecord, beneficiaryAddress: Address, amount: BigInt, uri: string, block: ethereum.Block): Claim {
	const claimId = transaction.hash.toHexString() + '-' + transaction.index.toHexString();
	let claim = Claim.load(claimId);

	if (claim) throw new Error('claim already exists with id: ' + claimId);

	claim = new Claim(claimId);
	claim.distributionRecord = distributionRecord.id;
	claim.amount = amount;
	claim.transactionHash = transaction.hash.toHexString();
	claim.createdAt = block.timestamp;
	claim.uri = uri;
	claim.save()

	return claim
}

/**
 * Create an adjustment or throw
 */
export function createAdjustment(transaction: ethereum.Transaction, distributionRecord: DistributionRecord, amount: BigInt, uri: string, block: ethereum.Block): Adjustment {
	const adjustmentId = transaction.hash.toHexString() + '-' + transaction.index.toHexString();
	let adjustment = Adjustment.load(adjustmentId);

	if (adjustment) throw new Error('adjustment already exists with id: ' + adjustmentId);

	adjustment = new Adjustment(adjustmentId);
	adjustment.distributionRecord = distributionRecord.id;
	adjustment.amount = amount;
	adjustment.transactionHash = transaction.hash.toHexString();
	adjustment.createdAt = block.timestamp;
	adjustment.uri = uri;
	adjustment.save();

	return adjustment;
}

export const hardCodedSaleIds = [
	'0x79c57db44f21229c5f149436dd2fa5f6827ff62441f585b8d792304873ce2d70',
	'0x9ae7fa4e0049fa03d2f30409f22b3f88a7bc2497360005e1018855976463f474',
	'0x537d3a85d36c4780751a7ad53edc7018dfeb9a1a5624ff7c1dc6d4e04952a8b4',
	'0xf2d9d6fbe8e7b425e8f8d6d22184b50c110cdcc9a2ec421a331b072193844db8',
	'0xa0ba0b802d948555579978276aab3baf0f52818635921301f9ecc91c60ade191',
	'0xe5a50f47a6a861c0a7c09dbefde327b784b5a1183df6264b38aeebdc267e5b91',
	'0x8cbd028ed628967c27c8399f02265c2807db4c0fa7604ea0b355424a8dd3273b'
]

export const hardCodedSaleUris = [
	'ipfs://QmWf3q5g7z5BVBny1Kc1UEZ6uQHxmyNrMdtZCPM2BPCfvc',
	'ipfs://QmW24dQnucNUF5sQMURF4AjZvSp6FUkF1JvgPc69s9tiuP',
	'ipfs://QmWMkzNNsQwyur3VmQhWxMzyi9nRJZevqrTJp7AGe81P5F',
	'ipfs://QmWH4oidyX42tWDqMQymxJwxnHbAwvdfYaUHVNa4Bwg1iz',
	'ipfs://QmQtZn9sa6kZPHc5JBFMTUV6RojbLQ1NsREo5GJy3GFPKN',
	'ipfs://QmQFnVeiwDn2rsh4spzuZdfvSLCJ2KkMqRizucqx1tDtpd',
	'ipfs://QmXPgQzZWXLcZQH6vdUppghAWZe2n4fXitWpy3jKQBPniu'
]

// check if any interfaces are contained in both lists
export const interfacesMatch = (interfaces1: string[], interfaces2: string[]): boolean => {
	for (let i = 0; i < interfaces1.length; i++) {
		if (interfaces2.indexOf(interfaces1[i]) !== -1) {
			return true
		}
	}
	return false
}

export const createCrosschainDistributor = (distributorId: string):void => {
	const distributorAddress: Address = Address.fromString(distributorId);

	CrosschainDistributor.create(distributorAddress);
}