'use strict';

import ether from './helpers/ether'
import {
    advanceBlock
} from './helpers/advanceToBlock'
import {
    increaseTimeTo,
    duration
} from './helpers/increaseTime'
import latestTime from './helpers/latestTime'
import assertSentViaGSN from './helpers/assertSentViaGSN'
import EVMRevert from './helpers/EVMRevert'

const {
    BN
} = require('@openzeppelin/test-helpers')
const {
    fundRecipient,
} = require('@openzeppelin/gsn-helpers')
const utils = require("web3-utils")

const chai = require('chai')
chai.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()

const EthicHubLending = artifacts.require('EthicHubLending')
const EthicHubDepositManager = artifacts.require('EthicHubDepositManager')
const MockStorage = artifacts.require('MockStorage')
const MockStableCoin = artifacts.require('MockStableCoin')

const CHAIN_ID = "666"

contract('EthicHubDepositManager', function ([owner, investor]) {
    beforeEach(async function () {
        await advanceBlock()

        const latestTimeValue = await latestTime()
        this.fundingStartTime = latestTimeValue + duration.days(1)
        this.fundingEndTime = this.fundingStartTime + duration.days(40)

        this.mockStorage = await MockStorage.new()
        this.stableCoin = await MockStableCoin.new(CHAIN_ID)

        await this.mockStorage.setBool(utils.soliditySha3("user", "localNode", owner), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "representative", owner), true)

        this.depositManager = await EthicHubDepositManager.new({ from: owner })
        await this.depositManager.initialize(
            this.mockStorage.address,
            this.stableCoin.address,
            { from: owner }
        ).should.be.fulfilled
        await this.mockStorage.setAddress(utils.soliditySha3("depositManager.address", this.depositManager.address), this.depositManager.address)

        await this.stableCoin.transfer(owner, ether(100000)).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: owner }).should.be.fulfilled;

        await this.stableCoin.transfer(investor, ether(100000)).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: investor }).should.be.fulfilled;

        this.lending = await EthicHubLending.new(
            this.fundingStartTime,
            this.fundingEndTime,
            15,
            ether(3),
            90,
            3,
            4,
            owner,
            owner,
            owner,
            this.mockStorage.address,
            this.stableCoin.address
        )

        await this.mockStorage.setAddress(utils.soliditySha3("contract.address", this.lending.address), this.lending.address)
        await this.mockStorage.setAddress(utils.soliditySha3("arbiter", this.lending.address), owner)

        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "community", owner), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "arbiter", owner), true)

        await this.lending.saveInitialParametersToStorage(90, 20, owner)

        await fundRecipient(web3, { recipient: this.depositManager.address })
    })

    it('only owner can change relayer', async function () {
        await this.depositManager.setRelayHubAddress(investor, { from: investor }).should.be.rejectedWith(EVMRevert)
    })

    it('check can contribute using GSN', async function () {
        await increaseTimeTo(this.fundingStartTime + duration.days(1))
        const investment = ether(1)
        const result = await this.depositManager.contribute(
            this.lending.address,
            investor,
            investment,
            {
                from: investor,
                useGSN: true
            }
        )
        await assertSentViaGSN(web3, result.tx);
        const investorContribution = await this.lending.checkInvestorContribution(investor)
        investorContribution.should.be.bignumber.equal(investment)
    })

    it('check can contribute without using GSN', async function () {
        await increaseTimeTo(this.fundingStartTime + duration.days(1))
        const investment = ether(1)
        await this.depositManager.contribute(
            this.lending.address,
            investor,
            investment,
            {
                from: investor,
                useGSN: false
            }
        ).should.be.fulfilled
        const investorContribution = await this.lending.checkInvestorContribution(investor)
        investorContribution.should.be.bignumber.equal(investment)
    })
})