import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import hre from 'hardhat'
import { GenericERC20, TrancheVestingMerkle__factory, TrancheVestingMerkle, ERC20, GenericERC20__factory } from "../../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

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
let DistributorFactory: TrancheVestingMerkle__factory
let unvestedDistributor: TrancheVestingMerkle
let partiallyVestedDistributor: TrancheVestingMerkle
let fullyVestedDistributor: TrancheVestingMerkle


let unvestedTranches: Tranche[]
let partiallyVestedTranches: Tranche[]
let fullyVestedTranches: Tranche[]

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
  // 7500 tokens
  total: 7500000000000000000002n,
  // any string will work for these unit tests - the uri is not used on-chain
  uri: 'https://example.com',
  // 2x, denominated in fractionDenominator of 1e4 (basis points)
  votingFactor: 2n * 10n ** 4n,
  // created using yarn generate-merkle-root
  proof: {
    "merkleRoot": "0xf32ce147ef6c8e7a07fbe3ce1ae1aef2405a59b50db2a8ede14f4e75bfe7d949",
    "claims": {
      "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65": {
        "proof": [
          "0x2407fcb79b873fc44e17093017a9d2ecd688419972e57cf95e726c0cb2cc1911",
          "0xaaaad2f6e9b5bab2f21b412af6c8cd0747c84dbc38a5b6ac613d00132de8d366"
        ],
        "data": [
          {
            "name": "index",
            "type": "uint256",
            "value": '2'
          },
          {
            "name": "beneficiary",
            "type": "address",
            "value": "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65"
          },
          {
            "name": "amount",
            "type": "uint256",
            "value": "1"
          }
        ]
      },
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC": {
        "proof": [
          "0x524b4658f483b7a148d5c638908ef5156c0b69227bf010e9bbc94068c62e3438",
          "0xaaaad2f6e9b5bab2f21b412af6c8cd0747c84dbc38a5b6ac613d00132de8d366"
        ],
        "data": [
          {
            "name": "index",
            "type": "uint256",
            "value": '0'
          },
          {
            "name": "beneficiary",
            "type": "address",
            "value": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"
          },
          {
            "name": "amount",
            "type": "uint256",
            "value": "2500000000000000000000"
          }
        ]
      },
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8": {
        "proof": [
          "0xa4170e52dc35c1127b67e1c2f5466fce9673e61b44e077b7023f7c994d55c5dd"
        ],
        "data": [
          {
            "name": "index",
            "type": "uint256",
            "value": '1'
          },
          {
            "name": "beneficiary",
            "type": "address",
            "value": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
          },
          {
            "name": "amount",
            "type": "uint256",
            "value": "5000000000000000000000"
          }
        ]
      }
    }
  }
}

