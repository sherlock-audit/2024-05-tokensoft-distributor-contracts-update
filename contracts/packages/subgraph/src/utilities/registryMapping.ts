import { DeployRegistry, OwnershipTransferred, Register, RoleGranted, RoleRevoked, Unregister } from "../../generated/Registry/Registry"
import { getOrCreateAccount, getOrCreateAdvancedDistributor, getOrCreateContinuousVesting, getOrCreateDistributor, getOrCreateMerkleSet, getOrCreatePriceTiers, getOrCreateRegisteredAddress, getOrCreateRegistry, getOrCreateTrancheVesting, getRegisteredAddress, interfacesMatch, createCrosschainDistributor } from "../lib"
import { Address, Bytes, ethereum, log } from "@graphprotocol/graph-ts"
import {currentInterfaces, legacyInterfaces} from '../../generated/interfaces'
import { RegisteredAddress, Distributor } from "../../generated/schema"
import { getOrCreateTrader } from "../trade/traderMapping"

// workaround for assemblyscript limitations
function includes(b: Bytes[], a: string): boolean {
	for (let i = 0; i < b.length; i++) {
		if (b[i].toHexString() == a) return true
	}
	return false
}

export function handleDeployRegistry(event: DeployRegistry): void {
	// Get or create the registry
	log.warning('handling deploy registry for {}', [event.address.toHexString()])
	getOrCreateRegistry(event.address.toHexString(), event.block)
}

/**
 * Get the extra info on a distributor
 */
 export function AddDistributorInfo(distributor: Distributor, block: ethereum.Block): RegisteredAddress {
	if (distributor.registeredAddress == null) {
		throw new Error(`Cannot add distributor info - distributor ${distributor.id} does not have a matching registered address`)
	}
	const registeredAddress = getRegisteredAddress(distributor.registeredAddress as string)
	log.info('Trying to add distributor info to distributor {} with interfaces {}', [registeredAddress.id, registeredAddress.interfaceIds.toString()])

	// add advanced distributor info
	if (interfacesMatch(registeredAddress.interfaceIds, [currentInterfaces.AdvancedDistributor, legacyInterfaces.AdvancedDistributor, "0xfea5558a", "0xac409228"])) {
		log.info('Registered {} as AdvancedDistributor', [registeredAddress.id])
		getOrCreateAdvancedDistributor(distributor.id, block)
	}

	// add merkle distributor info
	if (interfacesMatch(registeredAddress.interfaceIds, [currentInterfaces.IMerkleSet, legacyInterfaces.IMerkleSet])) {
		log.info('Registered {} as IMerkleSet', [registeredAddress.id])
		const merkleSet = getOrCreateMerkleSet(distributor.id, block)
	}

	// add various vesting configs
	if (interfacesMatch(registeredAddress.interfaceIds, [currentInterfaces.ITrancheVesting, "0xb3854e29", "0x93cc7303", "0x3b6767f5", "0x7c9dae5c"])) {
		if (distributor.id != '0xd7bd991f09203fd70353b84ea1e2be2d4b652c85') {
			log.info('Registered {} as ITrancheVesting', [registeredAddress.id])
				getOrCreateTrancheVesting(distributor.id, block)
		}
	} else if (interfacesMatch(registeredAddress.interfaceIds, [currentInterfaces.IContinuousVesting, legacyInterfaces.IContinuousVesting, "0xcacb5171", "0x09e04257", "0x7c13a6ee"])) {
		log.info('Registered {} as IContinuousVesting', [registeredAddress.id])
		getOrCreateContinuousVesting(distributor.id, block)
	} else if (interfacesMatch(registeredAddress.interfaceIds, [currentInterfaces.IPriceTierVesting, "0x71f30ab2"]) || distributor.id == '0xd7bd991f09203fd70353b84ea1e2be2d4b652c85') {
		getOrCreatePriceTiers(distributor.id, block)
	}

	// add crosschain distributor info
	if (
		interfacesMatch(registeredAddress.interfaceIds, [currentInterfaces.CrosschainDistributor, "0xbda88b28","0x4d91fe87"])
		// misconfigured test distributor on goerli
		&& distributor.id != '0xb3ff7d09c4871cfcfea4e1520e6565092b213aab'
	) {
		log.info('Registered {} as CrosschainDistributor', [registeredAddress.id])
		createCrosschainDistributor(distributor.id)
	}

	return registeredAddress;
}


