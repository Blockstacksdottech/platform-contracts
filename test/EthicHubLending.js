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

const Uninitialized = 0;
const AcceptingContributions = 1;
const AwaitingReturn = 3;
const ProjectNotFunded = 4;
const ContributionReturned = 5;
const Default = 6;
const LatestVersion = 8;

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

contract('EthicHubLending', function ([owner, borrower, investor, investor2, investor3, investor4, localNode, ethicHubTeam, community, arbiter]) {
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
        this.stableCoin = await MockStableCoin.new(CHAIN_ID)

        await this.mockStorage.setBool(utils.soliditySha3("user", "localNode", localNode), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "representative", borrower), true)

        this.depositManager = await EthicHubDepositManager.new()
        await this.depositManager.initialize(this.mockStorage.address, this.stableCoin.address)

        await this.stableCoin.transfer(owner, ether(100000)).should.be.fulfilled;
        await this.stableCoin.transfer(borrower, ether(100000)).should.be.fulfilled;
        await this.stableCoin.transfer(investor, ether(100000)).should.be.fulfilled;
        await this.stableCoin.transfer(investor2, ether(100000)).should.be.fulfilled;
        await this.stableCoin.transfer(investor3, ether(100000)).should.be.fulfilled;
        await this.stableCoin.transfer(investor4, ether(100000)).should.be.fulfilled;
        await this.stableCoin.transfer(ethicHubTeam, ether(100000)).should.be.fulfilled;
        await this.stableCoin.transfer(community, ether(100000)).should.be.fulfilled;
        await this.stableCoin.transfer(arbiter, ether(100000)).should.be.fulfilled;

        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: owner }).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: borrower }).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: investor }).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: investor2 }).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: investor3 }).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: investor4 }).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: ethicHubTeam }).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: community }).should.be.fulfilled;
        await this.stableCoin.approve(this.depositManager.address, ether(1000000000), { from: arbiter }).should.be.fulfilled

        this.lending = await EthicHubLending.new(
            this.fundingStartTime,
            this.fundingEndTime,
            this.lendingInterestRatePercentage,
            this.totalLendingAmount,
            this.lendingDays,
            this.ethichubFee,
            this.localNodeFee,
            borrower,
            localNode,
            ethicHubTeam,
            this.depositManager.address,
            this.mockStorage.address,
            this.stableCoin.address
        )

        await this.mockStorage.setAddress(utils.soliditySha3("contract.address", this.lending.address), this.lending.address)
        await this.mockStorage.setAddress(utils.soliditySha3("arbiter", this.lending.address), arbiter)

        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor3), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor4), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "community", community), true)
        await this.mockStorage.setBool(utils.soliditySha3("user", "arbiter", arbiter), true)

        await this.lending.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
    })

    describe('initializing', function () {
        it('should not allow to invest before initializing', async function () {
            var someLending = await EthicHubLending.new(
                this.fundingStartTime,
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                this.totalLendingAmount,
                this.lendingDays,
                this.ethichubFee,
                this.localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                this.depositManager.address,
                this.mockStorage.address,
                this.stableCoin.address
            )

            await increaseTimeTo(this.fundingStartTime - duration.days(0.5))

            var isRunning = await someLending.isContribPeriodRunning()
            var state = await someLending.state()

            // project not funded
            state.toNumber().should.be.equal(Uninitialized)
            isRunning.should.be.equal(false)
            await this.depositManager.contribute(
                someLending.address,
                investor,
                ether(1)
            ).should.be.rejectedWith(EVMRevert)
        })

        it('should not allow create projects with unregistered local nodes', async function () {
            await EthicHubLending.new(
                this.fundingStartTime,
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                this.totalLendingAmount,
                this.lendingDays,
                this.ethichubFee,
                this.localNodeFee,
                borrower,
                borrower,
                ethicHubTeam,
                this.depositManager.address,
                this.mockStorage.address,
                this.stableCoin.address
            ).should.be.rejectedWith(EVMRevert)
        })

        it('should not allow to invest with unregistered representatives', async function () {
            await EthicHubLending.new(
                this.fundingStartTime,
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                this.totalLendingAmount,
                this.lendingDays,
                this.ethichubFee,
                this.localNodeFee,
                localNode,
                localNode,
                ethicHubTeam,
                this.depositManager.address,
                this.mockStorage.address,
                this.stableCoin.address
            ).should.be.rejectedWith(EVMRevert)
        })

        it('should be in latest version', async function () {
            let version = await this.lending.version()
            let expectedVersion = new BN(LatestVersion)
            version.should.be.bignumber.equal(expectedVersion)
        })
    })

    describe('contributing', function () {
        it('should not allow to invest before contribution period', async function () {
            await increaseTimeTo(this.fundingStartTime - duration.days(0.5))
            var isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(false)
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(1),
                { from: investor }
            ).should.be.rejectedWith(EVMRevert)
        })

        it('should not allow to invest after contribution period', async function () {
            await increaseTimeTo(this.fundingEndTime + duration.days(1))
            var isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(false)
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(1),
                { from: investor }
            ).should.be.rejectedWith(EVMRevert)
        })

        it('should allow to check investor contribution amount', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(1),
                { from: investor }
            ).should.be.fulfilled
            const contributionAmount = await this.lending.checkInvestorContribution(investor)
            contributionAmount.should.be.bignumber.equal(ether(1))
        })

        it('should allow to invest in contribution period', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            var isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(true)
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(1),
                { from: investor }
            ).should.be.fulfilled
        })

        it('should not allow to invest with cap fulfilled', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(1),
                { from: investor }
            ).should.be.fulfilled
            var isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(true)
            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                ether(1),
                { from: investor2 }
            ).should.be.fulfilled
            isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(true)
            await this.depositManager.contribute(
                this.lending.address,
                investor3,
                ether(1),
                { from: investor3 }
            ).should.be.fulfilled
            isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(false)
            await this.depositManager.contribute(
                this.lending.address,
                investor4,
                ether(1),
                { from: investor4 }
            ).should.be.rejectedWith(EVMRevert)
        })

        it('should return extra value over cap to last investor', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(2),
                { from: investor }
            ).should.be.fulfilled
            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                ether(1.5),
                { from: investor2 }
            ).should.be.fulfilled
        })

        it('should allow to invest amount < 0.1 eth', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            var isRunning = await this.lending.isContribPeriodRunning()
            isRunning.should.be.equal(true)
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(0.01),
                { from: investor }
            ).should.be.fulfilled
            const contributionAmount = await this.lending.checkInvestorContribution(investor)
            contributionAmount.should.be.bignumber.equal(ether(0.01))
        })
    })


    describe('Days calculator', function () {
        it('should calculate correct days', async function () {
            const expectedDaysPassed = 55;
            const daysPassed = await this.lending.getDaysPassedBetweenDates(this.fundingStartTime, this.fundingStartTime + duration.days(expectedDaysPassed))
            daysPassed.should.be.bignumber.equal(new BN(expectedDaysPassed))
            const sameAsLendingDays = await this.lending.getDaysPassedBetweenDates(this.fundingStartTime, this.fundingStartTime + duration.days(this.lendingDays))
            this.lendingDays.should.be.bignumber.equal(sameAsLendingDays)
            const lessThanADay = await this.lending.getDaysPassedBetweenDates(this.fundingStartTime, this.fundingStartTime + duration.hours(23))
            new BN(0).should.be.bignumber.equal(lessThanADay)
        })

        it('should fail to operate for time travelers (sorry)', async function () {
            await this.lending.getDaysPassedBetweenDates(this.fundingStartTime, this.fundingStartTime - duration.days(2)).should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Partial returning of funds', function () {
        it('full payment of the loan in several transfers should be allowed', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                this.totalLendingAmount,
                { from: investor }
            ).should.be.fulfilled;
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                borrowerReturnAmount.div(new BN(2)),
                { from: borrower }
            ).should.be.fulfilled
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                borrowerReturnAmount.div(new BN(2)),
                { from: borrower }
            ).should.be.fulfilled
            const state = await this.lending.state()
            state.toNumber().should.be.equal(ContributionReturned)
        })

        it('partial payment of the loan should be still default', async function () {
            await increaseTimeTo(this.fundingEndTime - duration.minutes(1))

            await this.depositManager.contribute(
                this.lending.address,
                investor,
                this.totalLendingAmount,
                { from: investor }
            ).should.be.fulfilled
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(10)
            await increaseTimeTo(defaultTime)
            const trueBorrowerReturnAmount = await this.lending.borrowerReturnAmount() // actual returnAmount
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                trueBorrowerReturnAmount.div(new BN(2)),
                { from: borrower }
            ).should.be.fulfilled
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                trueBorrowerReturnAmount.div(new BN(5)),
                { from: borrower }
            ).should.be.fulfilled
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(this.delayMaxDays.toNumber() + 1)
            await increaseTimeTo(defaultTime)
            await this.lending.declareProjectDefault({
                from: owner
            }).should.be.fulfilled;
            var state = await this.lending.state()
            state.toNumber().should.be.equal(Default)
        })

        it('partial payment of the loan should allow to recover contributions', async function () {
            await increaseTimeTo(this.fundingEndTime - duration.minutes(1))

            var investorSendAmount = this.totalLendingAmount.mul(new BN(1)).div(new BN(3))
            var investor1GasGost = new BN(0)
            var tx = await this.depositManager.contribute(
                this.lending.address,
                investor,
                investorSendAmount,
                { from: investor }
            ).should.be.fulfilled;
            investor1GasGost = accumulateTxCost(tx, investor1GasGost)

            const investorAfterSendBalance = await this.stableCoin.balanceOf(investor)

            var investor2SendAmount = this.totalLendingAmount.mul(new BN(2)).div(new BN(3))
            var investor2GasGost = new BN(0)
            tx = await this.depositManager.contribute(
                this.lending.address,
                investor2,
                investor2SendAmount,
                { from: investor2 }
            ).should.be.fulfilled;
            const investor2AfterSendBalance = await this.stableCoin.balanceOf(investor2)
            investor2GasGost = accumulateTxCost(tx, investor2GasGost)

            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;

            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(10)
            await increaseTimeTo(defaultTime)
            const trueBorrowerReturnAmount = await this.lending.borrowerReturnAmount()
            const notFullAmount = trueBorrowerReturnAmount.div(new BN(4)).mul(new BN(3)) //0.75
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                notFullAmount,
                { from: borrower }
            ).should.be.fulfilled;

            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(this.delayMaxDays.toNumber() + 1)
            await increaseTimeTo(defaultTime)

            await this.lending.declareProjectDefault({
                from: owner
            }).should.be.fulfilled;
            var state = await this.lending.state()
            state.toNumber().should.be.equal(Default)

            tx = await this.lending.reclaimContributionDefault(investor, {
                from: investor
            }).should.be.fulfilled;
            investor1GasGost = accumulateTxCost(tx, investor1GasGost)
            const investorFinalBalance = await this.stableCoin.balanceOf(investor)
            var expected = investorAfterSendBalance.add(investorSendAmount.div(new BN(4)).mul(new BN(3))).sub(investor1GasGost)
            checkLostinTransactions(expected, investorFinalBalance)

            tx = await this.lending.reclaimContributionDefault(investor2, {
                from: investor2
            }).should.be.fulfilled;
            investor2GasGost = accumulateTxCost(tx, investor2GasGost)
            const investor2FinalBalance = await this.stableCoin.balanceOf(investor2)
            var expected2 = investor2AfterSendBalance.add(investor2SendAmount.div(new BN(4)).mul(new BN(3))).sub(investor2GasGost)
            checkLostinTransactions(expected2, investor2FinalBalance)

            var contractBalance = await this.stableCoin.balanceOf(this.lending.address)
            contractBalance.should.be.bignumber.equal(new BN(0))
        })

        it('partial payment of the loan should not allow to recover interest, local node and team fees', async function () {
            await increaseTimeTo(this.fundingEndTime - duration.minutes(1))

            var investorSendAmount = this.totalLendingAmount.mul(new BN(1)).div(new BN(3))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                investorSendAmount,
                { from: investor }
            ).should.be.fulfilled

            var investor2SendAmount = this.totalLendingAmount.mul(new BN(2)).div(new BN(3))
            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                investor2SendAmount,
                { from: investor2 }
            ).should.be.fulfilled

            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(10)
            await increaseTimeTo(defaultTime)

            const trueBorrowerReturnAmount = await this.lending.borrowerReturnAmount()
            const notFullAmount = trueBorrowerReturnAmount.div(new BN(4)).mul(new BN(3)) //0.75
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                notFullAmount,
                { from: borrower }
            ).should.be.fulfilled
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(this.delayMaxDays.toNumber() + 1)
            await increaseTimeTo(defaultTime)
            this.lending.declareProjectDefault({
                from: owner
            }).should.be.fulfilled;
            var state = await this.lending.state()
            state.toNumber().should.be.equal(Default)
            // Reclaims amounts
            await this.lending.reclaimContributionWithInterest(investor, {
                from: investor
            }).should.be.rejectedWith(EVMRevert)

            await this.lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.rejectedWith(EVMRevert)
            await this.lending.reclaimLocalNodeFee().should.be.rejectedWith(EVMRevert)
            await this.lending.reclaimEthicHubTeamFee().should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Retrieving contributions', function () {
        it('should allow to retrieve contributions after declaring project not funded', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(1),
                { from: investor }
            ).should.be.fulfilled
            var balance = await this.stableCoin.balanceOf(this.lending.address)
            balance.should.be.bignumber.equal(ether(1))

            await increaseTimeTo(this.fundingEndTime + duration.days(1))
            await this.lending.declareProjectNotFunded({
                from: owner
            })
            var state = await this.lending.state()
            // project not funded
            state.toNumber().should.be.equal(ProjectNotFunded)

            var balance = await this.stableCoin.balanceOf(this.lending.address)
            balance.should.be.bignumber.equal(ether(1))
            // can reclaim contribution from everyone
            balance = await this.stableCoin.balanceOf(investor)
            await this.lending.reclaimContribution(investor).should.be.fulfilled;
            // fail to reclaim from no investor
            await this.lending.reclaimContribution(investor2).should.be.rejectedWith(EVMRevert)
        })

        it('should not allow to retrieve contributions if not contributor paid', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(1),
                { from: investor }
            ).should.be.fulfilled
            var balance = await this.stableCoin.balanceOf(this.lending.address)
            balance.should.be.bignumber.equal(ether(1))

            await increaseTimeTo(this.fundingEndTime + duration.days(1))
            await this.lending.declareProjectNotFunded({
                from: owner
            })
            var state = await this.lending.state()
            // project not funded
            state.toNumber().should.be.equal(ProjectNotFunded)
            await this.lending.reclaimContribution(investor3).should.be.rejectedWith(EVMRevert)
        })

        it('should not allow to retrieve contributions before declaring project not funded', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(1),
                { from: investor }
            ).should.be.fulfilled

            var balance = await this.stableCoin.balanceOf(this.lending.address)
            balance.should.be.bignumber.equal(ether(1))

            await increaseTimeTo(this.fundingEndTime + duration.days(1))
            // can reclaim contribution from everyone
            balance = await this.stableCoin.balanceOf(investor)
            await this.lending.reclaimContribution(investor).should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Exchange period', function () {
        it('should not go to exchange state after cap reached', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                this.totalLendingAmount,
                { from: investor }
            ).should.be.fulfilled;

            var capReached = await this.lending.capReached()
            capReached.should.be.equal(true)

            var state = await this.lending.state()
            state.toNumber().should.be.equal(AcceptingContributions)
        })

        it('should fail to change state to AwaitingReturn before exchanged', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(1),
                { from: investor }
            ).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Borrower return', function () {

        it('returning in same date should amount to totalLendingAmount plus fees', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                this.totalLendingAmount,
                { from: investor }
            ).should.be.fulfilled;
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            const localNodeFeeForAmount = this.totalLendingAmount.mul(this.localNodeFee).div(new BN(100))
            const ethichubFeeForAmount = this.totalLendingAmount.mul(this.ethichubFee).div(new BN(100))
            const expectedAmount = this.totalLendingAmount.add(ethichubFeeForAmount).add(localNodeFeeForAmount)
            borrowerReturnAmount.should.be.bignumber.equal(expectedAmount)

            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                borrowerReturnAmount,
                { from: borrower }
            ).should.be.fulfilled;

            const state = await this.lending.state()
            state.toNumber().should.be.equal(ContributionReturned)
        })

        it('returning in half total date without fees', async function () {
            let lendingAmount = ether(1)
            let lendingDays = new BN(183) //half year
            let noFeesLending = await EthicHubLending.new(
                this.fundingStartTime,
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                0,
                0,
                borrower,
                localNode,
                ethicHubTeam,
                this.depositManager.address,
                this.mockStorage.address,
                this.stableCoin.address
            ).should.be.fulfilled;

            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", noFeesLending.address), noFeesLending.address)

            await noFeesLending.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                noFeesLending.address,
                investor,
                lendingAmount,
                { from: investor }
            ).should.be.fulfilled;
            await noFeesLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await noFeesLending.finishInitialExchangingPeriod(100, {
                from: owner
            })
            increaseTimePastEndingTime(noFeesLending, lendingDays)
            await noFeesLending.setborrowerReturnStableCoinPerFiatRate(100, {
                from: owner
            })

            let lendingIncrement = await noFeesLending.lendingInterestRatePercentage()
            lendingIncrement.toNumber().should.be.above(10750)
            lendingIncrement.toNumber().should.be.below(10755)
        })

        it('returning in half total date with fees', async function () {
            let lendingAmount = ether(1)
            let lendingDays = 183 //half year
            let feesLending = await EthicHubLending.new(
                this.fundingStartTime,
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                new BN(4),
                new BN(3),
                borrower,
                localNode,
                ethicHubTeam,
                this.depositManager.address,
                this.mockStorage.address,
                this.stableCoin.address
            ).should.be.fulfilled;

            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", feesLending.address), feesLending.address)

            await feesLending.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                feesLending.address,
                investor,
                lendingAmount,
                { from: investor }
            ).should.be.fulfilled;
            await feesLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await feesLending.finishInitialExchangingPeriod(100, {
                from: owner
            })
            increaseTimePastEndingTime(feesLending, lendingDays)
            await feesLending.setborrowerReturnStableCoinPerFiatRate(100, {
                from: owner
            })

            let lendingIncrement = await feesLending.lendingInterestRatePercentage()
            lendingIncrement.should.be.bignumber.equal(new BN(11452))
        })


        it('should calculate correct return fiat amount based on return time', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                this.totalLendingAmount,
                { from: investor }
            ).should.be.fulfilled;
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(this.lending, this.lendingDays.toNumber())
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            var state = await this.lending.state()
            state.toNumber().should.be.equal(AwaitingReturn)
            const borrowerReturnStableCoinPerFiatRate = await this.lending.borrowerReturnStableCoinPerFiatRate()
            borrowerReturnStableCoinPerFiatRate.should.be.bignumber.equal(this.finalStableCoinPerFiatRate)
            const lendingFiatAmount = this.initialStableCoinPerFiatRate.mul(this.totalLendingAmount)

            var interest = parseInt((this.lendingInterestRatePercentage.toNumber() * 100) * (this.lendingDays.toNumber()) / (365)) + this.ethichubFee * 100 + this.localNodeFee.toNumber() * 100;
            var borrowerReturnFiatAmount = lendingFiatAmount.mul(new BN(interest + 10000)).div(new BN(10000))
            var borrowerReturnAmount = borrowerReturnFiatAmount.div(this.finalStableCoinPerFiatRate)
            var contractBorrowerReturnAmount = await this.lending.borrowerReturnAmount()
            contractBorrowerReturnAmount.should.be.bignumber.equal(borrowerReturnAmount)

            var defaultTime = this.lending.fundingEndTime() + duration.days(this.lendingDays.toNumber()) + duration.days(90)

            await increaseTimeTo(defaultTime)

            interest = parseInt((this.lendingInterestRatePercentage.toNumber() * 100) * (this.lendingDays.toNumber()) / (365)) + this.ethichubFee * 100 + this.localNodeFee.toNumber() * 100;
            borrowerReturnFiatAmount = lendingFiatAmount.mul(new BN(interest + 10000)).div(new BN(10000))
            borrowerReturnAmount = borrowerReturnFiatAmount.div(this.finalStableCoinPerFiatRate)
            contractBorrowerReturnAmount = await this.lending.borrowerReturnAmount()
            contractBorrowerReturnAmount.should.be.bignumber.equal(borrowerReturnAmount)
        })


        it('should not allow to stablish return in other state', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                this.totalLendingAmount,
                { from: investor }
            ).should.be.fulfilled;
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.rejectedWith(EVMRevert)
        })

        it('should allow the return of proper amount', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                this.totalLendingAmount,
                { from: investor }
            ).should.be.fulfilled;
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                borrowerReturnAmount,
                { from: borrower }
            ).should.be.fulfilled;
        })
    })

    describe('Default', async function () {
        it('should calculate correct time difference', async function () {
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber())
            for (var delayDays = 0; delayDays <= 10; delayDays++) {
                var resultDays = await this.lending.getDelayDays(defaultTime + duration.days(delayDays))
                resultDays.toNumber().should.be.equal(delayDays)
            }
        })

        it('should count half a day as full day', async function () {
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber())
            var resultDays = await this.lending.getDelayDays(defaultTime + duration.days(1.5))
            resultDays.toNumber().should.be.equal(1)
        })

        it('should be 0 days if not yet ended', async function () {
            var defaultTime = this.fundingEndTime + duration.days(this.lendingDays.toNumber()) - duration.seconds(1)
            var resultDays = await this.lending.getDelayDays(defaultTime)
            resultDays.toNumber().should.be.equal(0)
        })

        it('should not allow to declare project as default before lending period ends', async function () {
            await increaseTimeTo(this.fundingEndTime - duration.minutes(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                this.totalLendingAmount,
                { from: investor }
            ).should.be.fulfilled;
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await increaseTimeTo(this.fundingEndTime + duration.days(this.lendingDays.toNumber()) + duration.days(this.delayMaxDays.toNumber()) - duration.days(1))
            await this.lending.declareProjectDefault().should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Retrieve contribution with interest', async function () {
        it('Should return investors contributions with interests', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            const investor2InitialBalance = await this.stableCoin.balanceOf(investor2)
            const investor3InitialBalance = await this.stableCoin.balanceOf(investor3)
            const investor4InitialBalance = await this.stableCoin.balanceOf(investor4)

            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            var state = await this.lending.state()
            state.toNumber().should.be.equal(AcceptingContributions)

            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;

            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                borrowerReturnAmount,
                { from: borrower }
            ).should.be.fulfilled;
            const investorInterest = await this.lending.investorInterest()
            await this.lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            })
            await this.lending.reclaimContributionWithInterest(investor3, {
                from: investor3
            })
            await this.lending.reclaimContributionWithInterest(investor4, {
                from: investor4
            })

            await this.lending.reclaimLocalNodeFee().should.be.fulfilled;
            await this.lending.reclaimEthicHubTeamFee().should.be.fulfilled;

            const balance = await this.stableCoin.balanceOf(this.lending.address)
            balance.toNumber().should.be.below(2)

            const investor2FinalBalance = await this.stableCoin.balanceOf(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, investment2, investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await this.stableCoin.balanceOf(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, investment3, investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            const investor4FinalBalance = await this.stableCoin.balanceOf(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, investment4, investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)
        })


        it('Should show same returns for investors different time after returned', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(this.lending, this.lendingDays.toNumber())
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                borrowerReturnAmount,
                { from: borrower }
            ).should.be.fulfilled;

            let firstCheck = await this.lending.checkInvestorReturns(investor2).should.be.fulfilled;
            increaseTimePastEndingTime(this.lending, this.lendingDays.toNumber() + 20)

            let secondCheck = await this.lending.checkInvestorReturns(investor2).should.be.fulfilled;
            firstCheck.should.be.bignumber.equal(secondCheck)
        })

        it('Should return investors with excess contribution', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(2)

            const investor2InitialBalance = await this.stableCoin.balanceOf(investor2)
            const investor3InitialBalance = await this.stableCoin.balanceOf(investor3)
            const investor4InitialBalance = await this.stableCoin.balanceOf(investor4)

            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            let investor4Contribution = await this.lending.checkInvestorContribution(investor4)
            investor4Contribution.should.be.bignumber.equal(ether(1.5))
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                borrowerReturnAmount,
                { from: borrower }
            ).should.be.fulfilled;
            const investorInterest = await this.lending.investorInterest()
            await this.lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            })
            await this.lending.reclaimContributionWithInterest(investor3, {
                from: investor3
            })
            await this.lending.reclaimContributionWithInterest(investor4, {
                from: investor4
            })

            await this.lending.reclaimLocalNodeFee().should.be.fulfilled;
            await this.lending.reclaimEthicHubTeamFee().should.be.fulfilled;

            const balance = await this.stableCoin.balanceOf(this.lending.address)
            balance.toNumber().should.be.below(2)

            const investor2FinalBalance = await this.stableCoin.balanceOf(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, investment2, investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await this.stableCoin.balanceOf(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, investment3, investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            const investor4FinalBalance = await this.stableCoin.balanceOf(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, investor4Contribution, investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)
        })

        it('Should not allow to send funds back if not borrower', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                borrowerReturnAmount,
                { from: investor2 }
            ).should.be.rejectedWith(EVMRevert)
        })

        it('Should not allow reclaim twice the funds', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(2)

            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                borrowerReturnAmount,
                { from: borrower }
            ).should.be.fulfilled;
            await this.lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.fulfilled;
            await this.lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.rejectedWith(EVMRevert)
        })

        it('Should not allow returns when contract have balance in other state', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            const investment2 = ether(1)
            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.lending.reclaimContributionWithInterest(investor2).should.be.rejectedWith(EVMRevert)
        })

        it('Should return correct platform fees', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(this.lending, this.lendingDays.toNumber())
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()

            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                borrowerReturnAmount,
                { from: borrower }
            ).should.be.fulfilled;

            await this.lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            })
            await this.lending.reclaimContributionWithInterest(investor3, {
                from: investor3
            })
            await this.lending.reclaimContributionWithInterest(investor4, {
                from: investor4
            })

            const localNodeBalance = await this.stableCoin.balanceOf(localNode)
            const teamBalance = await this.stableCoin.balanceOf(ethicHubTeam)

            await this.lending.reclaimLocalNodeFee().should.be.fulfilled;
            await this.lending.reclaimEthicHubTeamFee().should.be.fulfilled;

            const localNodeFinalBalance = await this.stableCoin.balanceOf(localNode)
            const expectedLocalNodeBalance = localNodeBalance.add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.localNodeFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            checkLostinTransactions(expectedLocalNodeBalance, localNodeFinalBalance)

            const teamFinalBalance = await this.stableCoin.balanceOf(ethicHubTeam)
            const expectedEthicHubTeamBalance = teamBalance.add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.ethichubFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))
            checkLostinTransactions(expectedEthicHubTeamBalance, teamFinalBalance)
        })

        it('Should return remainding platform fees if inexact', async function () {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                this.fundingStartTime,
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ethichubFee,
                this.localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                this.depositManager.address,
                this.mockStorage.address,
                this.stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)

            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";

            await this.depositManager.contribute(
                realAmountLending.address,
                investor,
                investment,
                { from: investor }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            await realAmountLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await realAmountLending.finishInitialExchangingPeriod("538701", {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(realAmountLending, this.lendingDays.toNumber())
            await realAmountLending.setborrowerReturnStableCoinPerFiatRate("242925", {
                from: owner
            }).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "8657779357692697862",
                { from: borrower }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "220056000000000",
                { from: borrower }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "188440380000000000",
                { from: borrower }
            ).should.be.fulfilled;

            await realAmountLending.reclaimContributionWithInterest(investor3, {
                from: investor3
            })
            await realAmountLending.reclaimContributionWithInterest(investor4, {
                from: investor4
            })
            await realAmountLending.reclaimContributionWithInterest(investor, {
                from: investor
            })
            await realAmountLending.reclaimContributionWithInterest(investor2, {
                from: investor2
            })

            const localNodeBalance = await this.stableCoin.balanceOf(localNode)
            const teamBalance = await this.stableCoin.balanceOf(ethicHubTeam)
            await realAmountLending.reclaimLocalNodeFee().should.be.fulfilled;
            await realAmountLending.reclaimEthicHubTeamFee().should.be.fulfilled;

            const localNodeFinalBalance = await this.stableCoin.balanceOf(localNode)
            const expectedLocalNodeBalance = localNodeBalance.add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.localNodeFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))

            checkLostinTransactions(expectedLocalNodeBalance, localNodeFinalBalance)

            const teamFinalBalance = await this.stableCoin.balanceOf(ethicHubTeam)
            const expectedEthicHubTeamBalance = teamBalance.add(this.totalLendingAmount.mul(this.initialStableCoinPerFiatRate).mul(this.ethichubFee).div(this.finalStableCoinPerFiatRate).div(new BN(100)))

            checkLostinTransactions(expectedEthicHubTeamBalance, teamFinalBalance)
        })

        it('should be interest 0% if the project is repaid on the same day', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            const investor2InitialBalance = await this.stableCoin.balanceOf(investor2)
            const investor3InitialBalance = await this.stableCoin.balanceOf(investor3)
            const investor4InitialBalance = await this.stableCoin.balanceOf(investor4)

            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()

            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                borrowerReturnAmount,
                { from: borrower }
            ).should.be.fulfilled;

            // Get the contribution 3 years later
            await increaseTimeTo(this.fundingStartTime + duration.days(109500))
            // borrowerReturnDays = 0 and interest = 10000
            const borrowerReturnDays = await this.lending.borrowerReturnDays()
            borrowerReturnDays.toNumber().should.be.equal(0)
            const investorInterest = await this.lending.investorInterest()
            investorInterest.toNumber().should.be.equal(10000)
            await this.lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            })
            await this.lending.reclaimContributionWithInterest(investor3, {
                from: investor3
            })
            await this.lending.reclaimContributionWithInterest(investor4, {
                from: investor4
            })

            await this.lending.reclaimLocalNodeFee().should.be.fulfilled;
            await this.lending.reclaimEthicHubTeamFee().should.be.fulfilled;

            const balance = await this.stableCoin.balanceOf(this.lending.address)
            balance.toNumber().should.be.below(2)

            const investor2FinalBalance = await this.stableCoin.balanceOf(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, investment2, investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await this.stableCoin.balanceOf(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, investment3, investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            const investor4FinalBalance = await this.stableCoin.balanceOf(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, investment4, investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)
        })

    })

    describe('Reclaim leftover eth', async function () {
        it('should send leftover dai to team if its correct state, all parties have reclaimed theirs', async function () {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                this.fundingStartTime,
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ethichubFee,
                this.localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                this.depositManager.address,
                this.mockStorage.address,
                this.stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";

            await this.depositManager.contribute(
                realAmountLending.address,
                investor,
                investment,
                { from: investor }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            await realAmountLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await realAmountLending.finishInitialExchangingPeriod("538701", {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(realAmountLending, this.lendingDays.toNumber())
            await realAmountLending.setborrowerReturnStableCoinPerFiatRate("242925", {
                from: owner
            }).should.be.fulfilled;

            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "8657779357692697862",
                { from: borrower }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "220056000000000",
                { from: borrower }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "188440380000000000",
                { from: borrower }
            ).should.be.fulfilled;

            await realAmountLending.reclaimContributionWithInterest(investor3, {
                from: investor3
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor4, {
                from: investor4
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor, {
                from: investor
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.fulfilled;
            await realAmountLending.reclaimLocalNodeFee().should.be.fulfilled;
            await realAmountLending.reclaimEthicHubTeamFee().should.be.fulfilled;
            const teamBalance = await this.stableCoin.balanceOf(ethicHubTeam)
            await realAmountLending.reclaimLeftover({
                from: arbiter
            }).should.be.fulfilled;

            const newBalance = await this.stableCoin.balanceOf(ethicHubTeam)
            newBalance.should.be.bignumber.above(teamBalance)
        })

        it('should fail to send leftover dai to team if its correct state, without all contributors reclaimed', async function () {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                this.fundingStartTime,
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ethichubFee,
                this.localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                this.depositManager.address,
                this.mockStorage.address,
                this.stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";

            await this.depositManager.contribute(
                realAmountLending.address,
                investor,
                investment,
                { from: investor }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            await realAmountLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await realAmountLending.finishInitialExchangingPeriod("538701", {
                from: owner
            }).should.be.fulfilled;

            increaseTimePastEndingTime(realAmountLending, this.lendingDays.toNumber())
            await realAmountLending.setborrowerReturnStableCoinPerFiatRate("242925", {
                from: owner
            }).should.be.fulfilled;

            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "8657779357692697862",
                { from: borrower }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "220056000000000",
                { from: borrower }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "188440380000000000",
                { from: borrower }
            ).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor3, {
                from: investor3
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor4, {
                from: investor4
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor, {
                from: investor
            }).should.be.fulfilled;
            await realAmountLending.reclaimLocalNodeFee().should.be.fulfilled;
            await realAmountLending.reclaimEthicHubTeamFee().should.be.fulfilled;
            await realAmountLending.reclaimLeftover({
                from: arbiter
            }).should.be.rejectedWith(EVMRevert)
        })
        it('should fail to send leftover dai to team if its correct state, without local node reclaimed', async function () {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                this.fundingStartTime,
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ethichubFee,
                this.localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                this.depositManager.address,
                this.mockStorage.address,
                this.stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";

            await this.depositManager.contribute(
                realAmountLending.address,
                investor,
                investment,
                { from: investor }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            await realAmountLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await realAmountLending.finishInitialExchangingPeriod("538701", {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(realAmountLending, this.lendingDays.toNumber())
            await realAmountLending.setborrowerReturnStableCoinPerFiatRate("242925", {
                from: owner
            }).should.be.fulfilled;

            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "8657779357692697862",
                { from: borrower }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "220056000000000",
                { from: borrower }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "188440380000000000",
                { from: borrower }
            ).should.be.fulfilled;

            await realAmountLending.reclaimContributionWithInterest(investor3, {
                from: investor3
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor4, {
                from: investor4
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor, {
                from: investor
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.fulfilled;
            await realAmountLending.reclaimEthicHubTeamFee().should.be.fulfilled;
            await realAmountLending.reclaimLeftover({
                from: arbiter
            }).should.be.rejectedWith(EVMRevert)

        })
        it('should fail to send leftover dai to team if its correct state, without team reclaimed', async function () {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                this.fundingStartTime,
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ethichubFee,
                this.localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                this.depositManager.address,
                this.mockStorage.address,
                this.stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";

            await this.depositManager.contribute(
                realAmountLending.address,
                investor,
                investment,
                { from: investor }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            await realAmountLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await realAmountLending.finishInitialExchangingPeriod("538701", {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(realAmountLending, this.lendingDays.toNumber())
            await realAmountLending.setborrowerReturnStableCoinPerFiatRate("242925", {
                from: owner
            }).should.be.fulfilled;

            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "8657779357692697862",
                { from: borrower }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "220056000000000",
                { from: borrower }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "188440380000000000",
                { from: borrower }
            ).should.be.fulfilled;

            await realAmountLending.reclaimContributionWithInterest(investor3, {
                from: investor3
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor4, {
                from: investor4
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor, {
                from: investor
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.fulfilled;
            await realAmountLending.reclaimLocalNodeFee().should.be.fulfilled;
            await realAmountLending.reclaimLeftover({
                from: arbiter
            }).should.be.rejectedWith(EVMRevert)
        })

        it('should fail to send leftover dai to team if its correct state if not arbiter', async function () {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                this.fundingStartTime,
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ethichubFee,
                this.localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                this.depositManager.address,
                this.mockStorage.address,
                this.stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";
            await this.depositManager.contribute(
                realAmountLending.address,
                investor,
                investment,
                { from: investor }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            await realAmountLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await realAmountLending.finishInitialExchangingPeriod("538701", {
                from: owner
            }).should.be.fulfilled;

            increaseTimePastEndingTime(realAmountLending, this.lendingDays.toNumber())
            await realAmountLending.setborrowerReturnStableCoinPerFiatRate("242925", {
                from: owner
            }).should.be.fulfilled;

            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "8657779357692697862",
                { from: borrower }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "220056000000000",
                { from: borrower }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                borrower,
                "188440380000000000",
                { from: borrower }
            ).should.be.fulfilled;

            await realAmountLending.reclaimContributionWithInterest(investor3, {
                from: investor3
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor4, {
                from: investor4
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor, {
                from: investor
            }).should.be.fulfilled;
            await realAmountLending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.fulfilled;

            await realAmountLending.reclaimLocalNodeFee().should.be.fulfilled;
            await realAmountLending.reclaimEthicHubTeamFee().should.be.fulfilled;
            await realAmountLending.reclaimLeftover({
                from: investor
            }).should.be.rejectedWith(EVMRevert)

        })

        it('should fail to send leftover dai to team if not correct state', async function () {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                this.fundingStartTime,
                this.fundingEndTime,
                this.lendingInterestRatePercentage,
                lendingAmount,
                this.lendingDays,
                this.ethichubFee,
                this.localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                this.depositManager.address,
                this.mockStorage.address,
                this.stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(this.delayMaxDays, this.members, community)
            await this.mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await this.mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            const investment = "1000000000000000000";
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";

            await this.depositManager.contribute(
                realAmountLending.address,
                investor,
                investment,
                { from: investor }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3,
                { from: investor3 }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4,
                { from: investor4 }
            ).should.be.fulfilled;

            await realAmountLending.reclaimLeftover({
                from: arbiter
            }).should.be.rejectedWith(EVMRevert)
        })
    })

    describe('Send partial return', async function () {

        it('Should allow to send partial return before the rate is set', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))

            await this.depositManager.contribute(
                this.lending.address,
                investor,
                this.totalLendingAmount,
                { from: investor }
            ).should.be.fulfilled;

            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;

            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
        })

        it('Should not allow to send more than collected return', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                this.totalLendingAmount,
                { from: investor }
            ).should.be.fulfilled;
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                this.totalLendingAmount.add(ether(1)),
                { from: borrower }
            ).should.be.rejectedWith(EVMRevert)
        })

        it('Should not allow to send partial return after the rate is set', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                this.totalLendingAmount,
                { from: investor }
            ).should.be.fulfilled;
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                this.totalLendingAmount.add(ether(1)),
                { from: borrower }
            ).should.be.rejectedWith(EVMRevert)
        })

        it('Should only allow borrower to send partial return', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                this.totalLendingAmount,
                { from: investor }
            ).should.be.fulfilled;
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                ether(1),
                { from: investor2 }
            ).should.be.rejectedWith(EVMRevert)
            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
        })

        it('Should allow to reclaim partial return from contributor', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))

            const investorInvestment = ether(1)
            const investor2Investment = ether(2)
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                investorInvestment,
                { from: investor }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                investor2Investment,
                { from: investor2 }
            ).should.be.fulfilled;
            await this.lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;

            await this.lending.finishInitialExchangingPeriod(this.initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            await this.lending.setborrowerReturnStableCoinPerFiatRate(this.finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            var investorInitialBalance = await this.stableCoin.balanceOf(investor)

            const borrowerReturnAmount = await this.lending.borrowerReturnAmount()

            await this.depositManager.contribute(
                this.lending.address,
                borrower,
                borrowerReturnAmount,
                { from: borrower }
            ).should.be.fulfilled;

            var investorInitialBalance = await this.stableCoin.balanceOf(investor)

            const investorInterest = await this.lending.investorInterest()

            await this.lending.reclaimContributionWithInterest(investor).should.be.fulfilled;
            await this.lending.reclaimContributionWithInterest(investor2).should.be.fulfilled;

            let reclaimStatus = await this.lending.getUserContributionReclaimStatus(investor)
            reclaimStatus.should.be.equal(true)
            reclaimStatus = await this.lending.getUserContributionReclaimStatus(investor2)
            reclaimStatus.should.be.equal(true)

            var investorFinalBalance = await this.stableCoin.balanceOf(investor)
            var expectedInvestorBalance = getExpectedInvestorBalance(investorInitialBalance, investorInvestment.sub(ether(1).div(new BN(3))), investorInterest, this)
            checkLostinTransactions(expectedInvestorBalance, investorFinalBalance)

            var investor2FinalBalance = await this.stableCoin.balanceOf(investor2)
            var expectedInvestor2Balance = getExpectedInvestorBalance(investorInitialBalance, investor2Investment.sub(ether(2).div(new BN(3))), investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)
        })
    })

    describe('Change borrower', async function () {

        it('Should allow to change borrower with registered arbiter', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.mockStorage.setBool(utils.soliditySha3("user", "representative", investor3), true)
            await this.lending.setBorrower(investor3, {
                from: arbiter
            }).should.be.fulfilled;
            let b = await this.lending.borrower()
            b.should.be.equal(investor3)
        })

        it('Should not allow to change borrower with unregistered arbiter', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.lending.setBorrower(investor3, {
                from: owner
            }).should.be.rejectedWith(EVMRevert)
        })

    })

    describe('Change investor', async function () {

        it('Should allow to change investor with registered arbiter', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(1),
                { from: investor }
            ).should.be.fulfilled;
            await this.lending.changeInvestorAddress(investor, investor2, {
                from: arbiter
            }).should.be.fulfilled;

            var contributionAmount = await this.lending.checkInvestorContribution(investor2)
            contributionAmount.should.be.bignumber.equal(ether(1))
            contributionAmount = await this.lending.checkInvestorContribution(investor)
            contributionAmount.should.be.bignumber.equal(new BN(0))

        })

        it('Should not allow to change investor to unregistered investor', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), false)
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(1),
                { from: investor }
            ).should.be.fulfilled;
            await this.lending.changeInvestorAddress(investor, investor2, {
                from: arbiter
            }).should.be.rejectedWith(EVMRevert)
        })

        it('Should not allow to change new investor who have already invested', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
            await this.depositManager.contribute(
                this.lending.address,
                investor,
                ether(1),
                { from: investor }
            ).should.be.fulfilled;
            await this.depositManager.contribute(
                this.lending.address,
                investor2,
                ether(1),
                { from: investor2 }
            ).should.be.fulfilled;
            await this.lending.changeInvestorAddress(investor, investor2, {
                from: arbiter
            }).should.be.rejectedWith(EVMRevert)
        })


        it('Should not allow to change borrower with unregistered arbiter', async function () {
            await increaseTimeTo(this.fundingStartTime + duration.days(1))
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await this.mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
            await this.lending.changeInvestorAddress(investor, investor2, {
                from: owner
            }).should.be.rejectedWith(EVMRevert)
        })
    })

    async function increaseTimePastEndingTime(lendingContract, increaseDays) {
        const fundingEnd = await lendingContract.fundingEndTime()
        const returnDate = fundingEnd.add(new BN(duration.days(increaseDays)))
        increaseTimeTo(returnDate)
    }


    function getExpectedInvestorBalance(initialAmount, contribution, interest, testEnv) {
        const contributionBN = new BN(contribution)
        const received = contributionBN.mul(new BN(testEnv.initialStableCoinPerFiatRate))
            .mul(interest)
            .div(testEnv.finalStableCoinPerFiatRate).div(new BN(10000))
        const initialAmountBN = new BN(initialAmount)
        return initialAmountBN.sub(new BN(contribution)).add(received)
    }

    function accumulateTxCost(tx, cost) {
        const bnCost = new BN(cost)
        return bnCost.add(new BN(tx.receipt.gasUsed).mul(new BN(web3.eth.gasPrice)))
    }

    function checkLostinTransactions(expected, actual) {
        const expectedBN = new BN(expected)
        const lost = expectedBN.sub(new BN(actual))
        // /* Should be below 0.02 eth */
        lost.should.be.bignumber.below('20000000000000000')
    }
})