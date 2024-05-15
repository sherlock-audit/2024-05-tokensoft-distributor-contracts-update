import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network goerli`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // THIS IS A SAMPE ON HOW OT DEPLOY A CONTRACT USING `yarn deploy` COMMAND
  // YOU CAN DEPLOY YOUR OWN CONTRACTS BY MODIFYING THIS FILE

  await deploy("ContinuousVestingMerkleDistributor", {
    from: deployer,
    // Contract constructor arguments
    args: [],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract to interact with it after deploying.
  const ContinuousVestingMerkleDistributorContract = await hre.ethers.getContract<Contract>(
    "ContinuousVestingMerkleDistributor",
    deployer,
  );
  console.log("👋 Initial greeting:", ContinuousVestingMerkleDistributorContract.target);

  await deploy("ContinuousVestingMerkleDistributorFactory", {
    from: deployer,
    // Contract constructor arguments
    args: [ContinuousVestingMerkleDistributorContract.target],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  const continuousVestingMerkleDistributorFactoryContract = await hre.ethers.getContract<Contract>(
    "ContinuousVestingMerkleDistributorFactory",
    deployer,
  );

  console.log(
    "deployed continuousVestingMerkleDistributorFactoryContract",
    continuousVestingMerkleDistributorFactoryContract.target,
  );
}

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["00", "deploy"];
