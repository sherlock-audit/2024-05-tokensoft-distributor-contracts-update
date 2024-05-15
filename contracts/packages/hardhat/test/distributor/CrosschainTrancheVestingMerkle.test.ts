import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import hre from 'hardhat'
import { GenericERC20, CrosschainTrancheVestingMerkle__factory, CrosschainTrancheVestingMerkle, ERC20, GenericERC20__factory, IConnext, Satellite__factory, Satellite, ConnextMock__factory, ConnextMock } from "../../typechain-types";
import SatelliteDefinition from '../../artifacts/contracts/claim/Satellite.sol/Satellite.json'
import { time } from "@nomicfoundation/hardhat-network-helpers";
import exp from "constants";

const ethers = (hre as any).ethers

jest.setTimeout(30000);

type Tranche = {
  time: bigint
  vestedFraction: bigint
}

let deployer: SignerWithAddress
let eligible1: SignerWithAddress
let eligible2: SignerWithAddress
let eligible3: SignerWithAddress
let ineligible: SignerWithAddress
let token: GenericERC20
let otherToken: GenericERC20
let DistributorFactory: CrosschainTrancheVestingMerkle__factory
let ConnextFactory: ConnextMock__factory
let connextMockSource: ConnextMock
let connextMockDestination: ConnextMock
let SatelliteFactory: Satellite__factory
let distributor: CrosschainTrancheVestingMerkle
let distributorWithQueue: CrosschainTrancheVestingMerkle
let satellite: Satellite

let tranches: Tranche[]

// largest possible delay for the distributor using a fair queue
const maxDelayTime = 1000n

// domains for crosschain claims
const SOURCE_DOMAIN = 1735353714;
const DESTINATION_DOMAIN = 2;


type Config = {
  total: bigint
  uri: string
  votingFactor: bigint
  proof: {
    merkleRoot: string
    claims: {
      [k: string]: {
        proof: string[],
        data: {
          name: string
          type: string
          value: string
        }[]
      }
    }
  }
}

