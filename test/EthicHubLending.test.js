'use strict';
import ether from './helpers/ether'
const { accounts, contract, web3 } = require('@openzeppelin/test-environment');

const {
    BN,
    time
} = require('@openzeppelin/test-helpers')

const Uninitialized = 0;
const AcceptingContributions = 1;
const AwaitingReturn = 3;
const ProjectNotFunded = 4;
const ContributionReturned = 5;
const Default = 6;
const LatestVersion = 8;
const utils = require("web3-utils")
const EthicHubLending = contract.fromArtifact('EthicHubLending')
const EthicHubDepositManager = contract.fromArtifact('EthicHubDepositManager')
const MockStorage = contract.fromArtifact('MockStorage')
const MockStableCoin = contract.fromArtifact('MockStableCoin')

const CHAIN_ID = "666"


describe('EthicHubLending', function () {
    const [owner, borrower, investor, investor2, investor3, investor4, localNode, ethicHubTeam, community, arbiter] = accounts
    // dates
    let fundingStartTime
    let fundingEndTime
    let lendingDays
    let delayMaxDays
    let latestTimeValue
    // economic parameters
    let lendingInterestRatePercentage
    let totalLendingAmount
    // fees
    let ethichubFee
    let localNodeFee
    // exchange rates
    let initialStableCoinPerFiatRate
    let finalStableCoinPerFiatRate
    // members
    let members
    // contracts
    let mockStorage
    let stableCoin
    let depositManager
    let lending


    beforeEach(async function() {
        await time.advanceBlock()

        latestTimeValue = await time.latest()
        fundingStartTime = latestTimeValue + time.duration.days(1)
        fundingEndTime = fundingStartTime + time.duration.days(40)

        lendingInterestRatePercentage = new BN(15)
        totalLendingAmount = ether(3)

        ethichubFee = new BN(3)
        localNodeFee = new BN(4)

        // 400 pesos per eth
        initialStableCoinPerFiatRate = new BN(538520) // 400
        finalStableCoinPerFiatRate = new BN(269260) // 480
        lendingDays = new BN(90)
        delayMaxDays = new BN(90)
        members = new BN(20)

        mockStorage = await MockStorage.new()
        stableCoin = await MockStableCoin.new(CHAIN_ID)

        await mockStorage.setBool(utils.soliditySha3("user", "localNode", localNode), true)
        await mockStorage.setBool(utils.soliditySha3("user", "representative", borrower), true)

        depositManager = await EthicHubDepositManager.new()
        await depositManager.initialize(mockStorage.address, stableCoin.address)

        await stableCoin.transfer(owner, ether(100000)).should.be.fulfilled;
        await stableCoin.transfer(borrower, ether(100000)).should.be.fulfilled;
        await stableCoin.transfer(investor, ether(100000)).should.be.fulfilled;
        await stableCoin.transfer(investor2, ether(100000)).should.be.fulfilled;
        await stableCoin.transfer(investor3, ether(100000)).should.be.fulfilled;
        await stableCoin.transfer(investor4, ether(100000)).should.be.fulfilled;
        await stableCoin.transfer(ethicHubTeam, ether(100000)).should.be.fulfilled;
        await stableCoin.transfer(community, ether(100000)).should.be.fulfilled;
        await stableCoin.transfer(arbiter, ether(100000)).should.be.fulfilled;

        await stableCoin.approve(depositManager.address, ether(1000000000), {
            from: owner
        }).should.be.fulfilled;
        await stableCoin.approve(depositManager.address, ether(1000000000), {
            from: borrower
        }).should.be.fulfilled;
        await stableCoin.approve(depositManager.address, ether(1000000000), {
            from: investor
        }).should.be.fulfilled;
        await stableCoin.approve(depositManager.address, ether(1000000000), {
            from: investor2
        }).should.be.fulfilled;
        await stableCoin.approve(depositManager.address, ether(1000000000), {
            from: investor3
        }).should.be.fulfilled;
        await stableCoin.approve(depositManager.address, ether(1000000000), {
            from: investor4
        }).should.be.fulfilled;
        await stableCoin.approve(depositManager.address, ether(1000000000), {
            from: ethicHubTeam
        }).should.be.fulfilled;
        await stableCoin.approve(depositManager.address, ether(1000000000), {
            from: community
        }).should.be.fulfilled;
        await stableCoin.approve(depositManager.address, ether(1000000000), {
            from: arbiter
        }).should.be.fulfilled

        lending = await EthicHubLending.new(
            fundingStartTime,
            fundingEndTime,
            lendingInterestRatePercentage,
            totalLendingAmount,
            lendingDays,
            ethichubFee,
            localNodeFee,
            borrower,
            localNode,
            ethicHubTeam,
            depositManager.address,
            mockStorage.address,
            stableCoin.address
        )

        await mockStorage.setAddress(utils.soliditySha3("contract.address", lending.address), lending.address)
        await mockStorage.setAddress(utils.soliditySha3("arbiter", lending.address), arbiter)

        await mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
        await mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
        await mockStorage.setBool(utils.soliditySha3("user", "investor", investor3), true)
        await mockStorage.setBool(utils.soliditySha3("user", "investor", investor4), true)
        await mockStorage.setBool(utils.soliditySha3("user", "community", community), true)
        await mockStorage.setBool(utils.soliditySha3("user", "arbiter", arbiter), true)

        await lending.saveInitialParametersToStorage(delayMaxDays, members, community)
    })

    describe('initializing', function() {
        it.only('should not allow to invest before initializing', async function() {
            var someLending = await EthicHubLending.new(
                fundingStartTime,
                fundingEndTime,
                lendingInterestRatePercentage,
                totalLendingAmount,
                lendingDays,
                ethichubFee,
                localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                depositManager.address,
                mockStorage.address,
                stableCoin.address
            )

            await time.increaseTo(fundingStartTime - time.duration.days(0.5))

            var isRunning = await someLending.isContribPeriodRunning()
            var state = await someLending.state()

            // project not funded
            state.toNumber().should.be.equal(Uninitialized)
            isRunning.should.be.equal(false)
            await depositManager.contribute(
                someLending.address,
                investor,
                ether(1)
            ).should.be.rejectedWith('revert')
        })

        it('should not allow create projects with unregistered local nodes', async function() {
            await EthicHubLending.new(
                fundingStartTime,
                fundingEndTime,
                lendingInterestRatePercentage,
                totalLendingAmount,
                lendingDays,
                ethichubFee,
                localNodeFee,
                borrower,
                borrower,
                ethicHubTeam,
                depositManager.address,
                mockStorage.address,
                stableCoin.address
            ).should.be.rejectedWith('revert')
        })

        it('should not allow to invest with unregistered representatives', async function() {
            await EthicHubLending.new(
                fundingStartTime,
                fundingEndTime,
                lendingInterestRatePercentage,
                totalLendingAmount,
                lendingDays,
                ethichubFee,
                localNodeFee,
                localNode,
                localNode,
                ethicHubTeam,
                depositManager.address,
                mockStorage.address,
                stableCoin.address
            ).should.be.rejectedWith('revert')
        })

        it('should be in latest version', async function() {
            let version = await lending.version()
            let expectedVersion = new BN(LatestVersion)
            version.should.be.bignumber.equal(expectedVersion)
        })
    })

    describe('contributing', function() {
        it('should not allow to invest before contribution period', async function() {
            await time.increaseTo(fundingStartTime - time.duration.days(0.5))
            var isRunning = await lending.isContribPeriodRunning()
            isRunning.should.be.equal(false)
            await depositManager.contribute(
                lending.address,
                investor,
                ether(1), {
                    from: investor
                }
            ).should.be.rejectedWith('revert')
        })

        it('should not allow to invest after contribution period', async function() {
            await time.increaseTo(fundingEndTime + time.duration.days(1))
            var isRunning = await lending.isContribPeriodRunning()
            isRunning.should.be.equal(false)
            await depositManager.contribute(
                lending.address,
                investor,
                ether(1), {
                    from: investor
                }
            ).should.be.rejectedWith('revert')
        })

        it('should allow to check investor contribution amount', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                ether(1), {
                    from: investor
                }
            ).should.be.fulfilled
            const contributionAmount = await lending.checkInvestorContribution(investor)
            contributionAmount.should.be.bignumber.equal(ether(1))
        })

        it('should allow to invest in contribution period', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            var isRunning = await lending.isContribPeriodRunning()
            isRunning.should.be.equal(true)
            await depositManager.contribute(
                lending.address,
                investor,
                ether(1), {
                    from: investor
                }
            ).should.be.fulfilled
        })

        it('should not allow to invest with cap fulfilled', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                ether(1), {
                    from: investor
                }
            ).should.be.fulfilled
            var isRunning = await lending.isContribPeriodRunning()
            isRunning.should.be.equal(true)
            await depositManager.contribute(
                lending.address,
                investor2,
                ether(1), {
                    from: investor2
                }
            ).should.be.fulfilled
            isRunning = await lending.isContribPeriodRunning()
            isRunning.should.be.equal(true)
            await depositManager.contribute(
                lending.address,
                investor3,
                ether(1), {
                    from: investor3
                }
            ).should.be.fulfilled
            isRunning = await lending.isContribPeriodRunning()
            isRunning.should.be.equal(false)
            await depositManager.contribute(
                lending.address,
                investor4,
                ether(1), {
                    from: investor4
                }
            ).should.be.rejectedWith('revert')
        })

        it('should return extra value over cap to last investor', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                ether(2), {
                    from: investor
                }
            ).should.be.fulfilled
            await depositManager.contribute(
                lending.address,
                investor2,
                ether(1.5), {
                    from: investor2
                }
            ).should.be.fulfilled
        })

        it('should allow to invest amount < 0.1 eth', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            var isRunning = await lending.isContribPeriodRunning()
            isRunning.should.be.equal(true)
            await depositManager.contribute(
                lending.address,
                investor,
                ether(0.01), {
                    from: investor
                }
            ).should.be.fulfilled
            const contributionAmount = await lending.checkInvestorContribution(investor)
            contributionAmount.should.be.bignumber.equal(ether(0.01))
        })
    })


    describe('Days calculator', function() {
        it('should calculate correct days', async function() {
            const expectedDaysPassed = 55;
            const daysPassed = await lending.getDaysPassedBetweenDates(fundingStartTime, fundingStartTime + time.duration.days(expectedDaysPassed))
            daysPassed.should.be.bignumber.equal(new BN(expectedDaysPassed))
            const sameAsLendingDays = await lending.getDaysPassedBetweenDates(fundingStartTime, fundingStartTime + time.duration.days(lendingDays))
            lendingDays.should.be.bignumber.equal(sameAsLendingDays)
            const lessThanADay = await lending.getDaysPassedBetweenDates(fundingStartTime, fundingStartTime + time.duration.hours(23))
            new BN(0).should.be.bignumber.equal(lessThanADay)
        })

        it('should fail to operate for time travelers (sorry)', async function() {
            await lending.getDaysPassedBetweenDates(fundingStartTime, fundingStartTime - time.duration.days(2)).should.be.rejectedWith('revert')
        })
    })

    describe('Partial returning of funds', function() {
        it('full payment of the loan in several transfers should be allowed', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                totalLendingAmount, {
                    from: investor
                }
            ).should.be.fulfilled;
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await lending.borrowerReturnAmount()
            await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount.div(new BN(2)), {
                    from: borrower
                }
            ).should.be.fulfilled
            await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount.div(new BN(2)), {
                    from: borrower
                }
            ).should.be.fulfilled
            const state = await lending.state()
            state.toNumber().should.be.equal(ContributionReturned)
        })

        it('partial payment of the loan should be still default', async function() {
            await time.increaseTo(fundingEndTime - time.duration.minutes(1))

            await depositManager.contribute(
                lending.address,
                investor,
                totalLendingAmount, {
                    from: investor
                }
            ).should.be.fulfilled
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = fundingEndTime + time.duration.days(lendingDays.toNumber()) + time.duration.days(10)
            await time.increaseTo(defaultTime)
            const trueBorrowerReturnAmount = await lending.borrowerReturnAmount() // actual returnAmount
            await depositManager.contribute(
                lending.address,
                borrower,
                trueBorrowerReturnAmount.div(new BN(2)), {
                    from: borrower
                }
            ).should.be.fulfilled
            await depositManager.contribute(
                lending.address,
                borrower,
                trueBorrowerReturnAmount.div(new BN(5)), {
                    from: borrower
                }
            ).should.be.fulfilled
            var defaultTime = fundingEndTime + time.duration.days(lendingDays.toNumber()) + time.duration.days(delayMaxDays.toNumber() + 1)
            await time.increaseTo(defaultTime)
            await lending.declareProjectDefault({
                from: owner
            }).should.be.fulfilled;
            var state = await lending.state()
            state.toNumber().should.be.equal(Default)
        })

        it('partial payment of the loan should allow to recover contributions', async function() {
            await time.increaseTo(fundingEndTime - time.duration.minutes(1))

            var investorSendAmount = totalLendingAmount.mul(new BN(1)).div(new BN(3))
            var investor1GasGost = new BN(0)
            var tx = await depositManager.contribute(
                lending.address,
                investor,
                investorSendAmount, {
                    from: investor
                }
            ).should.be.fulfilled;
            investor1GasGost = accumulateTxCost(tx, investor1GasGost)

            const investorAfterSendBalance = await stableCoin.balanceOf(investor)

            var investor2SendAmount = totalLendingAmount.mul(new BN(2)).div(new BN(3))
            var investor2GasGost = new BN(0)
            tx = await depositManager.contribute(
                lending.address,
                investor2,
                investor2SendAmount, {
                    from: investor2
                }
            ).should.be.fulfilled;
            const investor2AfterSendBalance = await stableCoin.balanceOf(investor2)
            investor2GasGost = accumulateTxCost(tx, investor2GasGost)

            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;

            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await lending.setborrowerReturnStableCoinPerFiatRate(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = fundingEndTime + time.duration.days(lendingDays.toNumber()) + time.duration.days(10)
            await time.increaseTo(defaultTime)
            const trueBorrowerReturnAmount = await lending.borrowerReturnAmount()
            const notFullAmount = trueBorrowerReturnAmount.div(new BN(4)).mul(new BN(3)) //0.75
            await depositManager.contribute(
                lending.address,
                borrower,
                notFullAmount, {
                    from: borrower
                }
            ).should.be.fulfilled;

            var defaultTime = fundingEndTime + time.duration.days(lendingDays.toNumber()) + time.duration.days(delayMaxDays.toNumber() + 1)
            await time.increaseTo(defaultTime)

            await lending.declareProjectDefault({
                from: owner
            }).should.be.fulfilled;
            var state = await lending.state()
            state.toNumber().should.be.equal(Default)

            tx = await lending.reclaimContributionDefault(investor, {
                from: investor
            }).should.be.fulfilled;
            investor1GasGost = accumulateTxCost(tx, investor1GasGost)
            const investorFinalBalance = await stableCoin.balanceOf(investor)
            var expected = investorAfterSendBalance.add(investorSendAmount.div(new BN(4)).mul(new BN(3))).sub(investor1GasGost)
            checkLostinTransactions(expected, investorFinalBalance)

            tx = await lending.reclaimContributionDefault(investor2, {
                from: investor2
            }).should.be.fulfilled;
            investor2GasGost = accumulateTxCost(tx, investor2GasGost)
            const investor2FinalBalance = await stableCoin.balanceOf(investor2)
            var expected2 = investor2AfterSendBalance.add(investor2SendAmount.div(new BN(4)).mul(new BN(3))).sub(investor2GasGost)
            checkLostinTransactions(expected2, investor2FinalBalance)

            var contractBalance = await stableCoin.balanceOf(lending.address)
            contractBalance.should.be.bignumber.equal(new BN(0))
        })

        it('partial payment of the loan should not allow to recover interest, local node and team fees', async function() {
            await time.increaseTo(fundingEndTime - time.duration.minutes(1))

            var investorSendAmount = totalLendingAmount.mul(new BN(1)).div(new BN(3))
            await depositManager.contribute(
                lending.address,
                investor,
                investorSendAmount, {
                    from: investor
                }
            ).should.be.fulfilled

            var investor2SendAmount = totalLendingAmount.mul(new BN(2)).div(new BN(3))
            await depositManager.contribute(
                lending.address,
                investor2,
                investor2SendAmount, {
                    from: investor2
                }
            ).should.be.fulfilled

            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await lending.setborrowerReturnStableCoinPerFiatRate(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = fundingEndTime + time.duration.days(lendingDays.toNumber()) + time.duration.days(10)
            await time.increaseTo(defaultTime)

            const trueBorrowerReturnAmount = await lending.borrowerReturnAmount()
            const notFullAmount = trueBorrowerReturnAmount.div(new BN(4)).mul(new BN(3)) //0.75
            await depositManager.contribute(
                lending.address,
                borrower,
                notFullAmount, {
                    from: borrower
                }
            ).should.be.fulfilled
            var defaultTime = fundingEndTime + time.duration.days(lendingDays.toNumber()) + time.duration.days(delayMaxDays.toNumber() + 1)
            await time.increaseTo(defaultTime)
            lending.declareProjectDefault({
                from: owner
            }).should.be.fulfilled;
            var state = await lending.state()
            state.toNumber().should.be.equal(Default)
            // Reclaims amounts
            await lending.reclaimContributionWithInterest(investor, {
                from: investor
            }).should.be.rejectedWith('revert')

            await lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.rejectedWith('revert')
            await lending.reclaimLocalNodeFee().should.be.rejectedWith('revert')
            await lending.reclaimEthicHubTeamFee().should.be.rejectedWith('revert')
        })
    })

    describe('Retrieving contributions', function() {
        it('should allow to retrieve contributions after declaring project not funded', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                ether(1), {
                    from: investor
                }
            ).should.be.fulfilled
            var balance = await stableCoin.balanceOf(lending.address)
            balance.should.be.bignumber.equal(ether(1))

            await time.increaseTo(fundingEndTime + time.duration.days(1))
            await lending.declareProjectNotFunded({
                from: owner
            })
            var state = await lending.state()
            // project not funded
            state.toNumber().should.be.equal(ProjectNotFunded)

            var balance = await stableCoin.balanceOf(lending.address)
            balance.should.be.bignumber.equal(ether(1))
            // can reclaim contribution from everyone
            balance = await stableCoin.balanceOf(investor)
            await lending.reclaimContribution(investor).should.be.fulfilled;
            // fail to reclaim from no investor
            await lending.reclaimContribution(investor2).should.be.rejectedWith('revert')
        })

        it('should not allow to retrieve contributions if not contributor paid', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                ether(1), {
                    from: investor
                }
            ).should.be.fulfilled
            var balance = await stableCoin.balanceOf(lending.address)
            balance.should.be.bignumber.equal(ether(1))

            await time.increaseTo(fundingEndTime + time.duration.days(1))
            await lending.declareProjectNotFunded({
                from: owner
            })
            var state = await lending.state()
            // project not funded
            state.toNumber().should.be.equal(ProjectNotFunded)
            await lending.reclaimContribution(investor3).should.be.rejectedWith('revert')
        })

        it('should not allow to retrieve contributions before declaring project not funded', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                ether(1), {
                    from: investor
                }
            ).should.be.fulfilled

            var balance = await stableCoin.balanceOf(lending.address)
            balance.should.be.bignumber.equal(ether(1))

            await time.increaseTo(fundingEndTime + time.duration.days(1))
            // can reclaim contribution from everyone
            balance = await stableCoin.balanceOf(investor)
            await lending.reclaimContribution(investor).should.be.rejectedWith('revert')
        })
    })

    describe('Exchange period', function() {
        it('should not go to exchange state after cap reached', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                totalLendingAmount, {
                    from: investor
                }
            ).should.be.fulfilled;

            var capReached = await lending.capReached()
            capReached.should.be.equal(true)

            var state = await lending.state()
            state.toNumber().should.be.equal(AcceptingContributions)
        })

        it('should fail to change state to AwaitingReturn before exchanged', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                ether(1), {
                    from: investor
                }
            ).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.rejectedWith('revert')
        })
    })

    describe('Borrower return', function() {

        it('returning in same date should amount to totalLendingAmount plus fees', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                totalLendingAmount, {
                    from: investor
                }
            ).should.be.fulfilled;
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await lending.setborrowerReturnStableCoinPerFiatRate(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            const borrowerReturnAmount = await lending.borrowerReturnAmount()
            const localNodeFeeForAmount = totalLendingAmount.mul(localNodeFee).div(new BN(100))
            const ethichubFeeForAmount = totalLendingAmount.mul(ethichubFee).div(new BN(100))
            const expectedAmount = totalLendingAmount.add(ethichubFeeForAmount).add(localNodeFeeForAmount)
            borrowerReturnAmount.should.be.bignumber.equal(expectedAmount)

            await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount, {
                    from: borrower
                }
            ).should.be.fulfilled;

            const state = await lending.state()
            state.toNumber().should.be.equal(ContributionReturned)
        })

        it('returning in half total date without fees', async function() {
            let lendingAmount = ether(1)
            let lendingDays = new BN(183) //half year
            let noFeesLending = await EthicHubLending.new(
                fundingStartTime,
                fundingEndTime,
                lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                0,
                0,
                borrower,
                localNode,
                ethicHubTeam,
                depositManager.address,
                mockStorage.address,
                stableCoin.address
            ).should.be.fulfilled;

            await mockStorage.setAddress(utils.soliditySha3("contract.address", noFeesLending.address), noFeesLending.address)

            await noFeesLending.saveInitialParametersToStorage(delayMaxDays, members, community)
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                noFeesLending.address,
                investor,
                lendingAmount, {
                    from: investor
                }
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

        it('returning in half total date with fees', async function() {
            let lendingAmount = ether(1)
            let lendingDays = 183 //half year
            let feesLending = await EthicHubLending.new(
                fundingStartTime,
                fundingEndTime,
                lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                new BN(4),
                new BN(3),
                borrower,
                localNode,
                ethicHubTeam,
                depositManager.address,
                mockStorage.address,
                stableCoin.address
            ).should.be.fulfilled;

            await mockStorage.setAddress(utils.soliditySha3("contract.address", feesLending.address), feesLending.address)

            await feesLending.saveInitialParametersToStorage(delayMaxDays, members, community)
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                feesLending.address,
                investor,
                lendingAmount, {
                    from: investor
                }
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


        it('should calculate correct return fiat amount based on return time', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                totalLendingAmount, {
                    from: investor
                }
            ).should.be.fulfilled;
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(lending, lendingDays.toNumber())
            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            var state = await lending.state()
            state.toNumber().should.be.equal(AwaitingReturn)
            const borrowerReturnStableCoinPerFiatRate = await lending.borrowerReturnStableCoinPerFiatRate()
            borrowerReturnStableCoinPerFiatRate.should.be.bignumber.equal(finalStableCoinPerFiatRate)
            const lendingFiatAmount = initialStableCoinPerFiatRate.mul(totalLendingAmount)

            var interest = parseInt((lendingInterestRatePercentage.toNumber() * 100) * (lendingDays.toNumber()) / (365)) + ethichubFee * 100 + localNodeFee.toNumber() * 100;
            var borrowerReturnFiatAmount = lendingFiatAmount.mul(new BN(interest + 10000)).div(new BN(10000))
            var borrowerReturnAmount = borrowerReturnFiatAmount.div(finalStableCoinPerFiatRate)
            var contractBorrowerReturnAmount = await lending.borrowerReturnAmount()
            contractBorrowerReturnAmount.should.be.bignumber.equal(borrowerReturnAmount)

            var defaultTime = lending.fundingEndTime() + time.duration.days(lendingDays.toNumber()) + time.duration.days(90)

            await time.increaseTo(defaultTime)

            interest = parseInt((lendingInterestRatePercentage.toNumber() * 100) * (lendingDays.toNumber()) / (365)) + ethichubFee * 100 + localNodeFee.toNumber() * 100;
            borrowerReturnFiatAmount = lendingFiatAmount.mul(new BN(interest + 10000)).div(new BN(10000))
            borrowerReturnAmount = borrowerReturnFiatAmount.div(finalStableCoinPerFiatRate)
            contractBorrowerReturnAmount = await lending.borrowerReturnAmount()
            contractBorrowerReturnAmount.should.be.bignumber.equal(borrowerReturnAmount)
        })


        it('should not allow to stablish return in other state', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                totalLendingAmount, {
                    from: investor
                }
            ).should.be.fulfilled;
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.rejectedWith('revert')
        })

        it('should allow the return of proper amount', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                totalLendingAmount, {
                    from: investor
                }
            ).should.be.fulfilled;
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await lending.borrowerReturnAmount()
            await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount, {
                    from: borrower
                }
            ).should.be.fulfilled;
        })
    })

    describe('Default', async function() {
        it('should calculate correct time difference', async function() {
            var defaultTime = fundingEndTime + time.duration.days(lendingDays.toNumber())
            for (var delayDays = 0; delayDays <= 10; delayDays++) {
                var resultDays = await lending.getDelayDays(defaultTime + time.duration.days(delayDays))
                resultDays.toNumber().should.be.equal(delayDays)
            }
        })

        it('should count half a day as full day', async function() {
            var defaultTime = fundingEndTime + time.duration.days(lendingDays.toNumber())
            var resultDays = await lending.getDelayDays(defaultTime + time.duration.days(1.5))
            resultDays.toNumber().should.be.equal(1)
        })

        it('should be 0 days if not yet ended', async function() {
            var defaultTime = fundingEndTime + time.duration.days(lendingDays.toNumber()) - time.duration.seconds(1)
            var resultDays = await lending.getDelayDays(defaultTime)
            resultDays.toNumber().should.be.equal(0)
        })

        it('should not allow to declare project as default before lending period ends', async function() {
            await time.increaseTo(fundingEndTime - time.duration.minutes(1))
            await depositManager.contribute(
                lending.address,
                investor,
                totalLendingAmount, {
                    from: investor
                }
            ).should.be.fulfilled;
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await time.increaseTo(fundingEndTime + time.duration.days(lendingDays.toNumber()) + time.duration.days(delayMaxDays.toNumber()) - time.duration.days(1))
            await lending.declareProjectDefault().should.be.rejectedWith('revert')
        })
    })

    describe('Retrieve contribution with interest', async function() {
        it('Should return investors contributions with interests', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            const investor2InitialBalance = await stableCoin.balanceOf(investor2)
            const investor3InitialBalance = await stableCoin.balanceOf(investor3)
            const investor4InitialBalance = await stableCoin.balanceOf(investor4)

            await depositManager.contribute(
                lending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            var state = await lending.state()
            state.toNumber().should.be.equal(AcceptingContributions)

            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;

            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            const borrowerReturnAmount = await lending.borrowerReturnAmount()
            await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount, {
                    from: borrower
                }
            ).should.be.fulfilled;
            const investorInterest = await lending.investorInterest()
            await lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            })
            await lending.reclaimContributionWithInterest(investor3, {
                from: investor3
            })
            await lending.reclaimContributionWithInterest(investor4, {
                from: investor4
            })

            await lending.reclaimLocalNodeFee().should.be.fulfilled;
            await lending.reclaimEthicHubTeamFee().should.be.fulfilled;

            const balance = await stableCoin.balanceOf(lending.address)
            balance.toNumber().should.be.below(2)

            const investor2FinalBalance = await stableCoin.balanceOf(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, investment2, investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await stableCoin.balanceOf(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, investment3, investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            const investor4FinalBalance = await stableCoin.balanceOf(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, investment4, investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)
        })


        it('Should show same returns for investors different time after returned', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            await depositManager.contribute(
                lending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(lending, lendingDays.toNumber())
            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            const borrowerReturnAmount = await lending.borrowerReturnAmount()
            await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount, {
                    from: borrower
                }
            ).should.be.fulfilled;

            let firstCheck = await lending.checkInvestorReturns(investor2).should.be.fulfilled;
            increaseTimePastEndingTime(lending, lendingDays.toNumber() + 20)

            let secondCheck = await lending.checkInvestorReturns(investor2).should.be.fulfilled;
            firstCheck.should.be.bignumber.equal(secondCheck)
        })

        it('Should return investors with excess contribution', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(2)

            const investor2InitialBalance = await stableCoin.balanceOf(investor2)
            const investor3InitialBalance = await stableCoin.balanceOf(investor3)
            const investor4InitialBalance = await stableCoin.balanceOf(investor4)

            await depositManager.contribute(
                lending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            let investor4Contribution = await lending.checkInvestorContribution(investor4)
            investor4Contribution.should.be.bignumber.equal(ether(1.5))
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await lending.borrowerReturnAmount()
            await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount, {
                    from: borrower
                }
            ).should.be.fulfilled;
            const investorInterest = await lending.investorInterest()
            await lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            })
            await lending.reclaimContributionWithInterest(investor3, {
                from: investor3
            })
            await lending.reclaimContributionWithInterest(investor4, {
                from: investor4
            })

            await lending.reclaimLocalNodeFee().should.be.fulfilled;
            await lending.reclaimEthicHubTeamFee().should.be.fulfilled;

            const balance = await stableCoin.balanceOf(lending.address)
            balance.toNumber().should.be.below(2)

            const investor2FinalBalance = await stableCoin.balanceOf(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, investment2, investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await stableCoin.balanceOf(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, investment3, investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            const investor4FinalBalance = await stableCoin.balanceOf(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, investor4Contribution, investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)
        })

        it('Should not allow to send funds back if not borrower', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            await depositManager.contribute(
                lending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await lending.borrowerReturnAmount()
            await depositManager.contribute(
                lending.address,
                investor2,
                borrowerReturnAmount, {
                    from: investor2
                }
            ).should.be.rejectedWith('revert')
        })

        it('Should not allow reclaim twice the funds', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(2)

            await depositManager.contribute(
                lending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await lending.borrowerReturnAmount()
            await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount, {
                    from: borrower
                }
            ).should.be.fulfilled;
            await lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.fulfilled;
            await lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.rejectedWith('revert')
        })

        it('Should not allow returns when contract have balance in other state', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            const investment2 = ether(1)
            await depositManager.contribute(
                lending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await lending.reclaimContributionWithInterest(investor2).should.be.rejectedWith('revert')
        })

        it('Should return correct platform fees', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            await depositManager.contribute(
                lending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(lending, lendingDays.toNumber())
            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await lending.borrowerReturnAmount()

            await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount, {
                    from: borrower
                }
            ).should.be.fulfilled;

            await lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            })
            await lending.reclaimContributionWithInterest(investor3, {
                from: investor3
            })
            await lending.reclaimContributionWithInterest(investor4, {
                from: investor4
            })

            const localNodeBalance = await stableCoin.balanceOf(localNode)
            const teamBalance = await stableCoin.balanceOf(ethicHubTeam)

            await lending.reclaimLocalNodeFee().should.be.fulfilled;
            await lending.reclaimEthicHubTeamFee().should.be.fulfilled;

            const localNodeFinalBalance = await stableCoin.balanceOf(localNode)
            const expectedLocalNodeBalance = localNodeBalance.add(totalLendingAmount.mul(initialStableCoinPerFiatRate).mul(localNodeFee).div(finalStableCoinPerFiatRate).div(new BN(100)))
            checkLostinTransactions(expectedLocalNodeBalance, localNodeFinalBalance)

            const teamFinalBalance = await stableCoin.balanceOf(ethicHubTeam)
            const expectedEthicHubTeamBalance = teamBalance.add(totalLendingAmount.mul(initialStableCoinPerFiatRate).mul(ethichubFee).div(finalStableCoinPerFiatRate).div(new BN(100)))
            checkLostinTransactions(expectedEthicHubTeamBalance, teamFinalBalance)
        })

        it('Should return remainding platform fees if inexact', async function() {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                fundingStartTime,
                fundingEndTime,
                lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                ethichubFee,
                localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                depositManager.address,
                mockStorage.address,
                stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(delayMaxDays, members, community)
            await mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)

            await time.increaseTo(fundingStartTime + time.duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";

            await depositManager.contribute(
                realAmountLending.address,
                investor,
                investment, {
                    from: investor
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            await realAmountLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await realAmountLending.finishInitialExchangingPeriod("538701", {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(realAmountLending, lendingDays.toNumber())
            await realAmountLending.setborrowerReturnStableCoinPerFiatRate("242925", {
                from: owner
            }).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "8657779357692697862", {
                    from: borrower
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "220056000000000", {
                    from: borrower
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "188440380000000000", {
                    from: borrower
                }
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

            const localNodeBalance = await stableCoin.balanceOf(localNode)
            const teamBalance = await stableCoin.balanceOf(ethicHubTeam)
            await realAmountLending.reclaimLocalNodeFee().should.be.fulfilled;
            await realAmountLending.reclaimEthicHubTeamFee().should.be.fulfilled;

            const localNodeFinalBalance = await stableCoin.balanceOf(localNode)
            const expectedLocalNodeBalance = localNodeBalance.add(totalLendingAmount.mul(initialStableCoinPerFiatRate).mul(localNodeFee).div(finalStableCoinPerFiatRate).div(new BN(100)))

            checkLostinTransactions(expectedLocalNodeBalance, localNodeFinalBalance)

            const teamFinalBalance = await stableCoin.balanceOf(ethicHubTeam)
            const expectedEthicHubTeamBalance = teamBalance.add(totalLendingAmount.mul(initialStableCoinPerFiatRate).mul(ethichubFee).div(finalStableCoinPerFiatRate).div(new BN(100)))

            checkLostinTransactions(expectedEthicHubTeamBalance, teamFinalBalance)
        })

        it('should be interest 0% if the project is repaid on the same day', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))

            const investment2 = ether(1)
            const investment3 = ether(0.5)
            const investment4 = ether(1.5)

            const investor2InitialBalance = await stableCoin.balanceOf(investor2)
            const investor3InitialBalance = await stableCoin.balanceOf(investor3)
            const investor4InitialBalance = await stableCoin.balanceOf(investor4)

            await depositManager.contribute(
                lending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            const borrowerReturnAmount = await lending.borrowerReturnAmount()

            await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount, {
                    from: borrower
                }
            ).should.be.fulfilled;

            // Get the contribution 3 years later
            await time.increaseTo(fundingStartTime + time.duration.days(109500))
            // borrowerReturnDays = 0 and interest = 10000
            const borrowerReturnDays = await lending.borrowerReturnDays()
            borrowerReturnDays.toNumber().should.be.equal(0)
            const investorInterest = await lending.investorInterest()
            investorInterest.toNumber().should.be.equal(10000)
            await lending.reclaimContributionWithInterest(investor2, {
                from: investor2
            })
            await lending.reclaimContributionWithInterest(investor3, {
                from: investor3
            })
            await lending.reclaimContributionWithInterest(investor4, {
                from: investor4
            })

            await lending.reclaimLocalNodeFee().should.be.fulfilled;
            await lending.reclaimEthicHubTeamFee().should.be.fulfilled;

            const balance = await stableCoin.balanceOf(lending.address)
            balance.toNumber().should.be.below(2)

            const investor2FinalBalance = await stableCoin.balanceOf(investor2)
            const expectedInvestor2Balance = getExpectedInvestorBalance(investor2InitialBalance, investment2, investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)

            const investor3FinalBalance = await stableCoin.balanceOf(investor3)
            const expectedInvestor3Balance = getExpectedInvestorBalance(investor3InitialBalance, investment3, investorInterest, this)
            checkLostinTransactions(expectedInvestor3Balance, investor3FinalBalance)

            const investor4FinalBalance = await stableCoin.balanceOf(investor4)
            const expectedInvestor4Balance = getExpectedInvestorBalance(investor4InitialBalance, investment4, investorInterest, this)
            checkLostinTransactions(expectedInvestor4Balance, investor4FinalBalance)
        })

    })

    describe('Reclaim leftover eth', async function() {
        it('should send leftover dai to team if its correct state, all parties have reclaimed theirs', async function() {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                fundingStartTime,
                fundingEndTime,
                lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                ethichubFee,
                localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                depositManager.address,
                mockStorage.address,
                stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(delayMaxDays, members, community)
            await mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await time.increaseTo(fundingStartTime + time.duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";

            await depositManager.contribute(
                realAmountLending.address,
                investor,
                investment, {
                    from: investor
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            await realAmountLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await realAmountLending.finishInitialExchangingPeriod("538701", {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(realAmountLending, lendingDays.toNumber())
            await realAmountLending.setborrowerReturnStableCoinPerFiatRate("242925", {
                from: owner
            }).should.be.fulfilled;

            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "8657779357692697862", {
                    from: borrower
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "220056000000000", {
                    from: borrower
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "188440380000000000", {
                    from: borrower
                }
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
            const teamBalance = await stableCoin.balanceOf(ethicHubTeam)
            await realAmountLending.reclaimLeftover({
                from: arbiter
            }).should.be.fulfilled;

            const newBalance = await stableCoin.balanceOf(ethicHubTeam)
            newBalance.should.be.bignumber.above(teamBalance)
        })

        it('should fail to send leftover dai to team if its correct state, without all contributors reclaimed', async function() {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                fundingStartTime,
                fundingEndTime,
                lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                ethichubFee,
                localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                depositManager.address,
                mockStorage.address,
                stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(delayMaxDays, members, community)
            await mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await time.increaseTo(fundingStartTime + time.duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";

            await depositManager.contribute(
                realAmountLending.address,
                investor,
                investment, {
                    from: investor
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            await realAmountLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await realAmountLending.finishInitialExchangingPeriod("538701", {
                from: owner
            }).should.be.fulfilled;

            increaseTimePastEndingTime(realAmountLending, lendingDays.toNumber())
            await realAmountLending.setborrowerReturnStableCoinPerFiatRate("242925", {
                from: owner
            }).should.be.fulfilled;

            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "8657779357692697862", {
                    from: borrower
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "220056000000000", {
                    from: borrower
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "188440380000000000", {
                    from: borrower
                }
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
            }).should.be.rejectedWith('revert')
        })
        it('should fail to send leftover dai to team if its correct state, without local node reclaimed', async function() {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                fundingStartTime,
                fundingEndTime,
                lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                ethichubFee,
                localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                depositManager.address,
                mockStorage.address,
                stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(delayMaxDays, members, community)
            await mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await time.increaseTo(fundingStartTime + time.duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";

            await depositManager.contribute(
                realAmountLending.address,
                investor,
                investment, {
                    from: investor
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            await realAmountLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await realAmountLending.finishInitialExchangingPeriod("538701", {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(realAmountLending, lendingDays.toNumber())
            await realAmountLending.setborrowerReturnStableCoinPerFiatRate("242925", {
                from: owner
            }).should.be.fulfilled;

            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "8657779357692697862", {
                    from: borrower
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "220056000000000", {
                    from: borrower
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "188440380000000000", {
                    from: borrower
                }
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
            }).should.be.rejectedWith('revert')

        })
        it('should fail to send leftover dai to team if its correct state, without team reclaimed', async function() {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                fundingStartTime,
                fundingEndTime,
                lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                ethichubFee,
                localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                depositManager.address,
                mockStorage.address,
                stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(delayMaxDays, members, community)
            await mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await time.increaseTo(fundingStartTime + time.duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";

            await depositManager.contribute(
                realAmountLending.address,
                investor,
                investment, {
                    from: investor
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            await realAmountLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await realAmountLending.finishInitialExchangingPeriod("538701", {
                from: owner
            }).should.be.fulfilled;
            increaseTimePastEndingTime(realAmountLending, lendingDays.toNumber())
            await realAmountLending.setborrowerReturnStableCoinPerFiatRate("242925", {
                from: owner
            }).should.be.fulfilled;

            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "8657779357692697862", {
                    from: borrower
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "220056000000000", {
                    from: borrower
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "188440380000000000", {
                    from: borrower
                }
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
            }).should.be.rejectedWith('revert')
        })

        it('should fail to send leftover dai to team if its correct state if not arbiter', async function() {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                fundingStartTime,
                fundingEndTime,
                lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                ethichubFee,
                localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                depositManager.address,
                mockStorage.address,
                stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(delayMaxDays, members, community)
            await mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await time.increaseTo(fundingStartTime + time.duration.days(1))
            const investment = "1000000000000000000"
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";
            await depositManager.contribute(
                realAmountLending.address,
                investor,
                investment, {
                    from: investor
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            await realAmountLending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await realAmountLending.finishInitialExchangingPeriod("538701", {
                from: owner
            }).should.be.fulfilled;

            increaseTimePastEndingTime(realAmountLending, lendingDays.toNumber())
            await realAmountLending.setborrowerReturnStableCoinPerFiatRate("242925", {
                from: owner
            }).should.be.fulfilled;

            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "8657779357692697862", {
                    from: borrower
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "220056000000000", {
                    from: borrower
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                borrower,
                "188440380000000000", {
                    from: borrower
                }
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
            }).should.be.rejectedWith('revert')

        })

        it('should fail to send leftover dai to team if not correct state', async function() {
            let lendingAmount = new BN("3539238226800208500")
            let realAmountLending = await EthicHubLending.new(
                fundingStartTime,
                fundingEndTime,
                lendingInterestRatePercentage,
                lendingAmount,
                lendingDays,
                ethichubFee,
                localNodeFee,
                borrower,
                localNode,
                ethicHubTeam,
                depositManager.address,
                mockStorage.address,
                stableCoin.address
            )

            await realAmountLending.saveInitialParametersToStorage(delayMaxDays, members, community)
            await mockStorage.setAddress(utils.soliditySha3("contract.address", realAmountLending.address), realAmountLending.address)
            await mockStorage.setAddress(utils.soliditySha3("arbiter", realAmountLending.address), arbiter)

            await time.increaseTo(fundingStartTime + time.duration.days(1))
            const investment = "1000000000000000000";
            const investment2 = "0261720000000000000";
            const investment3 = "2068378226800210000";
            const investment4 = "0340000000000000000";

            await depositManager.contribute(
                realAmountLending.address,
                investor,
                investment, {
                    from: investor
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor2,
                investment2, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor3,
                investment3, {
                    from: investor3
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                realAmountLending.address,
                investor4,
                investment4, {
                    from: investor4
                }
            ).should.be.fulfilled;

            await realAmountLending.reclaimLeftover({
                from: arbiter
            }).should.be.rejectedWith('revert')
        })
    })

    describe('Send partial return', async function() {

        it('Should allow to send partial return before the rate is set', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))

            await depositManager.contribute(
                lending.address,
                investor,
                totalLendingAmount, {
                    from: investor
                }
            ).should.be.fulfilled;

            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;

            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
        })

        it('Should not allow to send more than collected return', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                totalLendingAmount, {
                    from: investor
                }
            ).should.be.fulfilled;
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                borrower,
                totalLendingAmount.add(ether(1)), {
                    from: borrower
                }
            ).should.be.rejectedWith('revert')
        })

        it('Should not allow to send partial return after the rate is set', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                totalLendingAmount, {
                    from: investor
                }
            ).should.be.fulfilled;
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                borrower,
                totalLendingAmount.add(ether(1)), {
                    from: borrower
                }
            ).should.be.rejectedWith('revert')
        })

        it('Should only allow borrower to send partial return', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await depositManager.contribute(
                lending.address,
                investor,
                totalLendingAmount, {
                    from: investor
                }
            ).should.be.fulfilled;
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor2,
                ether(1), {
                    from: investor2
                }
            ).should.be.rejectedWith('revert')
            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;
        })

        it('Should allow to reclaim partial return from contributor', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))

            const investorInvestment = ether(1)
            const investor2Investment = ether(2)
            await depositManager.contribute(
                lending.address,
                investor,
                investorInvestment, {
                    from: investor
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor2,
                investor2Investment, {
                    from: investor2
                }
            ).should.be.fulfilled;
            await lending.sendFundsToBorrower({
                from: owner
            }).should.be.fulfilled;

            await lending.finishInitialExchangingPeriod(initialStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            await lending.setborrowerReturnStableCoinPerFiatRate(finalStableCoinPerFiatRate, {
                from: owner
            }).should.be.fulfilled;

            var investorInitialBalance = await stableCoin.balanceOf(investor)

            const borrowerReturnAmount = await lending.borrowerReturnAmount()

            await depositManager.contribute(
                lending.address,
                borrower,
                borrowerReturnAmount, {
                    from: borrower
                }
            ).should.be.fulfilled;

            var investorInitialBalance = await stableCoin.balanceOf(investor)

            const investorInterest = await lending.investorInterest()

            await lending.reclaimContributionWithInterest(investor).should.be.fulfilled;
            await lending.reclaimContributionWithInterest(investor2).should.be.fulfilled;

            let reclaimStatus = await lending.getUserContributionReclaimStatus(investor)
            reclaimStatus.should.be.equal(true)
            reclaimStatus = await lending.getUserContributionReclaimStatus(investor2)
            reclaimStatus.should.be.equal(true)

            var investorFinalBalance = await stableCoin.balanceOf(investor)
            var expectedInvestorBalance = getExpectedInvestorBalance(investorInitialBalance, investorInvestment.sub(ether(1).div(new BN(3))), investorInterest, this)
            checkLostinTransactions(expectedInvestorBalance, investorFinalBalance)

            var investor2FinalBalance = await stableCoin.balanceOf(investor2)
            var expectedInvestor2Balance = getExpectedInvestorBalance(investorInitialBalance, investor2Investment.sub(ether(2).div(new BN(3))), investorInterest, this)
            checkLostinTransactions(expectedInvestor2Balance, investor2FinalBalance)
        })
    })

    describe('Change borrower', async function() {

        it('Should allow to change borrower with registered arbiter', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await mockStorage.setBool(utils.soliditySha3("user", "representative", investor3), true)
            await lending.setBorrower(investor3, {
                from: arbiter
            }).should.be.fulfilled;
            let b = await lending.borrower()
            b.should.be.equal(investor3)
        })

        it('Should not allow to change borrower with unregistered arbiter', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await lending.setBorrower(investor3, {
                from: owner
            }).should.be.rejectedWith('revert')
        })

    })

    describe('Change investor', async function() {

        it('Should allow to change investor with registered arbiter', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
            await depositManager.contribute(
                lending.address,
                investor,
                ether(1), {
                    from: investor
                }
            ).should.be.fulfilled;
            await lending.changeInvestorAddress(investor, investor2, {
                from: arbiter
            }).should.be.fulfilled;

            var contributionAmount = await lending.checkInvestorContribution(investor2)
            contributionAmount.should.be.bignumber.equal(ether(1))
            contributionAmount = await lending.checkInvestorContribution(investor)
            contributionAmount.should.be.bignumber.equal(new BN(0))

        })

        it('Should not allow to change investor to unregistered investor', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), false)
            await depositManager.contribute(
                lending.address,
                investor,
                ether(1), {
                    from: investor
                }
            ).should.be.fulfilled;
            await lending.changeInvestorAddress(investor, investor2, {
                from: arbiter
            }).should.be.rejectedWith('revert')
        })

        it('Should not allow to change new investor who have already invested', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
            await depositManager.contribute(
                lending.address,
                investor,
                ether(1), {
                    from: investor
                }
            ).should.be.fulfilled;
            await depositManager.contribute(
                lending.address,
                investor2,
                ether(1), {
                    from: investor2
                }
            ).should.be.fulfilled;
            await lending.changeInvestorAddress(investor, investor2, {
                from: arbiter
            }).should.be.rejectedWith('revert')
        })


        it('Should not allow to change borrower with unregistered arbiter', async function() {
            await time.increaseTo(fundingStartTime + time.duration.days(1))
            await mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
            await mockStorage.setBool(utils.soliditySha3("user", "investor", investor2), true)
            await lending.changeInvestorAddress(investor, investor2, {
                from: owner
            }).should.be.rejectedWith('revert')
        })
    })

    async function increaseTimePastEndingTime(lendingContract, increaseDays) {
        const fundingEnd = await lendingContract.fundingEndTime()
        const returnDate = fundingEnd.add(new BN(time.duration.days(increaseDays)))
        await time.increaseTo(returnDate)
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