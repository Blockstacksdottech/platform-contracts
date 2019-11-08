/*
    Test prarticular case of the platform contract.

    Copyright (C) 2018 EthicHub

    This file is part of platform contracts.

    This is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
    */

'use strict';

import ether from './helpers/ether';
import {
    advanceBlock
} from './helpers/advanceToBlock';
import {
    increaseTimeTo,
    duration
} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMRevert from './helpers/EVMRevert';

const EthereumTx = require('ethereumjs-tx');
const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should()
const web3_1_0 = require('web3');
const utils = require("web3-utils");
const BigNumber = utils.BN
const fs = require('fs');
const storage = artifacts.require('./storage/EthicHubStorage.sol');
const cmc = artifacts.require('./EthicHubCMC.sol');
const userManager = artifacts.require('./user/EthicHubUser.sol');
const lending = artifacts.require('./lending/EthicHubLending.sol');
const reputation = artifacts.require('./reputation/EthicHubReputation.sol');
const arbitrage = artifacts.require('./arbitrage/EthicHubArbitrage.sol');

const Uninitialized = 0;
const AcceptingContributions = 1;
const ExchangingToFiat = 2;
const AwaitingReturn = 3;
const ProjectNotFunded = 4;
const ContributionReturned = 5;
const Default = 6;

// Default key pairs made by testrpc when using `truffle develop` CLI tool
// NEVER USE THESE KEYS OUTSIDE OF THE LOCAL TEST ENVIRONMENT
const publicKeys = [
    '0x627306090abab3a6e1400e9345bc60c78a8bef57',
    '0xf17f52151ebef6c7334fad080c5704d77216b732',
    '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef',
    '0x821aea9a577a9b44299b9c15c88cf3087f3b5544',
    '0x0d1d4e623d10f9fba5db95830f7d3839406c6af2',
    '0x2932b7a2355d6fecc4b5c0b6bd44cc31df247a2e',
    '0x2191ef87e392377ec08e7c08eb105ef5448eced5',
    '0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5',
    '0x6330a553fc93768f612722bb8c2ec78ac90b3bbc',
    '0x5aeda56215b167893e80b4fe645ba6d5bab767de'
]

const privateKeys = [
    'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3',
    'ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f',
    '0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1',
    'c88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c',
    '388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418',
    '659cbb0e2411a44db63778987b1e22153c086a95eb6b18bdf89de078917abc63',
    '82d052c865f5763aad42add438569276c00d3d88a2d062d36b2bae914d58b8c8',
    'aa3680d5d48a8283413f7a108367c7299ca73f553735860a87b08f39395618b7',
    '0f62d96d6675f32685bbdb8ac13cda7c23436f63efbb9d07700d8669ff12b7c4',
    '8d5366123cb560bb606379f90a0bfd4769eecc0557f1b362dcae9012b548b1e5'
];

function now() {
    return Math.round((new Date()).getTime() / 1000);
}

function deployedContracts(debug = false) {
    const instances = Promise.all([
        storage.deployed(),
        userManager.deployed(),
        reputation.deployed(),
        cmc.deployed(),
        arbitrage.deployed()
    ]);
    return instances;
}

// Initial parameters
const TIER = 1;
const INITIAL_WEIS = 3539238226800208500 // Initial weis
const INIT_ETH_RATE = 538701 // When exchange contract to borrower
const FINAL_ETH_RATE = 242925 // When exchange borrower to contract
const COMMUNITY_NUMBER = 19;
//const FIAT_PER_PERSON=1000;
const FUNDING_DAYS = 15;
const LENDING_DAYS = 77;
const INTEREST = 15;
const MAX_DELAY_DAYS = 30;
const LOCAL_NODE_FEE = 4;
const TEAM_FEE = 3;
const TOTAL_LENDING_FIAT_AMOUNT = new BigNumber('1906591172015499119158500');
const BORROWER_RETURN_AMOUNT = new BigNumber('8858575510358727408')