// When the clone factory clones an existing implementation contract, save the  sale
export function handleRegister(event: Register): void {
	const registry = getOrCreateRegistry(event.address.toHexString(), event.block)

	const registeredAddress = getOrCreateRegisteredAddress(event.params.addressRegistered.toHexString(), event.block, registry.id)

	registeredAddress.registry = registry.id
	const interfaceIds: string[] = registeredAddress.interfaceIds
	const interfaceNames: string[] = registeredAddress.interfaceNames

	// Add the new interfaces to the array
	log.warning('registering address {} with {} new interfaces:', [registeredAddress.id, event.params.interfaceIds.length.toString()])
	for (let i = 0; i < event.params.interfaceIds.length; i++) {
		const newInterface = event.params.interfaceIds[i].toHexString()
		if (interfaceIds.includes(newInterface)) continue
		interfaceIds.push(newInterface)
		interfaceNames.push((currentInterfaces.get(interfaceIds[i]) || legacyInterfaces.get(interfaceIds[i]) || '?')!)
		log.info('Registered address {} interface {}: {} ({})', [registeredAddress.id, i.toString(), interfaceNames[i], interfaceIds[i]])
	}
	registeredAddress.interfaceIds = interfaceIds
	registeredAddress.interfaceNames = interfaceNames
	registeredAddress.save()

	// Special case: a distributor
	if (interfacesMatch(registeredAddress.interfaceIds, [currentInterfaces.IDistributor, legacyInterfaces.IDistributor, "0x0621dbd4", "0xab85ea0e", "0xa4d35362", "0x8401541e", "0x2c597ff5", "0x616aa576", "0xa3996a27"]))  {
		log.info('Registered {} as IDistributor', [registeredAddress.id])
		// the registered address is a distributor
		const distributor = getOrCreateDistributor(Address.fromString(registeredAddress.id), event.block);
		distributor.registeredAddress = registeredAddress.id
		distributor.save()

		// get additional info
		AddDistributorInfo(distributor, event.block)
	}

	// Special case: a Trader
	if (registeredAddress.interfaceIds.includes(currentInterfaces.Trader)) {
		log.info('Registered {} as Trader', [registeredAddress.id])
		getOrCreateTrader(event.params.addressRegistered, event.block)
	}
}

export function handleUnregister(event: Unregister): void {
	const registry = getOrCreateRegistry(event.address.toHexString(), event.block)
	const registeredAddress = getOrCreateRegisteredAddress(event.params.addressUnregistered.toHexString(), event.block, registry.id)

	// remove any recorded interface that was unregistered
	const interfaceIds: string[] = []
	const interfaceNames: string[] = []

	// check if the registered address is a distributor
	for (let i = 0; i < registeredAddress.interfaceIds.length; i++) {
		const interfaceId = registeredAddress.interfaceIds[i]
		if (includes(event.params.interfaceIds, interfaceId)) {
			log.info('removing interface {} from address {}', [interfaceId, registeredAddress.id])
		} else {
			// this interface is not being unregistered: it can be kept on the registered address!
			interfaceIds.push(interfaceId)
			interfaceNames.push(registeredAddress.interfaceNames[i])
		}

		// TODO: remove Distributor and associated records?
	if (interfacesMatch(registeredAddress.interfaceIds, [currentInterfaces.IDistributor, legacyInterfaces.IDistributor])) {
			log.warning('unhandled unregistration of distributor {}', [registeredAddress.id])
			break
		}
	}

	// TODO: remove names from interfaceNames
	// TODO: do we need interfaceNames?
	
	// update the interfaceIds to remove any unregistered
	registeredAddress.interfaceIds = interfaceIds
	registeredAddress.save()
}

export function handleRoleGranted(event: RoleGranted): void {
	log.info('adding admin {} to registry {}', [event.params.account.toHexString(), event.address.toHexString()])
	const registry = getOrCreateRegistry(event.address.toHexString(), event.block)

	// already known
	if (registry.admins.includes(event.params.account.toHexString())) return

	// the only role defined is an admin role
	const admins = registry.admins
	admins.push(event.params.account.toHexString())
	registry.admins = admins
	registry.save()
}

export function handleRoleRevoked(event: RoleRevoked): void {
	log.info('removing admin {} from registry {}', [event.params.account.toHexString(), event.address.toHexString()])
	const registry = getOrCreateRegistry(event.address.toHexString(), event.block)

	// the only role defined is an admin role
	if (registry.admins.includes(event.params.account.toHexString())) {
		const admins = registry.admins.splice(registry.admins.indexOf(event.params.account.toHexString()), 1)
		registry.admins = admins
		registry.save()
	}
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
	const registry = getOrCreateRegistry(event.address.toHexString(), event.block)
	const owner = getOrCreateAccount(event.params.newOwner, event.block)
	registry.owner = owner.id
	log.info('changed registry {} owner to {}', [registry.id, event.params.newOwner.toHexString()])
	registry.save()
}