// distribute a million tokens in total
const config: Config = {
  // 8500 tokens
  total: 8500000000000000000000n,
  // any string will work for these unit tests - the uri is not used on-chain
  uri: 'https://example.com',
  // 2x, denominated in fractionDenominator of 1e4 (basis points)
  votingFactor: 2n * 10n ** 4n,
  // created using yarn generate-merkle-root
  proof: {
    "merkleRoot": "0x3399e578a7bff45b20657250f95b3615842251d97ed589d2e2cbdfeb1f6221df",
    "claims": {
      "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc_1735353714": {
        "proof": [
          "0x6718c87625cce6cc64ebea422c01216633da3330fe7c9098da88b4734f8bc2a8",
          "0x476b9a794fc5bb3f179ce62fe321538eb5ec1fc61ad52c611ce7777d5b6772a9",
          "0x6ce2381eb35666c935c53012fc7b1c094afa7016a0105b991386e1b5047b9a42",
          "0xd2d3a588cf66b5845d61bed8bcc1ea02e5262d3da644e74dc20c19d54f2672c0"
        ],
        "data": [
          {
            "name": "beneficiary",
            "type": "address",
            "value": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
          },
          {
            "name": "amount",
            "type": "uint256",
            "value": "1000"
          },
          {
            "name": "domain",
            "type": "uint32",
            "value": "1735353714"
          }
        ]
      },
      "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc_2": {
        "proof": [
          "0xd7374742afbdba8cd08695797d600178f2f4dd8e96393278015e54537ca6abfb"
        ],
        "data": [
          {
            "name": "beneficiary",
            "type": "address",
            "value": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
          },
          {
            "name": "amount",
            "type": "uint256",
            "value": "1000"
          },
          {
            "name": "domain",
            "type": "uint32",
            "value": "2"
          }
        ]
      },
      "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc_9991": {
        "proof": [
          "0x4e0a7d895052a7a3f15aab83c8eaf07f6aeedecf80180b939afcd04a1da90054",
          "0x76b9712b2409dcb4449bd096a2902b87b13c43a5072e2da15920338790e7972d",
          "0x6ce2381eb35666c935c53012fc7b1c094afa7016a0105b991386e1b5047b9a42",
          "0xd2d3a588cf66b5845d61bed8bcc1ea02e5262d3da644e74dc20c19d54f2672c0"
        ],
        "data": [
          {
            "name": "beneficiary",
            "type": "address",
            "value": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
          },
          {
            "name": "amount",
            "type": "uint256",
            "value": "1000"
          },
          {
            "name": "domain",
            "type": "uint32",
            "value": "9991"
          }
        ]
      },
      "0x70997970c51812dc3a010c7d01b50e0d17dc79c8_1735353714": {
        "proof": [
          "0xaf2464ccc18de3428ad47d81761e6e8a11181721bdafe6f771472868383e431c",
          "0xc20c9f5eeaae4ee16fe1a2d45461426fedcec9fad53fabfce4aa0a8e561c28f4",
          "0x0842d94fc2f26214e0a1b947c555b3a6aaccccd693ccd0b318701ab352a4f945",
          "0xd2d3a588cf66b5845d61bed8bcc1ea02e5262d3da644e74dc20c19d54f2672c0"
        ],
        "data": [
          {
            "name": "beneficiary",
            "type": "address",
            "value": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
          },
          {
            "name": "amount",
            "type": "uint256",
            "value": "1000"
          },
          {
            "name": "domain",
            "type": "uint32",
            "value": "1735353714"
          }
        ]
      },
      "0x70997970c51812dc3a010c7d01b50e0d17dc79c8_2": {
        "proof": [
          "0xccd469a0611b0196a3c3ae606b4a4273afd6adee2c89f47c3451d70f568f2a00",
          "0xd23b1cb50c3935dc60ef37e2d271f0774ec32628a88ea01a38fe4f8e5a3d17d3",
          "0x0842d94fc2f26214e0a1b947c555b3a6aaccccd693ccd0b318701ab352a4f945",
          "0xd2d3a588cf66b5845d61bed8bcc1ea02e5262d3da644e74dc20c19d54f2672c0"
        ],
        "data": [
          {
            "name": "beneficiary",
            "type": "address",
            "value": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
          },
          {
            "name": "amount",
            "type": "uint256",
            "value": "1000"
          },
          {
            "name": "domain",
            "type": "uint32",
            "value": "2"
          }
        ]
      },
      "0x70997970c51812dc3a010c7d01b50e0d17dc79c8_9991": {
        "proof": [
          "0xb8cb8af04efd13b603589588a13c9e63474c4d79452a944db4e9c7d2d2c7ec2f",
          "0xc20c9f5eeaae4ee16fe1a2d45461426fedcec9fad53fabfce4aa0a8e561c28f4",
          "0x0842d94fc2f26214e0a1b947c555b3a6aaccccd693ccd0b318701ab352a4f945",
          "0xd2d3a588cf66b5845d61bed8bcc1ea02e5262d3da644e74dc20c19d54f2672c0"
        ],
        "data": [
          {
            "name": "beneficiary",
            "type": "address",
            "value": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
          },
          {
            "name": "amount",
            "type": "uint256",
            "value": "1000"
          },
          {
            "name": "domain",
            "type": "uint32",
            "value": "9991"
          }
        ]
      },
      "0x90f79bf6eb2c4f870365e785982e1f101e93b906_1735353714": {
        "proof": [
          "0x1af5318f76f272183cb0c4cebdb544c015a1f393b1704ecaa5d55e0a74f23a48",
          "0x76b9712b2409dcb4449bd096a2902b87b13c43a5072e2da15920338790e7972d",
          "0x6ce2381eb35666c935c53012fc7b1c094afa7016a0105b991386e1b5047b9a42",
          "0xd2d3a588cf66b5845d61bed8bcc1ea02e5262d3da644e74dc20c19d54f2672c0"
        ],
        "data": [
          {
            "name": "beneficiary",
            "type": "address",
            "value": "0x90f79bf6eb2c4f870365e785982e1f101e93b906"
          },
          {
            "name": "amount",
            "type": "uint256",
            "value": "1000"
          },
          {
            "name": "domain",
            "type": "uint32",
            "value": "1735353714"
          }
        ]
      },
      "0x90f79bf6eb2c4f870365e785982e1f101e93b906_2": {
        "proof": [
          "0x73df9df38ba48b812d2bad1c95fa3ba5390bdc5c3aec13e4c598a893c8af4811",
          "0x476b9a794fc5bb3f179ce62fe321538eb5ec1fc61ad52c611ce7777d5b6772a9",
          "0x6ce2381eb35666c935c53012fc7b1c094afa7016a0105b991386e1b5047b9a42",
          "0xd2d3a588cf66b5845d61bed8bcc1ea02e5262d3da644e74dc20c19d54f2672c0"
        ],
        "data": [
          {
            "name": "beneficiary",
            "type": "address",
            "value": "0x90f79bf6eb2c4f870365e785982e1f101e93b906"
          },
          {
            "name": "amount",
            "type": "uint256",
            "value": "1000"
          },
          {
            "name": "domain",
            "type": "uint32",
            "value": "2"
          }
        ]
      },
      "0x90f79bf6eb2c4f870365e785982e1f101e93b906_9991": {
        "proof": [
          "0xc25b7c5617644193bb62c05eec3bccb2d1576238d1ac05a15486b932ac89afbf",
          "0xd23b1cb50c3935dc60ef37e2d271f0774ec32628a88ea01a38fe4f8e5a3d17d3",
          "0x0842d94fc2f26214e0a1b947c555b3a6aaccccd693ccd0b318701ab352a4f945",
          "0xd2d3a588cf66b5845d61bed8bcc1ea02e5262d3da644e74dc20c19d54f2672c0"
        ],
        "data": [
          {
            "name": "beneficiary",
            "type": "address",
            "value": "0x90f79bf6eb2c4f870365e785982e1f101e93b906"
          },
          {
            "name": "amount",
            "type": "uint256",
            "value": "1000"
          },
          {
            "name": "domain",
            "type": "uint32",
            "value": "9991"
          }
        ]
      }
    }
  }
}