// Actors
const owner = web3.eth.accounts[0]; // Always 0 position
const NUMBER_INVESTORS = 4;
const localNode = web3.eth.accounts[NUMBER_INVESTORS + 1];
const community = web3.eth.accounts[NUMBER_INVESTORS + 2];
const teamEH = web3.eth.accounts[NUMBER_INVESTORS + 3];
const borrower = web3.eth.accounts[NUMBER_INVESTORS + 4];
const paymentGateway = web3.eth.accounts[NUMBER_INVESTORS + 5];
var investors = [];
for (var i = 0; i < NUMBER_INVESTORS; i++) {
    investors[i] = web3.eth.accounts[i + 1];
}
// investments the first investor is 0
const INVESTMENTS = [{
        investor: '0',
        investment: new BigNumber('1000000000000000000'),
        originalInvestor: "0x90299EC59b94398a3a31a795Bc585F743d0e5Cc9"
    },
    {
        investor: '1',
        investment: new BigNumber('1990000000000000000'),
        originalInvestor: "0x7E032A1Bed85664209B3C22D12caec40fdF73089"
    },
    {
        investor: '2',
        investment: new BigNumber('340000000000000000'),
        originalInvestor: "0xFF876a47bA394f9e7877a4d12AC9C656f704e0A3"
    },
    {
        investor: '3',
        investment: new BigNumber('130860000000000000'),
        originalInvestor: "0xFe3138E427389a5560B8B89F07DB14de714795e3"
    },
    {
        investor: '1',
        investment: new BigNumber('250000000000000000'),
        originalInvestor: "0x7E032A1Bed85664209B3C22D12caec40fdF73089"
    }
]

const RETURNS = [
    new BigNumber('8657779357692697862'),
    new BigNumber('220056000000000'),
    new BigNumber('188440380000000000')
]
const EXCESS_IN_RETURN = new BigNumber('188000436000000000')

function getReclaimActions(lendingContract) {
    return [{
            sender: investors[1],
            action: lendingContract.reclaimContributionWithInterest,
            expected: new BigNumber('4739035099193008911'),
            hasTarget: true
        },
        {
            sender: investors[2],
            action: lendingContract.reclaimContributionWithInterest,
            expected: new BigNumber('779681133658536585'),
            hasTarget: true
        },
        {
            sender: investors[0],
            action: lendingContract.reclaimContributionWithInterest,
            expected: new BigNumber('2295840878048780487'),
            hasTarget: true
        },
        {
            sender: owner,
            action: lendingContract.reclaimLocalNodeFee,
            expected: new BigNumber('313939063005536543'),
            hasTarget: false
        },
        {
            sender: owner,
            action: lendingContract.reclaimEthicHubTeamFee,
            expected: new BigNumber('235454297254152407'),
            hasTarget: true
        },
        {
            sender: investors[3],
            action: lendingContract.reclaimContributionWithInterest,
            expected: new BigNumber('307224183986341463'),
            hasTarget: true
        },
    ]
}

