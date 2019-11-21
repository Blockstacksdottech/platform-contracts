'use strict';

import ether from './helpers/ether'
import {
    advanceBlock
} from './helpers/advanceToBlock'
import {
    duration
} from './helpers/increaseTime'
import latestTime from './helpers/latestTime'
import {
    assertSentViaGSN
} from './helpers/assertSentViaGSN'

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
const DepositManager = artifacts.require('DepositManager')
const MockStorage = artifacts.require('MockStorage')
const MockStableCoin = artifacts.require('MockStableCoin')

const relayerHubAddress = "0xd216153c06e857cd7f72665e0af1d7d82172f494"

contract('DepositManager', function (owner) {
    beforeEach(async function () {
        await advanceBlock()

        const latestTimeValue = await latestTime()
        this.fundingStartTime = latestTimeValue + duration.days(1)
        this.fundingEndTime = this.fundingStartTime + duration.days(40)

        this.lendingInterestRatePercentage = new BN(15)
        this.totalLendingAmount = ether(3)

        this.ethichubFee = new BN(3)
        this.localNodeFee = new BN(4)

        // 400 pesos per eth
        this.initialStableCoinPerFiatRate = new BN(538520) // 400
        this.finalStableCoinPerFiatRate = new BN(269260) // 480
        this.lendingDays = new BN(90)
        this.delayMaxDays = new BN(90)
        this.members = new BN(20)

        this.mockStorage = await MockStorage.new()
        this.stableCoin = await MockStableCoin.new()

        await this.mockStorage.setBool(utils.soliditySha3("user", "localNode", owner), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "representative", owner), true)

        this.depositManager = await DepositManager.new({ from: owner })
        await this.depositManager.initialize(
            this.mockStorage.address,
            this.stableCoin.address,
            { from: owner }
        )
        await this.mockStorage.setAddress(utils.soliditySha3("depositManager.address", this.depositManager.address), this.depositManager.address)

        await this.depositManager.setRelayHubAddress(relayerHubAddress)

        await this.stableCoin.transfer(owner, ether(100000)).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: owner }).should.be.fulfilled;

        this.lending = await EthicHubLending.new(
            this.fundingStartTime,
            this.fundingEndTime,
            this.lendingInterestRatePercentage,
            this.totalLendingAmount,
            this.lendingDays,
            this.ethichubFee,
            this.localNodeFee,
            owner,
            owner,
            owner,
            this.mockStorage.address,
            this.stableCoin.address
        )

        await this.mockStorage.setAddress(utils.soliditySha3("contract.address", this.lending.address), this.lending.address)
        await this.mockStorage.setAddress(utils.soliditySha3("arbiter", this.lending.address), owner)

        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", owner), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", owner), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", owner), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", owner), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "community", owner), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "arbiter", owner), true)

        await this.lending.saveInitialParametersToStorage(this.delayMaxDays, this.members, owner)

        await fundRecipient(web3, { recipient: this.depositManager.address })
    })

    describe('general', function () {
        it('contribution should not consume gas', async function () {
            const beforeBalance = new BN(await web3.eth.getBalance(owner))
            const tx = await this.depositManager.contribute(
                this.lending.address,
                owner,
                ether(1),
                {
                    from: owner,
                    useGSN: true
                }
            )
            console.log(tx)
            console.log("tx")
            await assertSentViaGSN(web3, tx.transactionHash);

            const afterBalance = new BN(web3.eth.getBalance(owner))

            beforeBalance.should.be.bignumber.equal(afterBalance)
        })
    })
})