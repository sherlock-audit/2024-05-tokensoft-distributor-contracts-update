module.exports = async ({ getNamedAccounts, deployments }) => {
	const { deploy } = deployments;
	const { deployer } = await getNamedAccounts();

	// const TEN_BILLION = "10000000000000000000000000000";

	// deploy a distributor implementation
	// await deploy("ContinuousVestingMerkleDistributor", {
	// 	from: deployer,
	// 	args: [],
	// 	log: true
	// });

	// deploy a distributor factory
	// await deploy("ContinuousVestingMerkleDistributorFactory", {
	// 	from: deployer,
	// 	args: ["0x31184BEc8DA86A9A9041C835Ce020e2862b78138"], <!---- address from distributor deploy
	// 	log: true
	// });

	// deploy a distributor implementation
	// await deploy("TrancheVestingMerkleDistributor", {
	// 	from: deployer,
	// 	args: [],
	// 	log: true
	// });

	// deploy a distributor factory
	// await deploy("ContinuousVestingMerkleDistributorFactory", {
	// 	from: deployer,
	// 	args: ["0xa75A233eA0CE3155b50394011A298DB3466A8e94"], <!---- address from distributor deploy
	// 	log: true
	// });

};

module.exports.tags = ["08", "scratchpad"]
