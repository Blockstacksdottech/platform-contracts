'use strict';

import ether from './helpers/ether'
import EVMRevert from './helpers/EVMRevert'

const {
    BN,
    time
} = require('@openzeppelin/test-helpers')

const utils = require("web3-utils")

const chai = require('chai')
chai.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()

const {
    TestHelper
} = require('@openzeppelin/cli');
const {
    Contracts,
} = require('@openzeppelin/upgrades');


const EthicHubLending = artifacts.require('EthicHubLending')
const EthicHubDepositManager = Contracts.getFromLocal('EthicHubDepositManager');
const MockStorage = artifacts.require('MockStorage')
const MockStableCoin = artifacts.require('MockStableCoin')
const MockTokenBridge = artifacts.require('MockTokenBridge')
const CHAIN_ID = "666"


contract('EthicHubDepositManager v2', function ([owner, investor, relayer, target]) {
    beforeEach(async function () {
        await time.advanceBlock()

        this.mockStorage = await MockStorage.new()
        this.stableCoin = await MockStableCoin.new(CHAIN_ID)
        this.tokenBridge = await MockTokenBridge.new();

        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "representative", owner), true)
        this.project = await TestHelper();
        this.depositManager = await this.project.createProxy(EthicHubDepositManager, {
            initMethod: 'initialize',
            initArgs: [
                this.mockStorage.address,
                this.stableCoin.address
            ]
        });
        let tx = await this.depositManager.methods.initializeToV2(this.tokenBridge.address)
        await this.depositManager.methods.setTrustedRelayer(
            relayer
        ).send(
            {
                from: owner
            }
        )
        let settedRelayer = await this.depositManager.methods.relayer().call()
        settedRelayer.should.be.equal(relayer)
    })
    
    it('only owner can set relayer', async function () {
        await this.depositManager.methods.setTrustedRelayer(
            relayer
        ).send(
            {
                from: investor
            }
        ).should.be.rejectedWith(EVMRevert)
    })
    
    it('send to bridge', async function () {
        await this.stableCoin.transfer(investor, ether(100000)).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), {
            from: investor
        }).should.be.fulfilled;

        const investment = ether(1)
        
        let tx = await this.depositManager.methods.sendToBridge(investor, investment.toString()).send({
            from: relayer
        })
        console.log(tx)
        let bridgeBalance = await this.stableCoin.balanceOf(this.tokenBridge.address).call()
        bridgeBalance.should.be.bignumber.equal(investment)

    })



    
})