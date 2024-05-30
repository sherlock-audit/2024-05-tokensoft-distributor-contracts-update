// import * as dotenv from "dotenv";
// dotenv.config();
// import "@nomicfoundation/hardhat-ethers";
// import "@nomicfoundation/hardhat-chai-matchers";
// import "@typechain/hardhat";
// import "hardhat-gas-reporter";
// import "solidity-coverage";
// import "@nomicfoundation/hardhat-verify";
// import "hardhat-deploy";
// import "hardhat-deploy-ethers";

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-foundry";
import "@nomicfoundation/hardhat-ignition-ethers";
import "hardhat-jest"; // Typescript

// Ensure your configuration variables are set before executing the script
const { vars } = require("hardhat/config");

// Add the following variables to the configuration variables.
const ALCHEMY_API_KEY = vars.get("ALCHEMY_API_KEY");
const EVM_PRIVATE_KEY_1 = vars.get("EVM_PRIVATE_KEY_1");
const EVM_PRIVATE_KEY_2 = vars.get("EVM_PRIVATE_KEY_2");
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.21",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [EVM_PRIVATE_KEY_1, EVM_PRIVATE_KEY_2],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

export default config;

// // If not set, it uses ours Alchemy's default API key.
// // You can get your own at https://dashboard.alchemyapi.io
// const providerApiKey = process.env.ALCHEMY_API_KEY || "oKxs-03sij-U_N0iOlrSsZFr29-IqbuF";
// // If not set, it uses the hardhat account 0 private key.
// const deployerPrivateKey =
//   process.env.DEPLOYER_PRIVATE_KEY ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
// // If not set, it uses ours Etherscan default API key.
// const etherscanApiKey = process.env.ETHERSCAN_API_KEY || "DNXJA8RX2Q3VZ4URQIWP7Z68CJXQZSC6AW";

// const selectedNetwork = process.env.HARDHAT_NETWORK || process.env.NETWORK || "localhost";

// function getApiKey(network) {
//   switch (network) {
//     case "avalanche":
//     case "fuji": {
//       return process.env.SNOWTRACE_API_KEY;
//     }
//     case "gnosis": {
//       return process.env.GNOSISSCAN_API_KEY;
//     }
//     case "mainnet":
//     case "goerli": {
//       return process.env.ETHERSCAN_API_KEY;
//     }
//     case "sepolia": {
//       return process.env.ETHERSCAN_API_KEY;
//     }
//     case "baseSepolia": {
//       return process.env.BASESCAN_API_KEY;
//     }
//     case "base": {
//       return process.env.BASESCAN_API_KEY;
//     }
//     case "optimism":
//     case "goerliOptimism":{
//       // optimism.etherscan.io: create an account at https://optimistic.etherscan.io/myapikey
//       return process.env.OPTIMISTIC_ETHERSCANSCAN_API_KEY;
//     }
//     case "mumbai":
//     case "matic": {
//       // https://polygonscan.com/
//       return process.env.POLYGONSCAN_API_KEY;
//     }
//     case "arbitrum":
//     case "goerliArbitrum":
//     case "devNetArbitrum": {
//       return process.env.ARBISCAN_API_KEY;
//     }
//     case 'celo':
//     case 'alfajores': {
//       // https://celoscan.io/
//       return process.env.CELOSCAN_API_KEY;
//     }
//     case 'bsc':
//     case 'bscTestnet': {
//       return process.env.BSC_API_KEY;
//     }
//     case 'moonbeam':
//     case 'moonriver': {
//       return process.env.MOONSCAN_API_KEY;
//     }
//     case 'baseGoerli': {
//       // API keys aren't supported yet
//       return ''
//       // return assertEnv('BASESCAN_API_KEY')
//     }
//     case "base": {
//       return process.env.BASESCAN_API_KEY;
//     }
//     case "baseSepolia": {
//       return process.env.BASESCAN_API_KEY;
//     }
//     case "polygonAmoy": {
//       return process.env.POLYGONSCAN_API_KEY;
//     }
//     case "localhost": {
//       return undefined;
//     }
//     default: {
//       // Add new cases to handle other networks!
//       throw new Error("unknown network");
//     }
//   }
// }