describe('Test Single Case contract', function() {
    let instances;
    let storageInstance;
    let userManagerInstance;
    let reputationInstance;
    let CMCInstance;
    let arbitrageInstance;
    let lendingInstance;
    before(async () => {
        instances = await deployedContracts();
        storageInstance = instances[0];
        userManagerInstance = instances[1];
        reputationInstance = instances[2];
        CMCInstance = instances[3];
        arbitrageInstance = instances[4];
    });
    it('should pass if contracts are on storage contract', async function() {
        let userManagerContractAddress = await storageInstance.getAddress(utils.soliditySha3('contract.name', 'users'));
        userManagerContractAddress.should.be.equal(userManagerInstance.address);
        let reputationContractAddress = await storageInstance.getAddress(utils.soliditySha3('contract.name', 'reputation'));
        reputationContractAddress.should.be.equal(reputationInstance.address);
        let arbitrageContractAddress = await storageInstance.getAddress(utils.soliditySha3('contract.name', 'arbitrage'));
        arbitrageContractAddress.should.be.equal(arbitrageInstance.address);
        let CMCContractAddress = await storageInstance.getAddress(utils.soliditySha3('contract.address', CMCInstance.address));
        CMCContractAddress.should.be.equal(CMCInstance.address);
    });
    it('should register local node', async function() {
        await userManagerInstance.registerLocalNode(localNode);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode, 'localNode');
        registrationStatus.should.be.equal(true);
    });
    it('should register community', async function() {
        await userManagerInstance.registerCommunity(community);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(community, 'community');
        registrationStatus.should.be.equal(true);
    });
    it('should register borrower', async function() {
        await userManagerInstance.registerRepresentative(borrower);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(borrower, 'representative');
        registrationStatus.should.be.equal(true);
    });
    it('should register paymentGateway', async function() {
        await userManagerInstance.registerPaymentGateway(paymentGateway);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(paymentGateway, 'paymentGateway');
        registrationStatus.should.be.equal(true);
    });
    it('should register investors', async function() {
        for (var i = 0; i < NUMBER_INVESTORS; i++) {
            await userManagerInstance.registerInvestor(investors[i]);
            var registrationStatus = await userManagerInstance.viewRegistrationStatus(investors[i], 'investor');
            registrationStatus.should.be.equal(true);
        };
    });
    it('should deploy lending contract', async function() {
        const latestTimeValue = await latestTime()
        lendingInstance = await lending.new(
            //Arguments
            latestTimeValue + duration.days(1), //_fundingStartTime
            latestTimeValue + duration.days(FUNDING_DAYS + 1), //_fundingEndTime
            borrower, //_representative
            INTEREST, //_annualInterest
            INITIAL_WEIS, //_totalLendingAmount
            LENDING_DAYS, //_lendingDays
            storageInstance.address, //_storageAddress
            localNode,
            teamEH,
            TEAM_FEE, //ethichub fee
            LOCAL_NODE_FEE //localNode fee
        )
        //Gives set permissions on storage
        await CMCInstance.addNewLendingContract(lendingInstance.address);
        console.log('--> EthicHubLending deployed');
        //Lending saves parameters in storage, checks if owner is localNode
        await lendingInstance.saveInitialParametersToStorage(
            MAX_DELAY_DAYS, //maxDefaultDays
            COMMUNITY_NUMBER, //community members
            community //community rep wallet
        );
    });
    it('should pass if lending contract is on storage contract', async function() {
        let lendingContractAddress = await storageInstance.getAddress(utils.soliditySha3('contract.address', lendingInstance.address));
        lendingContractAddress.should.be.equal(lendingInstance.address);
    });
    it('should pass if lending contract owner is the same owner address', async function() {
        owner.should.be.equal(await lendingInstance.owner());
    });
    it.skip('investments reaches goal', async function() {
        await increaseTimeTo(latestTime() + duration.days(1));
        // Init Reputation
        const initialCommunityReputation = await reputationInstance.getCommunityReputation(community).should.be.fulfilled;
        const initialLocalNodeReputation = await reputationInstance.getLocalNodeReputation(localNode).should.be.fulfilled;
        // Is contribution period
        var isRunning = await lendingInstance.isContribPeriodRunning();
        // Set investments
        isRunning.should.be.equal(true);
        var total_contribution = new BigNumber(0);
        for (var i = 0; i < INVESTMENTS.length; i++) {
            var transaction = await lendingInstance.sendTransaction({
                value: INVESTMENTS[i]['investment'],
                from: investors[INVESTMENTS[i]['investor']]
            }).should.be.fulfilled;
            total_contribution = total_contribution.add(INVESTMENTS[i]['investment']);
        };
        // Check investments
        for (var i = 0; i < investors.length; i++) {
            var investor_contribution = new BigNumber(0);
            for (var j = 0; j < INVESTMENTS.length; j++) {
                if (i == INVESTMENTS[j]['investor']) {
                    if (j == INVESTMENTS.length - 1) {
                        let excess = total_contribution.sub(utils.toBN(INITIAL_WEIS));
                        investor_contribution = investor_contribution.add(INVESTMENTS[j]['investment']).sub(excess);
                    } else {
                        investor_contribution = investor_contribution.add(INVESTMENTS[j]['investment']);
                    }
                }
            }
            var contribution = await lendingInstance.checkInvestorContribution(investors[i]);
            contribution.should.be.bignumber.equal(investor_contribution);
        }
        // Check surplus
        var surplusEth = await lendingInstance.surplusEth();
        surplusEth.should.be.bignumber.equal(0);
        // Send funds to borrower
        transaction = await lendingInstance.sendFundsToBorrower({
            from: owner
        }).should.be.fulfilled;
        transaction = await lendingInstance.finishInitialExchangingPeriod(INIT_ETH_RATE, {
            from: owner
        }).should.be.fulfilled;
        // Check total lending fiat amount
        var totalLendingFiatAmount = await lendingInstance.totalLendingFiatAmount();
        console.log(totalLendingFiatAmount);


        //TODO decimal precision
        //totalLendingFiatAmount.should.be.bignumber.equal(TOTAL_LENDING_FIAT_AMOUNT);
        var difference = 0
        console.log('expected total fiat amount')
        console.log(TOTAL_LENDING_FIAT_AMOUNT)
        console.log('contract')
        console.log(totalLendingFiatAmount)
        if (TOTAL_LENDING_FIAT_AMOUNT.gt(totalLendingFiatAmount)) {
            difference = TOTAL_LENDING_FIAT_AMOUNT.sub(totalLendingFiatAmount)
        } else {
            difference = totalLendingFiatAmount.sub(TOTAL_LENDING_FIAT_AMOUNT)
        }
        console.log("difference")
        console.log(difference)
        difference.should.be.bignumber.lte(new BigNumber(100000000));
        increaseTimePastEndingTime(lendingInstance, LENDING_DAYS)
        //console.log('=== SEND FUNDS BORROWER ===');
        //await traceBalancesAllActors();
        // Borrower return amount
        await lendingInstance.setBorrowerReturnEthPerFiatRate(FINAL_ETH_RATE, {
            from: owner
        }).should.be.fulfilled;
        const borrowerReturnAmount = await lendingInstance.borrowerReturnAmount();
        console.log('returnAmount: ' + borrowerReturnAmount)
        console.log('expected: ' + BORROWER_RETURN_AMOUNT)

        //borrowerReturnAmount.should.be.bignumber.equal(BORROWER_RETURN_AMOUNT)
        var state = await lendingInstance.state()
        console.log(`state = ${state}`)
        var returnedTotal = new BigNumber(0)
        for (var i = 0; i < RETURNS.length; i++) {
            console.log(`Returning ${i} of ${RETURNS.length}`)

            let amount = RETURNS[i]
            returnedTotal.add(amount)
            let transaction = await lendingInstance.sendTransaction({
                value: amount,
                from: borrower
            }).should.be.fulfilled;

            console.log(transaction)
            console.log("next")
        }
        console.log("contract:")
        console.log(borrowerReturnAmount)
        console.log("total sent")
        console.log(returnedTotal)
        console.log("total sent minus excess in production")
        let expectedReturn = returnedTotal.sub(EXCESS_IN_RETURN)
        console.log(expectedReturn)

        state = await lendingInstance.state()
        console.log(`state = ${state}`)
        //borrowerReturnAmount.should.be.bignumber.equal(expectedReturn)

        let reclaimActions = getReclaimActions(lendingInstance)
        for (var i = 0; i < NUMBER_INVESTORS; i++) {
            let reclaim = reclaimActions[i]
            var transaction
            if (reclaim.hasTarget) {
                transaction = await reclaim.action(reclaim.sender, {
                    from: reclaim.sender
                }).should.be.fulfilled;
            } else {
                transaction = await reclaim.action({
                    from: reclaim.sender
                }).should.be.fulfilled;
            }
            console.log(transaction)
        }

        // Show balances
        //console.log('=== FINISH ===');
        //await traceBalancesAllActors();
        // Check reputation
        await checkReputation(localNode, community, initialLocalNodeReputation, initialCommunityReputation, lendingInstance, storageInstance, reputationInstance);
    });
});


