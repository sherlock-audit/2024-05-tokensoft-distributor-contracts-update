import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import hre from 'hardhat'
import { FakeSequencerUptimeFeed, FakeChainlinkOracle, IOracleOrL2OracleWithSequencerCheck } from '../typechain-types'
import { lastBlockTime } from './lib'
import { time } from '@nomicfoundation/hardhat-network-helpers'

const ethers = (hre as any).ethers

jest.setTimeout(30000)

let fakeSequencerUptimeFeed: FakeSequencerUptimeFeed
let fakeChainlinkOracle: FakeChainlinkOracle
let l2OracleWithSequencerCheck: IOracleOrL2OracleWithSequencerCheck
let deployer: SignerWithAddress
let sequencerStatus = 0 // up
let ethUsdPrice = 167200000000 // 1672 USD

describe('L2OracleWithSequencerCheck', () => {
  beforeAll(async () => {
    ;[deployer] = await ethers.getSigners()
    const FakeSequencerUptimeFeedFactory = await ethers.getContractFactory('FakeSequencerUptimeFeed', deployer)
    fakeSequencerUptimeFeed = await FakeSequencerUptimeFeedFactory.deploy(
      sequencerStatus,
      'L2 Sequencer Uptime Status Feed',
    )

    const FakeChainlinkOracleFactory = await ethers.getContractFactory('FakeChainlinkOracle', deployer)
    fakeChainlinkOracle = await FakeChainlinkOracleFactory.deploy(ethUsdPrice, 'ETH/USD Price Feed')

    const L2OracleWithSequencerCheckFactory = await ethers.getContractFactory('L2OracleWithSequencerCheck', deployer)
    l2OracleWithSequencerCheck = await L2OracleWithSequencerCheckFactory.deploy(
      fakeChainlinkOracle.address,
      fakeSequencerUptimeFeed.address,
    )
  })

  it('Sequencer uptime feed should answer up', async () => {
    const [, answer] = await fakeSequencerUptimeFeed.latestRoundData()

    expect(answer).toEqual(BigNumber.from(sequencerStatus))
  })

  it('Price feed should answer with correct price', async () => {
    const [, answer] = await fakeChainlinkOracle.latestRoundData()

    expect(answer).toEqual(BigNumber.from(ethUsdPrice))
  })

  it('Oracle should answer with correct price', async () => {
    const [, answer] = await l2OracleWithSequencerCheck.latestRoundData()

    expect(answer).toEqual(BigNumber.from(ethUsdPrice))
  })

  it('Sequencer uptime feed should answer down', async () => {
    
  })

  it('Oracle should not return answer while sequencer down', async () => {
    // take sequencer down
    await fakeSequencerUptimeFeed.setAnswer(1)

    const [, answer] = await fakeSequencerUptimeFeed.latestRoundData()

    expect(answer).toEqual(BigNumber.from(1))
    
    await expect(l2OracleWithSequencerCheck.latestRoundData()).rejects.toMatchObject({
      errorName: expect.stringMatching(/sequencerdown/i)
    })

    // bring sequencer up
    await fakeSequencerUptimeFeed.setAnswer(0)
    const [, newAnswer, startedAt] = await fakeSequencerUptimeFeed.latestRoundData()
    expect(newAnswer).toEqual(BigNumber.from(0))
    expect(startedAt).toEqual(BigNumber.from(await lastBlockTime()))

    await (expect(l2OracleWithSequencerCheck.latestRoundData())).rejects.toMatchObject({
      errorName: expect.stringMatching(/graceperiodnotover/i)
    })

    // wait for grace period to end
    await time.increase(4000)
    const [, oracleAnswer] = await l2OracleWithSequencerCheck.latestRoundData()
    expect(oracleAnswer).toEqual(BigNumber.from(ethUsdPrice))
  })


})
