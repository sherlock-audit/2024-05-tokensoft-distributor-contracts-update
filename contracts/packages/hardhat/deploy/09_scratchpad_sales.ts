// require("@nomiclabs/hardhat-etherscan");

module.exports = async ({ getNamedAccounts, deployments }) => {
	// const { deploy } = deployments;
	// const { deployer } = await getNamedAccounts();

	// Sale v2.1
	// await deploy("FlatPriceSale_v_2_1", {
	// 	from: deployer,
	// 	args: [0, "0x0000000000000000000000000000000000000000"],
	// 	log: true
	// });

	// await deploy("FlatPriceSaleFactory_v_2_1", {
	// 	from: deployer,
	// 	args: ["0x797c0d5bc32bc29438c0555ea61eb0318be40797"],
	// 	log: true
	// });

	// TO VERIFY ON CERTAIN NETWORKS
	// NETWORK=mumbai yarn verify --api-url https://api-testnet.polygonscan.com --api-key API_KEY
	// NETWORK=matic yarn verify --api-url https://api.polygonscan.com --api-key API_KEY
	// NETWORK=bsc yarn verify --api-url https://api.bscscan.com --api-key API_KEY
	// NETWORK=optimism yarn verify --api-url https://api-optimistic.etherscan.io/ --api-key API_KEY
	// NETWORK=arbitrum yarn verify --api-url https://api.arbiscan.io --api-key API_KEY
};

module.exports.tags = ["09", "scratchpad_sales"]
