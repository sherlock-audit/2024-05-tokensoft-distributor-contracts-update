import { SetMerkleRoot } from "../../../generated/templates/MerkleSet/IMerkleSet";
import { getOrCreateDistributor, getOrCreateMerkleSet } from "../../lib";

export function handleSetMerkleRoot(event: SetMerkleRoot): void {
	const distributor = getOrCreateDistributor(event.address, event.block)
	const merkleSet = getOrCreateMerkleSet(distributor.id, event.block)

	if (merkleSet) {
		merkleSet.root = event.params.merkleRoot.toHexString()
		merkleSet.save()
	}
}