describe("TrancheVestingMerkle", function () {
  beforeAll(async () => {
    // kick off a transaction to update the block time
    let now = BigInt(await time.latest()) + 1n;
    await time.increaseTo(now);

    [deployer, eligible1, eligible2, ineligible, eligible3] = await ethers.getSigners();

    const GenericERC20Factory = await ethers.getContractFactory("GenericERC20", deployer);
    token = await GenericERC20Factory.deploy(
      "Neue Crypto Token",
      "NCT",
      18,
      // 1B tokens
      (10n ** 9n * 10n ** 18n).toString()
    ) as GenericERC20

    DistributorFactory = await ethers.getContractFactory("TrancheVestingMerkle", deployer);

    // get the last block time after a recent transaction to make sure it is recent

    unvestedTranches = [
      {time: now + 100n, vestedFraction: 1000n},
      {time: now + 200n, vestedFraction: 5000n},
      {time: now + 300n, vestedFraction: 10000n},
    ]

    partiallyVestedTranches = [
      {time: now - 100n, vestedFraction: 1000n},
      {time: now - 1n, vestedFraction: 5000n},
      {time: now + 100n, vestedFraction: 10000n},
    ]

    fullyVestedTranches = [
      {time: now - 100n, vestedFraction: 1000n},
      {time: now - 50n, vestedFraction: 5000n},
      {time: now - 10n, vestedFraction: 10000n},
    ]

    // deploy a distributor that has not started vesting (cliff in the future)
    unvestedDistributor = await DistributorFactory.deploy(
      token.target,
      config.total,
      config.uri,
      config.votingFactor,
      unvestedTranches,
      config.proof.merkleRoot,
      0
    );

    // deploy another distributor that is mid-vesting
    partiallyVestedDistributor = await DistributorFactory.deploy(
      token.target,
      config.total,
      config.uri,
      config.votingFactor,
      partiallyVestedTranches,
      config.proof.merkleRoot,
      0
    );

    fullyVestedDistributor = await DistributorFactory.deploy(
      token.target,
      config.total,
      config.uri,
      config.votingFactor,
      fullyVestedTranches,
      config.proof.merkleRoot,
      0
    );

    // transfer tokens to the distributors
    await token.transfer(partiallyVestedDistributor.target, await partiallyVestedDistributor.total())
    await token.transfer(unvestedDistributor.target, await unvestedDistributor.total())
    await token.transfer(fullyVestedDistributor.target, await fullyVestedDistributor.total())
  });

  it("Metadata is correct", async () => {
    const distributor = partiallyVestedDistributor;
    expect(await distributor.NAME()).toEqual("TrancheVestingMerkle")
    expect(await distributor.VERSION() >= 1)
    expect(await distributor.uri()).toEqual(config.uri)
  })

  it("Initial distributor configuration is correct", async () => {
    const distributorTranches = [unvestedTranches, partiallyVestedTranches, fullyVestedTranches]
  
    for (let [i, distributor] of [unvestedDistributor, partiallyVestedDistributor, fullyVestedDistributor].entries()) {
      // the distributor total must match (note the adjustment for rounding error)
      expect(await distributor.total()).toEqual(config.total)
      // nothing has been claimed
      expect(await distributor.claimed()).toEqual(0n)

      const tranches = await distributor.getTranches()

      expect(tranches.length).toEqual(distributorTranches[i].length)

      for (let [j, tranche] of tranches.entries()) {
        expect(tranche.time).toEqual(distributorTranches[i][j].time)
        expect(tranche.vestedFraction).toEqual(distributorTranches[i][j].vestedFraction)
      }

      // no claims have been initialized yet!
      for (let user of [eligible1, eligible2, ineligible]) {
        const distributionRecord = await distributor.getDistributionRecord(user.address)
        // not initialized yet
        expect(distributionRecord.initialized).toEqual(false)
        // the total can be inferred from the sale
        expect(distributionRecord.total).toEqual(0n)
        // nothing has been claimed yet
        expect(distributionRecord.claimed).toEqual(0n)
        // TODO: allow voting prior to initialization
        // voting power must be zero prior to initialization
        expect(await distributor.getVotes(user.address)).toEqual(0n);
        // does not yet hold tokens to claim
        expect(await token.balanceOf(user.address)).toEqual(0n)
      }

      // fraction denominator is the expected value (10,000)
      expect(await distributor.getFractionDenominator()).toEqual(10000n)
    }
  })

  it("A user can claim without initialization", async () => {
    const user = eligible1
    const distributor = partiallyVestedDistributor

    const [index, beneficiary, amount] = config.proof.claims[user.address].data.map(d => d.value)
    const proof = config.proof.claims[user.address].proof

    await distributor.claim(index, beneficiary, amount, proof)

    // 50% of tokens have already vested
    const claimable = BigInt(amount) / 2n;

    let distributionRecord = await distributor.getDistributionRecord(user.address)

    expect(distributionRecord.total).toEqual(BigInt(amount))
    expect(distributionRecord.initialized).toEqual(true)
    expect(distributionRecord.claimed).toEqual(claimable)

    // delegate to self
    expect(await distributor.getVotes(user.address)).toEqual(0n)
    const myDistributor = await ethers.getContractAt("TrancheVestingMerkle", distributor.target, user);
    await myDistributor.delegate(user.address)
    
    expect(await distributor.getVotes(user.address)).toEqual(2n * BigInt(distributionRecord.total - distributionRecord.claimed))
    expect(await token.balanceOf(user.address)).toEqual(claimable)

    // the distributor metrics are now updated
    expect(await distributor.claimed()).toEqual(distributionRecord.claimed)
  })

  it("A buyer can initialize before claiming", async () => {
    const user = eligible2
    const distributor = partiallyVestedDistributor
    const [index, beneficiary, amount] = config.proof.claims[user.address].data.map(d => d.value)
    const proof = config.proof.claims[user.address].proof

    // 50% of tokens have already vested
    const claimable = BigInt(amount) / 2n;
    
    await distributor.initializeDistributionRecord(index, beneficiary, amount, proof)

    let distributionRecord = await distributor.getDistributionRecord(user.address)

    expect(distributionRecord.total).toEqual(
      BigInt(config.proof.claims[user.address].data[2].value)
    )
    // no votes prior to delegation
    expect(await distributor.getVotes(user.address)).toEqual(0n)

    // delegate to self
    const myDistributor = await ethers.getContractAt("TrancheVestingMerkle", distributor.target, user);
    await myDistributor.delegate(user.address)

    expect(distributionRecord.total).toEqual(
      BigInt(config.proof.claims[user.address].data[2].value)
    )

    // now the user has votes
    expect(distributionRecord.initialized).toEqual(true)
    expect(distributionRecord.claimed).toEqual(0n)
    expect(await distributor.getVotes(user.address)).toEqual(2n * BigInt(amount))

    // the user has no balance
    expect(await token.balanceOf(user.address),).toEqual(0n)

    // the admin increases the voting factor
    await distributor.setVoteFactor(1230000n)

    // now we claim!
    await distributor.claim(index, beneficiary, amount, proof)

    // the voting factor has been updated by claiming (half of voting power remains at the 123x factor)
    expect(await distributor.getVotes(user.address)).toEqual(123n * BigInt(amount) / 2n)

    // the admin resets the voting factor
    await distributor.setVoteFactor(config.votingFactor)

    // the voting factor for this user can be fixed again
    await distributor.initializeDistributionRecord(index, beneficiary, amount, proof)
    expect(await distributor.getVotes(user.address)).toEqual(2n * BigInt(amount) / 2n)

    distributionRecord = await distributor.getDistributionRecord(user.address)

    expect(distributionRecord.total).toEqual(
      BigInt(amount)
    )
    expect(distributionRecord.initialized).toEqual(true)
    expect(distributionRecord.claimed).toEqual(claimable)
    // only unclaimed tokens provide voting power from the distributor
    expect(await distributor.getVotes(user.address)).toEqual(2n * BigInt(distributionRecord.total - distributionRecord.claimed))
    // the user now has a balance
    expect(await token.balanceOf(user.address)).toEqual(claimable)
  })

  it("non-participants in the sale cannot claim any tokens", async () => {
    const user = ineligible
    const distributor = partiallyVestedDistributor

    let distributionRecord = await distributor.getDistributionRecord(user.address)
    // nothing to distribute
    expect(distributionRecord.total).toEqual(0n)
    // nothing claimed
    expect(distributionRecord.claimed).toEqual(0n)
    // no votes
    expect(await distributor.getVotes(user.address)).toEqual(0n)
    // not initialized
    expect(distributionRecord.initialized).toEqual(false)
    // user holds no tokens
    expect(await token.balanceOf(user.address)).toEqual(0n)

    // The user cannot initialize because they are not in the merkle proof - using another addresses' values will not work
    await expect(
      distributor.initializeDistributionRecord(
        config.proof.claims[eligible1.address].data[0].value, // index
        user.address, // beneficiary
        config.proof.claims[eligible1.address].data[2].value, // amount
        config.proof.claims[eligible1.address].proof, // proof
      )
    ).rejects.toMatchObject({ message: expect.stringMatching(/invalid proof/) })

    // The user cannot claim because they are not in the merkle proof
    await expect(
      distributor.claim(
        config.proof.claims[eligible2.address].data[0].value, // index
        user.address, // beneficiary
        config.proof.claims[eligible2.address].data[2].value, // amount
        config.proof.claims[eligible2.address].proof, // proof
      )
    ).rejects.toMatchObject({ message: expect.stringMatching(/invalid proof/) })
  });

  it("users can claim all tokens when all tranches have vested", async () => {
    const distributor = fullyVestedDistributor

    for (let user of [eligible1, eligible2]) {
      const [index, beneficiary, amount] = config.proof.claims[user.address].data.map(d => d.value)
      const proof = config.proof.claims[user.address].proof

      // get the user's initial token balance
      const initialBalance = (await token.balanceOf(user.address));
      // claim from the fully vested distributor
      await distributor.claim(index, beneficiary, amount, proof)
      // get the distribution record
      const distributionRecord = await distributor.getDistributionRecord(user.address)
      // get the user's final token balance
      const finalBalance = (await token.balanceOf(user.address));
      // the total is correct
      expect(distributionRecord.total).toEqual(
        BigInt(amount)
      )
      // everything has been claimed
      expect(distributionRecord.claimed).toEqual(
        BigInt(amount)
      )
      // the user's balance has increased by the correct amount
      expect(finalBalance - initialBalance).toEqual(
        BigInt(amount)
      )
      // no votes remaining
      expect(await distributor.getVotes(user.address)).toEqual(0n)
    }
    // all tokens have been distributed from the fully vested distributor (within rounding error)
    expect((await token.balanceOf(distributor.target))).toBeLessThan(100)
  });

  it("users cannot claim any tokens before the cliff has expired", async () => {
    const distributor = unvestedDistributor

    const total = (await distributor.total())

    for (let user of [eligible1, eligible2]) {
      const [index, beneficiary, amount] = config.proof.claims[user.address].data.map(d => d.value)
      const proof = config.proof.claims[user.address].proof

      // get the user's initial token balance
      const initialBalance = (await token.balanceOf(user.address));
      // TODO: why does this fail sometimes (i.e. the tx should revert but does not)
      await expect(
        distributor.claim(index, beneficiary, amount, proof)
      ).rejects.toMatchObject(
        { message: expect.stringMatching(/no more tokens claimable right now/) }
      )
      // get the distribution record
      const distributionRecord = await distributor.getDistributionRecord(user.address)
      // get the user's final token balance
      const finalBalance = (await token.balanceOf(user.address));
      // the total is correct
      expect(distributionRecord.total).toEqual(
        0n, // distribution records have not yet been initalized
      )
      // nothing has been claimed
      expect(distributionRecord.claimed).toEqual(0n)
      // the user's token balance has not increased
      expect(finalBalance - initialBalance).toEqual(0n)
    }
    // no tokens have been distributed from the unvested distributor
    expect((await token.balanceOf(distributor.target))).toEqual(total)
  });

  it("reverts on misconfiguration during deployment", async () => {
    let now = await time.latest();

    // must vest all tokens
    await expect(DistributorFactory.deploy(
      token.target,
      config.total,
      config.uri,
      config.votingFactor,
      [
        {time: 1, vestedFraction: 1},
        {time: 2, vestedFraction: 9999}
      ],
      config.proof.merkleRoot,
      0
    )).rejects.toMatchObject(
      {message: expect.stringMatching(/last tranche must vest all tokens/)}
    )

    // tranche time must increase
    await expect(DistributorFactory.deploy(
      token.target,
      config.total,
      config.uri,
      config.votingFactor,
      [
        {time: 1, vestedFraction: 1},
        {time: 1, vestedFraction: 2},
        {time: 3, vestedFraction: 10000}
      ],
      config.proof.merkleRoot,
      0
    )).rejects.toMatchObject(
      {message: expect.stringMatching(/tranche time must increase/)}
    )

    // tranche vested fraction must increase
    await expect(DistributorFactory.deploy(
      token.target,
      config.total,
      config.uri,
      config.votingFactor,
      [
        {time: 1, vestedFraction: 1},
        {time: 2, vestedFraction: 1},
        {time: 3, vestedFraction: 10000}
      ],
      config.proof.merkleRoot,
      0
    )).rejects.toMatchObject(
      {message: expect.stringMatching(/tranche vested fraction must increase/)}
    )

    // total cannot be zero
    await expect(
      DistributorFactory.deploy(
        token.target,
        0n,
        config.uri,
        config.votingFactor,
        partiallyVestedTranches,
        config.proof.merkleRoot,
        0
      )
    ).rejects.toMatchObject(
      { message: expect.stringMatching(/Distributor: total is 0/) }
    )

    // cannot accidentally use tranches with times in milliseconds past the epoch
    await expect(DistributorFactory.deploy(
      token.target,
      config.total,
      config.uri,
      config.votingFactor,
      [
        // oops - time in milliseconds
        {time: new Date().getTime(), vestedFraction: 10000}
      ],
      config.proof.merkleRoot,
      0
    )).rejects.toMatchObject(
      {message: expect.stringMatching(/vesting ends after 4102444800/)}
    )
  })

  it("correctly sets tranches after deployment", async () => {
    const distributor = unvestedDistributor

    const checkSomeTranches = async (tranches: Tranche[]) => {
      for (let i = 0; i < 10; i++) {
        // check for more tranches than we expect
        if (i < newTranches.length) {
          const [time, vestedFraction] = await distributor.getTranche(i)
          expect(time).toEqual(tranches[i].time)
          expect(vestedFraction).toEqual(tranches[i].vestedFraction)
        } else {
          await expect(
            distributor.getTranche(i)
          ).rejects.toThrow(/reverted with panic code 0x32/)
        }
      }
    }

    // set vesting schedule to use a different number of tranches
    let newTranches = [
      {time: 1n, vestedFraction: 111n},
      {time: 2n, vestedFraction: 10000n},
    ]

    await distributor.setTranches(newTranches);

    await checkSomeTranches(newTranches);

    newTranches = [
      {time: 3n, vestedFraction: 1n},
      {time: 4n, vestedFraction: 22n},
      {time: 5n, vestedFraction: 333n},
      {time: 6n, vestedFraction: 4444n},
      {time: 7n, vestedFraction: 5555n},
      {time: 8n, vestedFraction: 10000n},
    ]

    await distributor.setTranches(newTranches)
    await checkSomeTranches(newTranches)
  });

  // users can still claim after the voting factor is updated
  // see Sherlock-56: 
  it("users can claim despite voting factor rounding", async () => {
    const distributor = fullyVestedDistributor;
    const user = eligible3;
    const [index, beneficiary, amount] = config.proof.claims[user.address].data.map(d => d.value)
    const proof = config.proof.claims[user.address].proof

    // set voting factor to 0.9x
    await distributor.setVoteFactor(9000n)

    await distributor.initializeDistributionRecord(index, beneficiary, amount, proof)
    await distributor.connect(user).delegate(user.address)

    // should have 0 votes due to rounding (0.9 * 1 => 0)
    expect(await distributor.getVotes(user.address)).toEqual(0n)

    // adjust quantity for this user (note - this is not secure for merkle-based distributors but still a good bug to catch)
    await distributor.adjust(user.address, 1n)

    // should have 1 vote (0.9 * 2 => 1)
    expect(await distributor.getVotes(user.address)).toEqual(1n)

    // can still claim
    await distributor.claim(index, beneficiary, amount, proof)

    // should have 0 votes remaining
    expect(await distributor.getVotes(user.address)).toEqual(0n)
  })
})