function traceBalancesAllActors() {
    const ownerBalance = utils.fromWei(utils.toBN(web3.eth.getBalance(ownerTruffle)));
    const borrowerBalance = utils.fromWei(utils.toBN(web3.eth.getBalance(borrower)));
    const investor1Balance = utils.fromWei(utils.toBN(web3.eth.getBalance(investor1)));
    const investor2Balance = utils.fromWei(utils.toBN(web3.eth.getBalance(investor2)));
    const investor3Balance = utils.fromWei(utils.toBN(web3.eth.getBalance(investor3)));
    const localNodeBalance = utils.fromWei(utils.toBN(web3.eth.getBalance(localNode)));
    const teamBalance = utils.fromWei(utils.toBN(web3.eth.getBalance(teamEH)));
    const communityBalance = utils.fromWei(utils.toBN(web3.eth.getBalance(community)));
    console.log('Owner Contract:' + ownerBalance);
    console.log('Borrower:' + borrowerBalance);
    console.log('Investor 1:' + investor1Balance);
    console.log('Investor 2:' + investor2Balance);
    console.log('Investor 3:' + investor3Balance);
    console.log('Local Node:' + localNodeBalance);
    console.log('Team:' + teamBalance);
    console.log('Community:' + communityBalance);
}

function checkLostinTransactions(expected, actual) {
    const lost = expected.sub(actual);
    //console.log("Perdida:" + utils.fromWei(utils.toBN(Math.floor(lost.toNumber())), 'ether'));
    // /* Should be below 0.02 eth */
    lost.should.be.bignumber.below('20000000000000000');
}

