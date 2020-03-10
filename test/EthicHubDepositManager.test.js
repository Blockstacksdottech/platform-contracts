'use strict'
const utils = require("web3-utils")
import assertSentViaGSN from './helpers/assertSentViaGSN'
const { accounts, contract, web3 } = require('@openzeppelin/test-environment')
const {
    BN,
    time,
    ether,
    expectRevert
} = require('@openzeppelin/test-helpers')
const { fundRecipient } = require('@openzeppelin/gsn-helpers')
const { TestHelper } = require('@openzeppelin/cli')
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades')
ZWeb3.initialize()

const EthicHubLending = contract.fromArtifact('EthicHubLending')
const MockStorage = contract.fromArtifact('MockStorage')
const MockStableCoin = contract.fromArtifact('MockStableCoin')
const EthicHubDepositManager = Contracts.getFromLocal('EthicHubDepositManager')

const CHAIN_ID = "666"

describe('EthicHubDepositManager', function () {
    const [owner, investor] = accounts
    let fundingStartTime
    let fundingEndTime
    let mockStorage
    let stableCoin
    let project
    let depositManager
    let lending

    beforeEach(async function () {
        
        await time.advanceBlock()

        const latestTimeValue = await time.latest()
        fundingStartTime = latestTimeValue.add(time.duration.days(1))
        fundingEndTime = fundingStartTime.add(time.duration.days(40))

        mockStorage = await MockStorage.new()
        stableCoin = await MockStableCoin.new(CHAIN_ID)

        await mockStorage.setBool(utils.soliditySha3("user", "localNode", owner), true)
        await mockStorage.setBool(utils.soliditySha3("user", "representative", owner), true)
        project = await TestHelper()
        depositManager = await project.createProxy(EthicHubDepositManager, {
            initMethod: 'initialize',
            initArgs: [
                mockStorage.address,
                stableCoin.address
            ]
        })

        await stableCoin.transfer(owner, ether('100000')).should.be.fulfilled
        await stableCoin.approve(depositManager.address, ether('1000000000'), {
            from: owner
        })
        await stableCoin.transfer(investor, ether('100000')).should.be.fulfilled
        await stableCoin.approve(depositManager.address, ether('1000000000'), {
            from: investor
        })

        lending = await EthicHubLending.new(
            fundingStartTime,
            fundingEndTime,
            15,
            ether('3'),
            90,
            3,
            4,
            owner,
            owner,
            owner,
            depositManager.address,
            mockStorage.address,
            stableCoin.address
        )

        await mockStorage.setAddress(utils.soliditySha3("contract.address", lending.address), lending.address)
        await mockStorage.setAddress(utils.soliditySha3("arbiter", lending.address), owner)

        await mockStorage.setBool(utils.soliditySha3("user", "investor", investor), true)
        await mockStorage.setBool(utils.soliditySha3("user", "community", owner), true)
        await mockStorage.setBool(utils.soliditySha3("user", "arbiter", owner), true)

        await lending.saveInitialParametersToStorage(90, 20, owner)

        await fundRecipient(web3, {
            recipient: depositManager.address
        })
    })

    it('only owner can change relayer', async function () {
        expectRevert(depositManager.setRelayHubAddress(investor, {
            from: investor
        }), 'stuff')
    })

    it.only('check can contribute using GSN', async function () {
        await time.increaseTo(fundingStartTime.add(time.duration.days(1)))
        const investment = ether('1')
        const result = await depositManager.contribute(
            lending.address,
            investor,
            investment, {
            from: investor,
            useGSN: true
        })
        await assertSentViaGSN(web3, result.tx, expect)
        const investorContribution = await lending.checkInvestorContribution(investor)
        investorContribution.should.be.bignumber.equal(investment)
    })

    it('check can contribute without using GSN', async function () {
        await time.increaseTo(fundingStartTime.add(time.duration.days(1)))
        const investment = ether('1')
        await depositManager.contribute(
            lending.address,
            investor,
            investment, {
            from: investor,
            useGSN: false
        }, {from: owner}).should.be.fulfilled
        const investorContribution = await lending.checkInvestorContribution(investor)
        investorContribution.should.be.bignumber.equal(investment)
    })

    it('check cannot contribute 0', async function () {
        await time.increaseTo(fundingStartTime + time.duration.days(1))
        await depositManager.contribute(
            lending.address,
            investor,
            0, {
            from: investor,
        }).should.be.rejectedWith('revert')
    })
})