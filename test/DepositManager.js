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
import EVMRevert from './helpers/EVMRevert'

const {
    BN
} = require('@openzeppelin/test-helpers')
const { 
    GSNProvider 
} = require("@openzeppelin/gsn-provider");
const {
    registerRelay,
    deployRelayHub,
    fundRecipient,
    balance,
    withdraw
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

let relayHubAddress = null

contract('DepositManager', (accounts) => {
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

        await this.mockStorage.setBool(utils.soliditySha3("user", "localNode", accounts[0]), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "representative", accounts[0]), true)

        this.depositManager = await DepositManager.new({ from: accounts[0] })

        await this.depositManager.initialize(
            this.mockStorage.address, 
            this.stableCoin.address, 
            { from: accounts[0] }
        )

        await this.mockStorage.setAddress(utils.soliditySha3("depositManager.address", this.depositManager.address), this.depositManager.address)

        await this.stableCoin.transfer(accounts[0], ether(100000)).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: accounts[0] }).should.be.fulfilled;

        this.lending = await EthicHubLending.new(
            this.fundingStartTime,
            this.fundingEndTime,
            this.lendingInterestRatePercentage,
            this.totalLendingAmount,
            this.lendingDays,
            this.ethichubFee,
            this.localNodeFee,
            accounts[0],
            accounts[0],
            accounts[0],
            this.mockStorage.address,
            this.stableCoin.address
        )

        await this.mockStorage.setAddress(utils.soliditySha3("contract.address", this.lending.address), this.lending.address)
        await this.mockStorage.setAddress(utils.soliditySha3("arbiter", this.lending.address), accounts[0])

        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", accounts[0]), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", accounts[0]), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", accounts[0]), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", accounts[0]), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "community", accounts[0]), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "arbiter", accounts[0]), true)

        await this.lending.saveInitialParametersToStorage(this.delayMaxDays, this.members, accounts[0])

        // GSN Initialization
        if (relayHubAddress == null) {
            relayHubAddress = await deployRelayHub(web3, {
                from: accounts[0]
            })
            
            await this.depositManager.setRelayHubAddress(relayHubAddress, { from: accounts[0] })

            // Register the recipient in the hub
            await fundRecipient(web3, { recipient: this.lending.address })
            const gsnProvider = new GSNProvider(web3.currentProvider.host)
            EthicHubLending.setProvider(gsnProvider);
        }
    })

    describe('initializing', function () {
        it('should not allow to invest before initializing', async function () {
        })
    })
})