// Calculate (gasUsed*gasPrice)
function getTransactionCost(txHash) {
    const gasPrice = web3.eth.getTransaction(txHash).gasPrice;
    const gasUsed = web3.eth.getTransactionReceipt(txHash).gasUsed;
    const txCost = gasPrice.mul(gasUsed);
    console.log('Gas Price:' + utils.fromWei(utils.toBN(gasPrice)));
    console.log('Gas Used:' + gasUsed.toString());
    console.log('Tx Cost:' + utils.fromWei(utils.toBN(txCost)));
    return txCost;
}

function reportMethodGasUsed(filename, role, methodName, txHash, remove = false) {
    if (remove)
        fs.openSync(filename + '.csv', 'w');
    const gasUsed = web3.eth.getTransactionReceipt(txHash).gasUsed;
    fs.appendFileSync(filename + '.csv', role + ',' + methodName + ',' + gasUsed + '\n');
}

function getExpectedInvestorBalance(initialAmount, contribution, initialEthPerFiatRate, lendingInterestRatePercentage, finalEthPerFiatRate) {

    const received = contribution.mul(initialEthPerFiatRate)
        .mul(lendingInterestRatePercentage)
        .div(finalEthPerFiatRate).div(10000);
    return initialAmount.sub(contribution).add(received);

}

