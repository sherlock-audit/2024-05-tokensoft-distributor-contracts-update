# SoftDAO Contracts

## Table of Contents

- [Requirements](#requirements)
- [Testing](#testing)
- [WIP: Deploying and Verifying](#deploying-and-verifying)

## Requirements

Before you begin, you need to install the following tools:

- Node (v18) and npm (v10)
- Git

## Testing

Setup your repository and contracts for the tests:

Note: The compile command may take some time to complete.

```shell
npm install
npx hardhat compile
```

Run Hardhat Tests:

```shell
npx hardhat jest
```

Run Foundry Tests:

Note: This will do some setup the first time you run it.

```shell
forge test
```

## WIP: Deploying and Verifying

Run a local Ethereum network using Hardhat. Customize the network configuration in `hardhat.config.ts`.

```shell
npx hardhat node
```

Deploying a contract using Hardhat to a specified network.

```shell
npx hardhat ignition deploy ./ignition/modules/Lock.js --network <your-network>
```

Deploying and verifying a contract using Foundry to a specified network.

```shell
forge create --rpc-url arbitrum --private-key <your ethereum private key> --verify --etherscan-api-key <your api key> contracts/claim/factory/ContinuousVestingMerkleDistributor.sol:ContinuousVestingMerkleDistributor
```

```shell
forge verify-contract <contract address> contracts/claim/factory/ContinuousVestingMerkleDistributorFactory.sol:ContinuousVestingMerkleDistributorFactory --constructor-args "00000000000000000000000081bA49a32491669851431ea0CCEdA767b1005db6" --etherscan-api-key <your api key> --optimizer-runs=100
```

The contracts are located in `contracts`. The `yarn deploy` command uses the deploy script located in `script` to deploy the contract to the network.

By default, `yarn deploy` will deploy the contract to the local network. You can change the defaultNetwork in `packages/hardhat/hardhat.config.ts.` You could also simply run `yarn deploy --network target_network` to deploy to another network.

Check the `hardhat.config.ts` for the networks that are pre-configured. You can also add other network settings to the `hardhat.config.ts` file. Here are the [Alchemy docs](https://docs.alchemy.com/docs/how-to-add-alchemy-rpc-endpoints-to-metamask) for information on specific networks.

Generate a new account or add one to deploy the contract(s) from. Additionally you will need to add your Alchemy API key. Rename `.env.example` to `.env` and fill the required keys.

```
ALCHEMY_API_KEY="",
DEPLOYER_PRIVATE_KEY=""
```

The deployer account is the account that will deploy your contracts. Additionally, the deployer account will be used to execute any function calls that are part of your deployment script.

You can generate a random account / private key with `yarn generate` or add the private key of your crypto wallet. `yarn generate` will create a random account and add the DEPLOYER_PRIVATE_KEY to the .env file. You can check the generated account with `yarn account`.

Deploy your smart contract(s)

Run the command below to deploy the smart contract to the target network. Make sure to have some funds in your deployer account to pay for the transaction.

```
yarn deploy --network network_name
```

Verify your smart contract

You can verify your smart contract on Etherscan by running:

```
yarn verify --network network_name
```
