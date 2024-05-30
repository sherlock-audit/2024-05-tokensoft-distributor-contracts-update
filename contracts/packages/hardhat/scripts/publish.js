const fs = require("fs");
const chalk = require("chalk");

const graphDir = "../subgraph";
const deploymentsDir = "./deployments";
const graphConfigPath = `${graphDir}/config.json`;

function publishContract(contractName, networkName) {
  try {
    let contract = fs
      .readFileSync(`${deploymentsDir}/${networkName}/${contractName}.json`)
      .toString();

    contract = JSON.parse(contract);
    const contractAddress = contract.address;
    const contractBlockNumber = networkName === 'localhost' ? 0 : contract.receipt.blockNumber;

    let graphConfig;
    try {
      if (fs.existsSync(graphConfigPath)) {
        graphConfig = fs.readFileSync(graphConfigPath).toString();
      } else {
        graphConfig = "{}";
      }
    } catch (e) {
      console.log(e);
    }

    graphConfig = JSON.parse(graphConfig);
    if (!Object.keys(graphConfig).includes(networkName)) {
      graphConfig[`${networkName}`] = {};
    }

    if (!Object.keys(graphConfig[`${networkName}`]).includes(contractName)) {
      graphConfig[`${networkName}`][`${contractName}`] = [];
    }

    const found = graphConfig[`${networkName}`][`${contractName}`]
      .findIndex((contract) => contract.Address === contractAddress && contract.BlockNumber === contractBlockNumber)

    if (found < 0) {
      graphConfig[`${networkName}`][`${contractName}`].unshift({
        'Address': contractAddress,
        'BlockNumber': contractBlockNumber,
        'PublishedAt': `${new Date().toUTCString()}`,
        'Git': {
          'Branch': `${process.env.GIT_BRANCH}`,
          'Commit': `${process.env.GIT_COMMIT}`
        }
      });
    }

    // write json config file
    const folderPath = graphConfigPath.replace("/config.json", "");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    fs.writeFileSync(graphConfigPath, JSON.stringify(graphConfig, null, 2));
    return true;
  } catch (e) {
    console.log(
      "Failed to publish " + chalk.red(contractName) + " to the subgraph."
    );
    console.log(e);
    return false;
  }
}

async function main() {
  const directories = fs.readdirSync(deploymentsDir);
  const targetNetwork = process.env.NETWORK || 'localhost';
  const directory = directories.find(d => d === targetNetwork);

  const interfaces = {}

  if (directory) {
    console.log('Network:', targetNetwork);
    const files = fs.readdirSync(`${deploymentsDir}/${directory}`);
    files.forEach(function (file) {
      if (file.indexOf(".json") >= 0) {
        const contractName = file.replace(".json", "");
        publishContract(contractName, directory);
      }
    });

    console.log("✅  Successfully published contracts for network " + targetNetwork);
    
  } else {
    console.log("Skipping publishing contracts for network " + targetNetwork);
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
