import fs from 'fs'
import { parseAccounts } from './merkle'
import BigNumber from 'bignumber.js'

const csv = require('csvtojson')

const DEFAULT_DECIMAL_PLACES = 20

let totalAmount = 0

// prevent scientific notation
BigNumber.config({ EXPONENTIAL_AT: 1e9 })

/**
 * Usage: yarn run generate-merkle-root <path to input json> <path to output merkle tree> <formatter> <delimiter>
 *
 * See packages/hardhat/script/sample_data/dev_wallets for example input json file.
 *
 * Input json files must meet the following requirements:
 *
 * Each entry is indexed with a unique key value (typically a wallet address)
 * Each entry must have a data array with at least one element in it
 * Each entry in the data array must consist of a name, type and value. See https://docs.soliditylang.org/en/v0.8.17/types.html for a list of valid solidity data types
 *
 * Custom fields may be added to each entry.  All custom fields will be included in the resulting merkle tree output file.
 *
 * {
 *   "0xfac9c60874eab932fa424e38f79a8b54f333e544": {    <---- UNIQUE KEY VALUE
 *       "someCustomKey": "someCustomValue",            <---- OPTIONAL CUSTOM FIELDS
 *       "data": [                                      <---- MANDATORY DATA ARRAY
 *       {
 *           "name": "index",                           <---- DATA FIELDS
 *           "type": "uint256",
 *           "value": 0
 *       },
 *       {
 *           "name": "beneficiary",
 *           "type": "address",
 *           "value": "0xfac9c60874eab932fa424e38f79a8b54f333e544"
 *       },
 *       {
 *           "name": "amount",
 *           "type": "uint256",
 *           "value": "5000000000000000000000"
 *       }
 *       ]
 *   }
 * }
 *
 */

async function main() {
    const myArgs = process.argv.slice(2);
    const inputFile = myArgs[0]
    const outputFile = myArgs[1]
    const format = myArgs[2] || 'addressonly' // valid values include multichain, indexed, addressonly
    const delimiter = myArgs[3] || '\t'

    let accounts;

    // crude file type detection
    if (inputFile.endsWith('.csv')) {
        const lines = await csv({noheader:true, delimiter: delimiter}).fromFile(inputFile)

        accounts = lines.reduce((obj, line, index) => {
            if (!line) {
                console.log('skipping empty line')
                return obj;
            }

            const address = line.field1.toLowerCase()

            switch(format) {
                case 'multichain':
                    obj = buildMultiChainDistributorNode(obj, line, index)
                    break
                case 'indexed':
                    obj = buildIndexedDistributorNode(obj, line, index)
                    break
                case 'loadtest':
                    obj = buildLoadTestDistributorNode(obj, line, index)
                    break
                case 'connext-preview':
                    obj = buildConnextPreviewDistributorNode(obj, line, index)
                    break
                default:
                    obj = buildAddressOnlyNode(obj, line, index)
                    break
            }

            return obj
        }, {})
    } else {
        accounts = JSON.parse(fs.readFileSync(inputFile, { encoding: 'utf8' }))
    }

    const tree = parseAccounts(accounts)
    const merkleOutputString = JSON.stringify(tree)
    fs.writeFileSync(outputFile, merkleOutputString, { encoding: 'utf8' })

    console.log('Merkle Root: ' + tree.merkleRoot)
    console.log('Total Amount: ' + totalAmount)
    console.log('Total Entries: ' + Object.keys(tree.claims).length)
}

function buildMultiChainDistributorNode(obj: any, line: any, index: number) {
    const address = line.field1.toLowerCase()
    const amount = line.field2
    const domains = line.field3

    if (!amount || !domains) {
        throw new Error('Amount and Domain fields are required for multichain distributors')
    }

    if (Number(amount) === 0) {
        throw new Error(`Invalid amount for address: ${line}`)
    }

    const domainTokens = domains.split(',')
    totalAmount += Number(amount)

    if (domainTokens?.length <= 0) {
        throw new Error(`Missing domain for address: ${line}`)
    }

    domainTokens.forEach((domain) => {
        if(!['6648936','1869640809','1886350457','1634886255','6450786','6778479'].includes(domain)) {
            throw new Error(`Invalid domain for address: ${domain}`)
        }

        if (Object.keys(obj).includes(`${address}_${domain}`)) {
            // throw new Error(`Duplicate entry for address: ${address}`)
            console.log(`    Duplicate entry for address: ${address}_${domain}!!!!`)
        }

        if (index % 500 === 0) {
            console.log(`${index}...`)
        }

        obj[`${address}_${domain}`] = {
            index: index,
            address: address,
            data: [
                {
                    name: "beneficiary",
                    type: "address",
                    value: address
                },
                {
                    name: "amount",
                    type: "uint256",
                    value: amount
                },
                {
                    name: "domain",
                    type: "uint32",
                    value: domain
                }
            ]
        }
    })

    return obj;
}

function buildIndexedDistributorNode(obj: any, line: any, index: number) {
    const address = line.field1.toLowerCase()
    const amount = line.field2

    obj[address] = {
        index: index,
        address: address,
        data: [
            {
                name: "index",
                type: "uint256",
                value: index
            },
            {
                name: "beneficiary",
                type: "address",
                value: address
            },
            {
                name: "amount",
                type: "uint256",
                value: amount
            }
        ]
    }

    return obj;
}

function buildLoadTestDistributorNode(obj: any, line: any, index: number) {
    const address = line.field1.toLowerCase()
    const amount = line.field4

    totalAmount += Number(amount)

    obj[address] = {
        index: index,
        address: address,
        data: [
            {
                name: "index",
                type: "uint256",
                value: index
            },
            {
                name: "beneficiary",
                type: "address",
                value: address
            },
            {
                name: "amount",
                type: "uint256",
                value: amount
            }
        ]
    }

    return obj;
}

function buildConnextPreviewDistributorNode(obj: any, line: any, index: number) {
    const address = line.field1.toLowerCase()
    const amount = line.field2.trim()
    const domain = '1735353714'

    totalAmount += Number(amount)

    obj[`${address}_${domain}`] = {
        index: index,
        address: address,
        data: [
            {
                name: "beneficiary",
                type: "address",
                value: address
            },
            {
                name: "amount",
                type: "uint256",
                value: amount
            },
            {
                name: "domain",
                type: "uint32",
                value: "1735353714"
            }
        ]
    }

    return obj;
}

function buildAddressOnlyNode(obj: any, line: any, index: number) {
    const address = line.field1.toLowerCase()

    obj[address] = {
        index: index,
        address: address,
        data: [
            {
                name: "address",
                type: "address",
                value: address
            }
        ]
    }

    return obj;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
      console.error(error);
      process.exit(1);
  });