async function checkReputation(localNode, community, initialLocalNodeReputation, initialCommunityReputation, lendingInstance, storageInstance, reputationInstance, delayDays) {
    // Get init params of lending contract
    const reputationStep = 100;
    const minPeopleCommunity = 20;
    const minProject = 1 * minPeopleCommunity;
    const incrLocalNodeMultiplier = 5;
    const maxDelayDays = await storageInstance.getUint(utils.soliditySha3("lending.maxDelayDays", lendingInstance.address));
    const projectTier = await storageInstance.getUint(utils.soliditySha3("lending.tier", lendingInstance.address));
    const communityMembers = await storageInstance.getUint(utils.soliditySha3("lending.communityMembers", lendingInstance.address));
    // Init Reputation
    //const reputationAddress = await storageInstance.getAddress(utils.soliditySha3("contract.name", "reputation"));
    //const reputationInstance = await reputation.at(reputationAddress);
    //console.log('Initial (Community) Reputation: ' + initialCommunityReputation);
    //console.log('Initial (Local Node) Reputation: ' + initialLocalNodeReputation);

    var expectedCommunityRep = initialCommunityReputation;
    var expectedLocalNodeRep = initialLocalNodeReputation;
    var increment = 0;
    var decrement = 0;
    // Decrement
    if (delayDays > 0) {
        //console.log('=== DECREMENT ===');
        decrement = initialLocalNodeReputation.mul(delayDays).div(maxDelayDays);
        if (delayDays < maxDelayDays && decrement < reputationStep) {
            expectedLocalNodeRep = Math.floor(initialLocalNodeReputation.sub(decrement).toNumber());
            expectedCommunityRep = Math.floor(initialCommunityReputation.sub(initialCommunityReputation.mul(delayDays).div(maxDelayDays)).toNumber());
        } else if (delayDays < maxDelayDays) {
            expectedLocalNodeRep = Math.floor(initialLocalNodeReputation.sub(reputationStep).toNumber());
            expectedCommunityRep = Math.floor(initialCommunityReputation.sub(initialCommunityReputation.mul(delayDays).div(maxDelayDays)).toNumber());
        } else if (delayDays >= maxDelayDays) {
            expectedLocalNodeRep = 0;
            expectedCommunityRep = 0;
        }
    } else {
        //console.log('=== INCREMENT ===');
        const completedProjectsByTier = await storageInstance.getUint(utils.soliditySha3("community.completedProjectsByTier", lendingInstance.address, projectTier));
        if (completedProjectsByTier > 0) {
            increment = 100 / completedProjectsByTier;
            expectedCommunityRep = Math.floor(initialCommunityReputation.add(increment).toNumber());
            increment = (projectTier.mul(communityMembers).div(minProject)).mul(incrLocalNodeMultiplier);
            expectedLocalNodeRep = initialLocalNodeReputation.add(increment).toNumber();
        }
    }
    //console.log('Exp Community Reputation: ' + expectedCommunityRep);
    //console.log('Exp Local Node Reputation: ' + expectedLocalNodeRep);
    const communityAddress = await storageInstance.getAddress(utils.soliditySha3("lending.community", lendingInstance.address));
    communityAddress.should.be.equal(community);
    const communityRep = await reputationInstance.getCommunityReputation(community);
    //console.log('Final Community Reputation: ' + communityRep);
    communityRep.should.be.bignumber.equal(expectedCommunityRep);
    const localNodeAddress = await storageInstance.getAddress(utils.soliditySha3("lending.localNode", lendingInstance.address));
    localNodeAddress.should.be.equal(localNode);
    const localNodeRep = await reputationInstance.getLocalNodeReputation(localNode);
    //console.log('Final Local Node Reputation: ' + localNodeRep);
    localNodeRep.should.be.bignumber.equal(expectedLocalNodeRep);
}

/*
 * Call a smart contract function from any keyset in which the caller has the
 *     private and public keys.
 * @param {string} senderPublicKey Public key in key pair.
 * @param {string} senderPrivateKey Private key in key pair.
 * @param {string} contractAddress Address of Solidity contract.
 * @param {string} data Data from the function's `getData` in web3.js.
 * @param {number} value Number of Ethereum wei sent in the transaction.
 * @return {Promise}
 */
function rawTransaction(
    senderPublicKey,
    senderPrivateKey,
    contractAddress,
    data,
    value
) {
    return new Promise((resolve, reject) => {
        let key = new Buffer(senderPrivateKey, 'hex');
        let nonce = web3.toHex(web3.eth.getTransactionCount(senderPublicKey));
        let gasPrice = web3.eth.gasPrice;
        let gasPriceHex = web3.toHex(web3.eth.estimateGas({
            from: contractAddress
        }));
        let gasLimitHex = web3.toHex(5500000);
        let rawTx = {
            nonce: nonce,
            gasPrice: gasPriceHex,
            gasLimit: gasLimitHex,
            data: data,
            to: contractAddress,
            value: web3.toHex(value)
        };
        let tx = new EthereumTx(rawTx);
        tx.sign(key);
        let stx = '0x' + tx.serialize().toString('hex');
        web3.eth.sendRawTransaction(stx, (err, hash) => {
            if (err) {
                reject(err);
            } else {
                resolve(hash);
            }
        });
    });
}

async function increaseTimePastEndingTime(lendingContract, increaseDays) {
    const fundingEnd = await lendingContract.fundingEndTime();
    const returnDate = fundingEnd.add(duration.days(increaseDays));
    await (returnDate)
}