import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { FakeSequencerUptimeFeed, FakeChainlinkOracle, IOracleOrL2OracleWithSequencerCheck } from "../typechain-types";
import { lastBlockTime } from "./lib";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";

jest.setTimeout(30000);

let fakeSequencerUptimeFeed: FakeSequencerUptimeFeed;
let fakeChainlinkOracle: FakeChainlinkOracle;
let l2OracleWithSequencerCheck: IOracleOrL2OracleWithSequencerCheck;
let deployer: SignerWithAddress;
let sequencerStatus = 0; // up
let ethUsdPrice = 167200000000; // 1672 USD

// Added .toString() to the expect's to avoid BigInt serialization issues.
describe("L2OracleWithSequencerCheck", () => {
  beforeAll(async () => {
    [deployer] = await ethers.getSigners();
    const FakeSequencerUptimeFeedFactory = await ethers.getContractFactory("FakeSequencerUptimeFeed", deployer);
    fakeSequencerUptimeFeed = await FakeSequencerUptimeFeedFactory.deploy(
      sequencerStatus,
      "L2 Sequencer Uptime Status Feed",
    );

    const FakeChainlinkOracleFactory = await ethers.getContractFactory("FakeChainlinkOracle", deployer);
    fakeChainlinkOracle = await FakeChainlinkOracleFactory.deploy(ethUsdPrice, "ETH/USD Price Feed");

    const L2OracleWithSequencerCheckFactory = await ethers.getContractFactory("L2OracleWithSequencerCheck", deployer);
    l2OracleWithSequencerCheck = await L2OracleWithSequencerCheckFactory.deploy(
      fakeChainlinkOracle.target,
      fakeSequencerUptimeFeed.target,
    );
  });

  it("Sequencer uptime feed should answer up", async () => {
    const [, answer] = await fakeSequencerUptimeFeed.latestRoundData();

    expect(answer.toString()).toEqual(sequencerStatus.toString());
  });

  it("Price feed should answer with correct price", async () => {
    const [, answer] = await fakeChainlinkOracle.latestRoundData();

    expect(answer.toString()).toEqual(ethUsdPrice.toString());
  });

  it("Oracle should answer with correct price", async () => {
    const [, answer] = await l2OracleWithSequencerCheck.latestRoundData();

    expect(answer.toString()).toEqual(ethUsdPrice.toString());
  });

  // TODO
  // it('Sequencer uptime feed should answer down', async () => {

  // })

  it("Oracle should not return answer while sequencer down", async () => {
    // take sequencer down
    await fakeSequencerUptimeFeed.setAnswer(1);

    const [, answer] = await fakeSequencerUptimeFeed.latestRoundData();

    expect(answer.toString()).toEqual("1");

    await expect(l2OracleWithSequencerCheck.latestRoundData()).rejects.toThrow(/SequencerDown/);

    // bring sequencer up
    await fakeSequencerUptimeFeed.setAnswer(0);
    const [, newAnswer, startedAt] = await fakeSequencerUptimeFeed.latestRoundData();
    expect(newAnswer.toString()).toEqual("0");
    expect(startedAt.toString()).toEqual((await lastBlockTime()).toString());

    await expect(l2OracleWithSequencerCheck.latestRoundData()).rejects.toThrow(/GracePeriodNotOver/);

    // wait for grace period to end
    await time.increase(4000);
    const [, oracleAnswer] = await l2OracleWithSequencerCheck.latestRoundData();
    expect(oracleAnswer.toString()).toEqual(ethUsdPrice.toString());
  });
});