// const config: HardhatUserConfig = {
//   // solidity: {
//   //   version: "0.8.17",
//   //   settings: {
//   //     optimizer: {
//   //       enabled: true,
//   //       // https://docs.soliditylang.org/en/latest/using-the-compiler.html#optimizer-options
//   //       runs: 200,
//   //     },
//   //   },
//   // },
//   solidity: {
//     compilers: [
//       {
//         version: "0.8.21",
//         settings: {
//           optimizer: {
//             enabled: true,
//             runs: 200,
//           },
//           viaIR: true,
//         },
//       },
//       {
//         version: "0.8.16",
//         settings: {
//           optimizer: {
//             enabled: true,
//             runs: 200,
//           },
//           viaIR: true,
//         },
//       },
//       {
//         version: "0.8.17",
//         settings: {
//           optimizer: {
//             enabled: true,
//             runs: 200,
//           },
//           viaIR: true,
//         },
//       },
//     ],
//   },
//   defaultNetwork: selectedNetwork,
//   namedAccounts: {
//     deployer: {
//       // By default, it will take the first Hardhat account as the deployer
//       default: 0,
//     },
//   },
//   networks: {
//     // View the networks that are pre-configured.
//     // If the network you are looking for is not here you can add new network settings
//     hardhat: {
//       forking: {
//         url: `https://eth-mainnet.alchemyapi.io/v2/${providerApiKey}`,
//         enabled: process.env.MAINNET_FORKING_ENABLED === "true",
//       },
//     },
//     mainnet: {
//       url: `https://eth-mainnet.alchemyapi.io/v2/${providerApiKey}`,
//       accounts: [deployerPrivateKey],
//     },
//     sepolia: {
//       url: `https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`,
//       accounts: [deployerPrivateKey],
//     },
//     goerli: {
//       url: `https://eth-goerli.alchemyapi.io/v2/${providerApiKey}`,
//       accounts: [deployerPrivateKey],
//     },
//     arbitrum: {
//       url: `https://arb-mainnet.g.alchemy.com/v2/${providerApiKey}`,
//       accounts: [deployerPrivateKey],
//     },
//     arbitrumSepolia: {
//       url: `https://arb-sepolia.g.alchemy.com/v2/${providerApiKey}`,
//       accounts: [deployerPrivateKey],
//     },
//     optimism: {
//       url: `https://opt-mainnet.g.alchemy.com/v2/${providerApiKey}`,
//       accounts: [deployerPrivateKey],
//     },
//     optimismSepolia: {
//       url: `https://opt-sepolia.g.alchemy.com/v2/${providerApiKey}`,
//       accounts: [deployerPrivateKey],
//     },
//     polygon: {
//       url: `https://polygon-mainnet.g.alchemy.com/v2/${providerApiKey}`,
//       accounts: [deployerPrivateKey],
//     },
//     polygonMumbai: {
//       url: `https://polygon-mumbai.g.alchemy.com/v2/${providerApiKey}`,
//       accounts: [deployerPrivateKey],
//     },
//     polygonZkEvm: {
//       url: `https://polygonzkevm-mainnet.g.alchemy.com/v2/${providerApiKey}`,
//       accounts: [deployerPrivateKey],
//     },
//     polygonZkEvmTestnet: {
//       url: `https://polygonzkevm-testnet.g.alchemy.com/v2/${providerApiKey}`,
//       accounts: [deployerPrivateKey],
//     },
//     gnosis: {
//       url: "https://rpc.gnosischain.com",
//       accounts: [deployerPrivateKey],
//     },
//     chiado: {
//       url: "https://rpc.chiadochain.net",
//       accounts: [deployerPrivateKey],
//     },
//     base: {
//       url: "https://mainnet.base.org",
//       accounts: [deployerPrivateKey],
//     },
//     baseGoerli: {
//       url: "https://goerli.base.org",
//       accounts: [deployerPrivateKey],
//     },
//     baseSepolia: {
//       url: "https://sepolia.base.org",
//       accounts: [deployerPrivateKey],
//     },
//     scrollSepolia: {
//       url: "https://sepolia-rpc.scroll.io",
//       accounts: [deployerPrivateKey],
//     },
//     scroll: {
//       url: "https://rpc.scroll.io",
//       accounts: [deployerPrivateKey],
//     },
//     pgn: {
//       url: "https://rpc.publicgoods.network",
//       accounts: [deployerPrivateKey],
//     },
//     pgnTestnet: {
//       url: "https://sepolia.publicgoods.network",
//       accounts: [deployerPrivateKey],
//     },
//   },
//   // configuration for harhdat-verify plugin
//   etherscan: {
//     apiKey: getApiKey(selectedNetwork),
//     customChains: [
//       {
//         network: "baseSepolia",
//         chainId: 84532,
//         urls: {
//           apiURL: "https://api-sepolia.basescan.org/api",
//           browserURL: "https://sepolia.basescan.org",
//         },
//       },
//     ],
//   },
//   // configuration for etherscan-verify from hardhat-deploy plugin
//   verify: {
//     etherscan: {
//       apiKey: `${etherscanApiKey}`,
//     },
//   },
//   sourcify: {
//     enabled: false,
//   },
// };

// export default config;