describe("CrosschainTrancheVestingMerkle", function () {
  beforeAll(async () => {
    // kick off a transaction to update the block time
    let now = BigInt(await time.latest()) + 10000n;
    await time.increaseTo(now);

    [deployer, eligible1, eligible2, eligible3, ineligible] = await ethers.getSigners();
    ({ deployer: deployer.address, e1: eligible1.address, e2: eligible2.address, e3: eligible3.address })

    const GenericERC20Factory = await ethers.getContractFactory("GenericERC20", deployer);
    token = await GenericERC20Factory.deploy(
      "Neue Crypto Token",
      "NCT",
      18,
      // 1B tokens
      (10n ** 9n * 10n ** 18n).toString()
    ) as GenericERC20

    otherToken = await GenericERC20Factory.deploy(
      "Other Neue Crypto Token",
      "ONCT",
      18,
      // 1B tokens
      (10n ** 9n * 10n ** 18n).toString()
    ) as GenericERC20

    ConnextFactory = await ethers.getContractFactory("ConnextMock", deployer);
    connextMockSource = await ConnextFactory.deploy(
      SOURCE_DOMAIN
    );
    connextMockDestination = await ConnextFactory.deploy(
      DESTINATION_DOMAIN
    );

    // 50% of tokens should be vested
    tranches = [
      { time: now - 100n, vestedFraction: 1000n },
      { time: now - 1n, vestedFraction: 5000n },
      { time: now + 100n, vestedFraction: 10000n },
    ]

    DistributorFactory = await ethers.getContractFactory("CrosschainTrancheVestingMerkle", deployer);
    distributor = await DistributorFactory.deploy(
      token.address,
      connextMockSource.address,
      config.total,
      config.uri,
      config.votingFactor,
      tranches,
      config.proof.merkleRoot,
      0 // no queue delay
    );

    distributorWithQueue = await DistributorFactory.deploy(
      token.address,
      connextMockSource.address,
      config.total,
      config.uri,
      config.votingFactor,
      tranches,
      config.proof.merkleRoot,
      maxDelayTime // fair queue is enabled
    );

    SatelliteFactory = await ethers.getContractFactory("Satellite", deployer);
    satellite = await SatelliteFactory.deploy(
      connextMockDestination.address,
      distributor.address,
      1735353714, // source domain
      config.proof.merkleRoot
    )

    // transfer tokens to the distributors
    await token.transfer(distributor.address, await distributor.total())
    await token.transfer(distributorWithQueue.address, await distributorWithQueue.total())
  });

  it("Metadata is correct", async () => {
    expect(await distributor.NAME()).toEqual("CrosschainTrancheVestingMerkle")
    expect(await distributor.VERSION() >= BigNumber.from(1))
    expect(await distributor.uri()).toEqual(config.uri)
  })

  it("Initial distributor configuration is correct", async () => {
    // the distributor total must match (note the adjustment for rounding error)
    expect((await distributor.total()).toBigInt()).toEqual(config.total)
    // nothing has been claimed
    expect((await distributor.claimed()).toBigInt()).toEqual(0n)

    const distributorTranches = await distributor.getTranches()

    expect(distributorTranches.length).toEqual(tranches.length)

    for (let [i, tranche] of distributorTranches.entries()) {
      expect(tranche.time.toBigInt()).toEqual(tranches[i].time)
      expect(tranche.vestedFraction.toBigInt()).toEqual(tranches[i].vestedFraction)
    }

    // no claims have been initialized yet!
    for (let user of [eligible1, eligible2, eligible3, ineligible]) {
      const distributionRecord = await distributor.getDistributionRecord(user.address)
      // not initialized yet
      expect(distributionRecord.initialized).toEqual(false)
      // the total can be inferred from the sale
      expect(distributionRecord.total.toBigInt()).toEqual(0n)
      // nothing has been claimed yet
      expect(distributionRecord.claimed.toBigInt()).toEqual(0n)
      // TODO: allow voting prior to initialization
      // voting power must be zero prior to initialization
      expect((await distributor.getVotes(user.address)).toBigInt()).toEqual(0n);
      // does not yet hold tokens to claim
      expect((await token.balanceOf(user.address)).toBigInt()).toEqual(0n)
    }

    // fraction denominator is the expected value (10,000)
    expect((await distributor.getFractionDenominator()).toBigInt()).toEqual(10000n)

    // Connext allowance has been set on the distributor to allow cross-chain withdrawals
    expect((await token.allowance(distributor.address, connextMockSource.address)).toBigInt()).toEqual(config.total)
  })

  it("Admin can update total", async () => {
    const t1 = await distributor.total();

    expect(t1.toBigInt()).toEqual(config.total)

    // update the total
    await distributor.setTotal(config.total + 1n);

    const t2 = await distributor.total();
    expect(t2.toBigInt()).toEqual(config.total + 1n)

    // reset the total
    await distributor.setTotal(config.total);
    const t3 = await distributor.total();
    expect(t3.toBigInt()).toEqual(config.total)
  })

  it("Can claim via EOA signature", async () => {
    const user = eligible1
    const relayerFee = ethers.utils.parseEther('0.1')

    const [beneficiary, amount, domain] = config.proof.claims[`${user.address.toLowerCase()}_1735353714`].data.map(d => d.value)
    const proof = config.proof.claims[`${user.address.toLowerCase()}_1735353714`].proof
    const recipientDomain = domain === DESTINATION_DOMAIN.toString() ? SOURCE_DOMAIN : DESTINATION_DOMAIN;

    const txData = [
      { name: "recipient", type: "address", value: user.address },
      { name: "recipientDomain", type: "uint32", value: recipientDomain },
      { name: "beneficiary", type: "address", value: user.address },
      { name: "beneficiaryDomain", type: "uint32", value: domain },
      { name: "amount", type: "uint256", value: amount }
    ]

    const hash = ethers.utils.arrayify(ethers.utils.solidityKeccak256(txData.map(t => t.type), txData.map(t => t.value)))
    const signature = await user.signMessage(hash)

    // check that user can't claim with invalid signature
    const badSignature = await user.signMessage('bad hash')
    await expect(distributor.connect(user).claimBySignature(
      user.address,
      domain,
      user.address,
      domain,
      amount,
      badSignature,
      proof
    )).rejects.toMatchObject({ message: expect.stringMatching(/!recovered/) })

    // get initial balances
    const getBalances = async () => {
      return {
        user: (await token.balanceOf(user.address)).toBigInt(),
        distributor: (await token.balanceOf(distributor.address)).toBigInt(),
        connext: (await token.balanceOf(connextMockSource.address)).toBigInt()
      }
    }
    const initialBalances = await getBalances();

    // check that user can't claim with invalid proof
    const badProof = [
      "0xc7da9af04efd13b603589588a13c9e63474c4d79452a944db4e9c7d2d2c7db1e"
    ]
    await expect(distributor.connect(user).claimBySignature(
      user.address,
      recipientDomain,
      user.address,
      domain,
      amount,
      signature,
      badProof
    )).rejects.toMatchObject({ message: expect.stringMatching(/invalid proof/) })

    // verify no asset transfers
    let balances = await getBalances();
    expect(balances.user).toEqual(initialBalances.user)
    expect(balances.distributor).toEqual(initialBalances.distributor)
    expect(balances.connext).toEqual(initialBalances.connext)

    const request = await distributor.connect(user).claimBySignature(
      user.address,
      recipientDomain,
      user.address,
      domain,
      amount,
      signature,
      proof,
      { value: relayerFee }
    );
    const receipt = await request.wait()

    // verify relayer fee event
    const RELAYER_FEE_EVENT_SIG = 'NativeRelayerFeeIncluded(address,uint256)'
    const feeEvent = receipt.events.find(e => e.topics[0] === connextMockSource.interface.getEventTopic(RELAYER_FEE_EVENT_SIG))
    const decodedFee = connextMockDestination.interface.decodeEventLog(RELAYER_FEE_EVENT_SIG, feeEvent.data, feeEvent.topics);
    expect(decodedFee.amount).toEqual(relayerFee);
    expect(decodedFee.caller).toEqual(distributor.address);

    // verify xcall event
    const XCALL_FEE_EVENT_SIG = 'XCalled(uint32,address,address,address,uint256,uint256,bytes)'
    const event = receipt.events.find(e => e.topics[0] === connextMockSource.interface.getEventTopic(XCALL_FEE_EVENT_SIG))
    const decoded = connextMockDestination.interface.decodeEventLog(XCALL_FEE_EVENT_SIG, event.data, event.topics);
    expect(decoded.destination.toString()).toEqual(recipientDomain.toString());
    expect(decoded.to).toEqual(user.address);
    expect(decoded.asset).toEqual(token.address);
    expect(decoded.delegate).toEqual(user.address);
    expect(decoded.amount.toBigInt()).toEqual(BigInt(amount) / 2n);
    expect(decoded.slippage.toString()).toEqual("0");
    expect(decoded.callData).toEqual("0x");

    // verify asset transfers (distributor -> connext)
    balances = await getBalances();
    expect(balances.user).toEqual(initialBalances.user)
    expect(balances.distributor).toEqual(initialBalances.distributor - BigInt(amount) / 2n)
    expect(balances.connext).toEqual(initialBalances.connext + BigInt(amount) / 2n)

    const distributionRecord = await distributor.getDistributionRecord(user.address)

    expect(distributionRecord.total.toBigInt()).toEqual(BigInt(amount))
    expect(distributionRecord.initialized).toEqual(true)
    expect(distributionRecord.claimed.toBigInt()).toEqual(BigInt(amount) / 2n)

    // check that user can't claim again
    await expect(distributor.connect(user).claimBySignature(
      user.address,
      recipientDomain,
      user.address,
      domain,
      amount,
      signature,
      proof
    )).rejects.toMatchObject({ message: expect.stringMatching(/no more tokens claimable right now/) })
  })

  it("Can claim via Merkle Proof", async () => {
    const user = eligible2

    const [beneficiary, amount, domain] = config.proof.claims[`${user.address.toLowerCase()}_1735353714`].data.map(d => d.value)
    const proof = config.proof.claims[`${user.address.toLowerCase()}_1735353714`].proof

    // check that user can't claim with invalid proof
    const badProof = [
      "0xc7da9af04efd13b603589588a13c9e63474c4d79452a944db4e9c7d2d2c7db1e"
    ]
    await expect(distributor.connect(user).claimByMerkleProof(
      user.address,
      amount,
      badProof
    )).rejects.toMatchObject({ message: expect.stringMatching(/invalid proof/) })

    await distributor.connect(user).claimByMerkleProof(
      user.address,
      amount,
      proof
    )

    const balance = await token.balanceOf(user.address)
    expect(balance.toBigInt()).toEqual(BigInt(amount) / 2n)

    const distributionRecord = await distributor.getDistributionRecord(user.address)

    expect(distributionRecord.total.toBigInt()).toEqual(BigInt(amount))
    expect(distributionRecord.initialized).toEqual(true)
    expect(distributionRecord.claimed.toBigInt()).toEqual(BigInt(amount) / 2n)
  })

  it("Ineligible user cannot claim", async () => {
    const user = ineligible

    const [beneficiary, amount, domain] = config.proof.claims[`${eligible3.address.toLowerCase()}_1735353714`].data.map(d => d.value)
    const proof = config.proof.claims[`${eligible3.address.toLowerCase()}_1735353714`].proof

    const txData = [
      { name: "recipient", type: "address", value: user.address },
      { name: "recipientDomain", type: "uint32", value: domain },
      { name: "beneficiary", type: "address", value: eligible3.address },
      { name: "beneficiaryDomain", type: "uint32", value: domain },
      { name: "amount", type: "uint256", value: amount }
    ]

    const hash = ethers.utils.arrayify(ethers.utils.solidityKeccak256(txData.map(t => t.type), txData.map(t => t.value)))
    const signature = await user.signMessage(hash)

    await expect(distributor.connect(user).claimBySignature(
      user.address,
      domain,
      eligible3.address,
      domain,
      amount,
      signature,
      proof
    )).rejects.toMatchObject({ message: expect.stringMatching(/!recovered/) })

    await expect(distributor.connect(user).claimByMerkleProof(
      user.address,
      amount,
      proof
    )).rejects.toMatchObject({ message: expect.stringMatching(/invalid proof/) })
  })

  it("Can claim via Connext calls", async () => {
    // user calls satellite on domain 2
    // satellite calls connext on domain 2
    // connext on domain 1735353714 calls distributor on domain 1735353714
    const user = eligible3

    const [beneficiary, amount, domain] = config.proof.claims[`${eligible3.address.toLowerCase()}_2`].data.map(d => d.value)
    const proof = config.proof.claims[`${user.address.toLowerCase()}_2`].proof

    const transactionData = await satellite.connect(user).initiateClaim(
      amount,
      proof
    )

    const transactionReceipt = await transactionData.wait()
    const iface = new ethers.utils.Interface(SatelliteDefinition.abi)
    const { logs } = transactionReceipt
    const transferId = iface.parseLog(logs[1]).args[0]

    await connextMockSource.connect(user).callXreceive(
      transferId,
      amount,
      otherToken.address,
      user.address,
      2,
      proof,
      distributor.address
    )

    const distributionRecord = await distributor.getDistributionRecord(user.address)

    expect(distributionRecord.initialized).toEqual(true)
    expect(distributionRecord.total.toBigInt()).toEqual(BigInt(amount))
    expect(distributionRecord.claimed.toBigInt()).toEqual(BigInt(amount) / 2n)
    // tokens were not claimed to this chain
    expect((await token.balanceOf(user.address)).toBigInt()).toEqual(0n)
  })

  /**
   * @dev Verify that users can be delayed when the queue is enabled
   * TODO: sometimes this test fails with errors like this: invalid address (argument="address", value="0x46627f4094a53e8fb6fd287c69aeea7a54bc751", code=INVALID_ARGUMENT, version=address/5.4.0)
   * Likely cause: ethereum addresses must be 40 characters, but that is 41! Why is the randomValue producing values outside the ETH address space?
   */
  it("Queue Delay works as expected", async () => {
    // Get the largest possible uint160 (this number is all "1"s when displayed in binary)
    const maxUint160 = 2n ** 160n - 1n;
    // get the current random value of the sale
    const randomValue = (await distributorWithQueue.randomValue()).toBigInt();
    // the random value should never be zero
    expect(randomValue).not.toBe(BigInt(0))

    // get the number the furthest distance from the random value by the xor metric (flip all bits in the number so the distance is maxUint160)
    const xorValue = BigInt(randomValue) ^ maxUint160;

    const closestAddress = `0x${randomValue.toString(16)}`;
    const furthestAddress = `0x${xorValue.toString(16)}`;

    // the random value taken as an address should have a delay of 0 for both distributors
    expect((await distributorWithQueue.getFairDelayTime(closestAddress)).toBigInt()).toEqual(0n);
    expect((await distributor.getFairDelayTime(closestAddress)).toBigInt()).toEqual(0n);

    // the furthest address should have the largest delay for the distributor with the queue
    // the delay for the xor of the random value converted to an address must be the maximum queue time
    expect((await distributorWithQueue.getFairDelayTime(furthestAddress)).toBigInt()).toEqual(maxDelayTime);

    // the furthest address should not have any delay if the queue is not enabled
    expect((await distributor.getFairDelayTime(furthestAddress)).toBigInt()).toEqual(0n);

    // ensure the delay is drawn from [0, maxQeuueTime] for real users and correctly gates each user
    const users = [eligible1, eligible2];

    for (let user of users) {
      const delay = (await distributorWithQueue.getFairDelayTime(user.address)).toBigInt();
      expect(delay).toBeGreaterThanOrEqual(0n);
      expect(delay).toBeLessThanOrEqual(maxDelayTime);

      // set the tranches of the distributor so that the user should be able to claim 100% of tokens 2 seconds in the future
      const now = BigInt(await time.latest());

      await time.increase(delay);

      await distributorWithQueue.setTranches([
        { time: now + 2n, vestedFraction: 10000n },
      ])

      const [, amount,] = config.proof.claims[`${user.address.toLowerCase()}_1735353714`].data.map(d => d.value)
      const proof = config.proof.claims[`${user.address.toLowerCase()}_1735353714`].proof

      // verify the user cannot yet claim
      await expect(distributorWithQueue.claimByMerkleProof(
        user.address,
        amount,
        proof
      )).rejects.toMatchObject({ message: expect.stringMatching(/Distributor: no more tokens claimable right now/) })     
      
      const distributionRecord = await distributorWithQueue.getDistributionRecord(user.address)
      
      // wait for three seconds
      await time.increase(3);
      
      // verify the user can now claim all tokens
      await distributorWithQueue.connect(user).claimByMerkleProof(
        user.address,
        amount,
        proof
      )
    }
  });

  // See sherlock-41 https://github.com/sherlock-audit/2023-06-tokensoft-judging/issues/41
  it("Cannot increase voting power by re-initializing distribution record", async () => {
    const [, amount, domain] = config.proof.claims[`${eligible1.address.toLowerCase()}_2`].data.map(d => d.value)
    const proof = config.proof.claims[`${eligible1.address.toLowerCase()}_2`].proof

    // get current voting power
    await distributor.connect(eligible1).delegate(eligible1.address);
    const votingPower1 = (await distributor.getVotes(eligible1.address)).toBigInt();

    expect(votingPower1).toEqual(config.votingFactor/10000n * BigInt(amount) / 2n);

    await distributor.initializeDistributionRecord(
      domain,
      eligible1.address,
      amount,
      proof
    )

    const votingPower2 = (await distributor.getVotes(eligible1.address)).toBigInt();
    expect(votingPower2).toEqual(votingPower1);
  })
})
