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

    it.skip('send to address', async function () {
        // NOTE: disabled general purpose sending
        await this.stableCoin.transfer(investor, ether(100000)).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), {
            from: investor
        }).should.be.fulfilled;
        let previousBalanceRelayer = await this.stableCoin.balanceOf(relayer)
        let previousBalanceInvestor = await this.stableCoin.balanceOf(investor)
        let previousBalanceTarget  = await this.stableCoin.balanceOf(target)
        console.log('Previous-----')
        console.log('Relayer:', relayer)
        console.log('prev balance Relayer', previousBalanceRelayer.toString())
        console.log('Investor:', investor)
        console.log('prev balance Investor', previousBalanceInvestor.toString())
        console.log('Target:', target)
        console.log('prev balance target', previousBalanceTarget.toString())
        const investment = ether(1)
        let intent = utils.soliditySha3('test')
        let tx = await this.depositManager.methods.send(investor, target, investment.toString(), intent,  "123").send({
            from: relayer
        })
        console.log(tx)

        console.log(investment.toString())
        console.log('depositing')
        
        console.log(tx.events.Sent)
        tx.events.Sent.returnValues.sender.should.be.equal(investor)
        tx.events.Sent.returnValues.receiver.should.equal(target)
        tx.events.Sent.returnValues.amount.should.equal(investment.toString())
        tx.events.Sent.returnValues.intent.should.equal(utils.soliditySha3('test'))
        tx.events.Sent.returnValues.destChainID.should.be.equal('123')

        console.log('-----results')
        let afterBalanceRelayer = await this.stableCoin.balanceOf(relayer)
        console.log('afterBalanceRelayer', afterBalanceRelayer.toString())
        let afterBalanceInvestor = await this.stableCoin.balanceOf(investor)
        console.log('afterBalanceInvestor', afterBalanceInvestor.toString())
        let afterBalanceTarget = await this.stableCoin.balanceOf(target)
        console.log('afterBalanceTarget', afterBalanceTarget.toString())
    
        afterBalanceInvestor.should.be.bignumber.equal(previousBalanceInvestor.sub(investment))
        afterBalanceRelayer.should.be.bignumber.equal(previousBalanceRelayer)
        afterBalanceTarget.should.be.bignumber.equal(previousBalanceTarget.add(investment))


    })

    it('should not send if not relayer', async function () {
        await this.stableCoin.transfer(investor, ether(100000)).should.be.fulfilled;
        const investment = ether(1)

        await this.depositManager.methods.send(investor, investment.toString(), "0x123",  "123").send({
            from: investor
        }).should.be.rejectedWith(EVMRevert)
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
        console.log(tx.events.allEvents)
        /*let sender = await this.tokenBridge.sender.call()
        sender.should.be.equal(investor)
        let receiver = await this.tokenBridge.receiver.call()
        receiver.should.be.equal(target)
        let amount = await this.tokenBridge.amount.call()
        amount.should.be.equal(investment.toString())*/

    })



    
})