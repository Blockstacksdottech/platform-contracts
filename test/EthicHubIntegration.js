/*
    Test integration of the platform contracts.

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

const {
    BN
} = require('@openzeppelin/test-helpers')
const chai = require('chai')
chai.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()

const utils = require("web3-utils");
const fs = require('fs');

const EthicHubStorage = artifacts.require('./storage/EthicHubStorage.sol');
const EthicHubLending = artifacts.require('./lending/EthicHubLending.sol');
const EthicHubDepositManager = artifacts.require('./deposit/EthicHubDepositManager.sol');

const Uninitialized = 0;
const AcceptingContributions = 1;
const ExchangingToFiat = 2;
const AwaitingReturn = 3;
const ProjectNotFunded = 4;
const ContributionReturned = 5;
const Default = 6;

const ownerTruffle = web3.eth.accounts[0];
const localNode2 = web3.eth.accounts[1];
const borrower = web3.eth.accounts[2];
const localNode1 = web3.eth.accounts[3];
const ethichubTeam = web3.eth.accounts[4];
const investor1 = web3.eth.accounts[5];
const investor2 = web3.eth.accounts[6];
const investor3 = web3.eth.accounts[7];
const community = web3.eth.accounts[8];
const arbiter = web3.eth.accounts[9];
const paymentGateway = web3.eth.accounts[9];

async function deployedContracts(debug = false) {
    const instances = Promise.all([
        storage.deployed(),
        cmc.deployed(),
    ]);
    return instances;
}

before(async () => {
    depositManager = await EthicHubDepositManager.new()
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
});


contract('EthicHubIntegration:', function () {
    let instances;
    let storageInstance;

    before(async () => {
        instances = await deployedContracts();
        storageInstance = instances[0];
        userManagerInstance = instances[1];
        ownerUserManager = new userManagerInstance.owner();
    });

    it.skip('should pass if contract are on storage contract', async function () {
        let userManagerContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.name", "users"));
        userManagerContractAddress.should.be.equal(userManagerInstance.address);
    });

    it.skip('should register local node', async function () {
        await userManagerInstance.registerLocalNode(localNode1);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode1, 'localNode');
        registrationStatus.should.be.equal(true);
    });

    it.skip('should register community', async function () {
        await userManagerInstance.registerCommunity(community);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(community, 'community');
        registrationStatus.should.be.equal(true);
    });

    it.skip('should register investor', async function () {
        await userManagerInstance.registerInvestor(investor1);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(investor1, 'investor');
        registrationStatus.should.be.equal(true);
    });

    it.skip('should register representative', async function () {
        await userManagerInstance.registerRepresentative(borrower);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(borrower, 'representative');
        registrationStatus.should.be.equal(true);
    });

    it.skip('should register paymentGateway', async function () {
        await userManagerInstance.registerPaymentGateway(paymentGateway);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(paymentGateway, 'paymentGateway');
        registrationStatus.should.be.equal(true);
    });

    it.skip('change user status', async function () {
        await userManagerInstance.unregisterInvestor(investor1);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(investor1, 'investor');
        registrationStatus.should.be.equal(false);
        await userManagerInstance.registerInvestor(investor1);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(investor1, 'localNode');
        registrationStatus.should.be.equal(false);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(investor1, 'investor');
        registrationStatus.should.be.equal(true);
    });
});

contract('Integration: EthicHubLending (Lending owner != LocalNode)', function () {
    let instances;
    let storageInstance;
    let userManagerInstance;
    let lendingInstance;
    let ownerLending;
    let cmcInstance;

    before(async () => {
        await advanceBlock();
        instances = await deployedContracts();
        storageInstance = instances[0];
        userManagerInstance = instances[1];
        reputationInstance = instances[2];
        cmcInstance = instances[3];

        // register first LocalNode necessary on lending contract
        await userManagerInstance.registerLocalNode(localNode1);
        await userManagerInstance.registerRepresentative(borrower);
        lendingInstance = await lending.new(
            //Arguments
            latestTime() + duration.days(1), //_fundingStartTime
            latestTime() + duration.days(35), //_fundingEndTime
            ether(1), //_totalLendingAmount
            2, //_lendingDays
            3, //ethichub fee
            4, //localNode fee
            borrower, //_representative
            10, //_annualInterest
            storage.address, //_storageAddress
            localNode1,
            ethichubTeam,
        )
        await userManagerInstance.registerCommunity(community);
        //Gives set permissions on storage
        await cmcInstance.addNewLendingContract(lendingInstance.address);
        console.log("--> EthicHubLending deployed");
        //Lending saves parameters in storage, checks if owner is localNode
        await lendingInstance.saveInitialParametersToStorage(
            2, //maxDefaultDays
            20, //community members
            community //community rep wallet
        )
        ownerLending = await new lendingInstance.owner();
    });

    it.skip('should pass if contract are on storage contract', async function () {
        let lendingContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.address", lendingInstance.address));
        lendingContractAddress.should.be.equal(lendingInstance.address);
    });

    describe('The investment flow', function () {
        it.skip('investment reaches goal', async function () {
            await increaseTimeTo(latestTime() + duration.days(1));
            // Some initial parameters
            const initialEthPerFiatRate = 100;
            const finalEthPerFiatRate = 100;
            const investment1 = ether(0.985);
            const investment2 = ether(0.05);
            const investment3 = ether(1.5);
            const totalLendingAmount = await lendingInstance.totalLendingAmount();
            let transaction;

            // Register all actors
            transaction = await userManagerInstance.registerInvestor(investor1);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor1)', transaction.tx, true);
            transaction = await userManagerInstance.registerInvestor(investor2);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor2)', transaction.tx);
            transaction = await userManagerInstance.registerInvestor(investor3);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor3)', transaction.tx);

            // Is contribution period
            var isRunning = await lendingInstance.isContribPeriodRunning();
            isRunning.should.be.equal(true);

            //Send transaction
            transaction = await lendingInstance.sendTransaction({
                value: investment1,
                from: investor1
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'lendingInstance.sendTransaction', transaction.tx);
            const contribution1 = await lendingInstance.checkInvestorContribution(investor1);
            contribution1.should.be.bignumber.equal(investment1);
            transaction = await lendingInstance.sendTransaction({
                value: investment2,
                from: investor2
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'lendingInstance.sendTransaction', transaction.tx);
            const contribution2 = await lendingInstance.checkInvestorContribution(investor2);
            contribution2.should.be.bignumber.equal(totalLendingAmount - investment1);
            // Goal is reached, no accepts more invesments
            transaction = await lendingInstance.sendTransaction({
                value: investment3,
                from: investor3
            }).should.be.rejectedWith(EVMRevert);

            // Send funds to borrower
            transaction = await lendingInstance.sendFundsToBorrower({
                from: ownerLending
            }).should.be.fulfilled;

            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.sendFundsToBorrower', transaction.tx);
            transaction = await lendingInstance.finishInitialExchangingPeriod(initialEthPerFiatRate, {
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.finishInitialExchangingPeriod', transaction.tx);

            // Borrower return amount
            transaction = await lendingInstance.setBorrowerReturnEthPerFiatRate(finalEthPerFiatRate, {
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.setBorrowerReturnEthPerFiatRate', transaction.tx);

            // Show amounts to return
            const borrowerReturnAmount = await lendingInstance.borrowerReturnAmount();

            transaction = await lendingInstance.sendTransaction({
                value: borrowerReturnAmount,
                from: borrower
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'borrower', 'lendingInstance.returnBorrowedEth', transaction.tx);
            // Reclaims amounts
            transaction = await lendingInstance.reclaimContributionWithInterest(investor1, {
                from: investor1
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'lendingInstance.reclaimContributionWithInterest', transaction.tx);
            transaction = await lendingInstance.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'lendingInstance.reclaimContributionWithInterest', transaction.tx);
            transaction = await lendingInstance.reclaimLocalNodeFee().should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.reclaimLocalNodeFee', transaction.tx);
            transaction = await lendingInstance.reclaimEthicHubTeamFee().should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.reclaimEthicHubTeamFee', transaction.tx);
        });
    });
});

contract('Integration: EthicHubLending (Lending owner == LocalNode)', function () {
    let instances;
    let storageInstance;
    let userManagerInstance;
    let reputationInstance;
    let lendingInstance;
    let ownerLending;
    let cmcInstance;

    before(async () => {
        await advanceBlock();
        instances = await deployedContracts();
        storageInstance = instances[0];
        userManagerInstance = instances[1];
        reputationInstance = instances[2];
        cmcInstance = instances[3];
        // register first LocalNode necessary on lending contract
        await userManagerInstance.registerLocalNode(localNode2);
        await userManagerInstance.registerRepresentative(borrower);
        lendingInstance = await lending.new(
            //Arguments
            latestTime() + duration.days(1), //_fundingStartTime
            latestTime() + duration.days(35), //_fundingEndTime
            borrower, //_representative
            10, //_annualInterest
            ether(1), //_totalLendingAmount
            2, //_lendingDays
            storage.address, //_storageAddress
            localNode2,
            ethichubTeam,
            3, //ethichub fee
            4 //localNode fee

        )
        await userManagerInstance.registerCommunity(community);

        //Gives set permissions on storage
        await cmcInstance.addNewLendingContract(lendingInstance.address, {
            from: localNode2
        });
        console.log("--> EthicHubLending deployed");
        //Lending saves parameters in storage, checks if owner is localNode
        await lendingInstance.saveInitialParametersToStorage(
            2, //maxDefaultDays
            20, //community members
            community, //community rep wallet
            {
                from: localNode2
            }
        )
        ownerLending = await new lendingInstance.owner();
        //web3Contract = web3.eth.contract(lendingInstance.abi).at(lendingInstance.address);
        //ownerLending = web3Contract._eth.coinbase;
    });

    it.skip('should pass if contract are on storage contract', async function () {
        let lendingContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.address", lendingInstance.address));
        lendingContractAddress.should.be.equal(lendingInstance.address);
    });

    describe('The investment flow', function () {
        it.skip('investment reaches goal', async function () {
            await increaseTimeTo(latestTime() + duration.days(1));
            // Some initial parameters
            const initialEthPerFiatRate = 100;
            const finalEthPerFiatRate = 100;
            const investment1 = ether(0.5);
            const investment2 = ether(0.5);
            const investment3 = ether(1.5);
            let transaction;

            // Register all actors
            transaction = await userManagerInstance.registerInvestor(investor1);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor1)', transaction.tx, true);
            transaction = await userManagerInstance.registerInvestor(investor2);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor2)', transaction.tx);
            transaction = await userManagerInstance.registerInvestor(investor3);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor3)', transaction.tx);
            // Unnecessary the migration register LocalNode and Community
            //transaction = await userManagerInstance.registerLocalNode(localNode2);
            //reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerLocalNode(localNode2)', transaction.tx);
            //transaction = await userManagerInstance.registerCommunity(community);
            //reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerCommunity(community)', transaction.tx);

            // Show balances
            //console.log('=== INITIAL ===');
            //await traceBalancesAllActors();
            // Init Reputation
            const initialCommunityReputation = await reputationInstance.getCommunityReputation(community).should.be.fulfilled;
            const initialLocalNodeReputation = await reputationInstance.getLocalNodeReputation(localNode2).should.be.fulfilled;

            // Is contribution period
            var isRunning = await lendingInstance.isContribPeriodRunning();
            isRunning.should.be.equal(true);

            // Investment part
            //Raw transaction in truffle develop. CAUTION the private key is from truffle
            //await rawTransaction(investor1, privateKeys[5], lendingInstance.address, '', investment1).should.be.fulfilled;
            //Send transaction
            transaction = await lendingInstance.sendTransaction({
                value: investment1,
                from: investor1
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'lendingInstance.sendTransaction', transaction.tx);
            const contribution1 = await lendingInstance.checkInvestorContribution(investor1);
            contribution1.should.be.bignumber.equal(investment1);
            transaction = await lendingInstance.sendTransaction({
                value: investment2,
                from: investor2
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'lendingInstance.sendTransaction', transaction.tx);
            const contribution2 = await lendingInstance.checkInvestorContribution(investor2);
            contribution2.should.be.bignumber.equal(investment2);
            // Goal is reached, no accepts more invesments
            transaction = await lendingInstance.sendTransaction({
                value: investment3,
                from: investor3
            }).should.be.rejectedWith(EVMRevert);
            //reportMethodGasUsed('report', 'investor3', 'lendingInstance.sendTransaction', transaction.tx);

            // Send funds to borrower
            transaction = await lendingInstance.sendFundsToBorrower({
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.sendFundsToBorrower', transaction.tx);
            transaction = await lendingInstance.finishInitialExchangingPeriod(initialEthPerFiatRate, {
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.finishInitialExchangingPeriod', transaction.tx);

            // Borrower return amount
            transaction = await lendingInstance.setBorrowerReturnEthPerFiatRate(finalEthPerFiatRate, {
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.setBorrowerReturnEthPerFiatRate', transaction.tx);
            // Show balances
            //console.log('=== MIDDLE ===');
            //await traceBalancesAllActors();
            // Show amounts to return
            const borrowerReturnAmount = await lendingInstance.borrowerReturnAmount();
            //console.log('Community return amount (ETH):' + utils.fromWei(utils.toBN(borrowerReturnAmount)));
            //const borrowerReturnFiatAmount = await lendingInstance.borrowerReturnFiatAmount();
            //console.log('Community return amount (pesos):' + utils.fromWei(utils.toBN(borrowerReturnFiatAmount)));
            transaction = await lendingInstance.sendTransaction({
                value: borrowerReturnAmount,
                from: borrower
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'borrower', 'lendingInstance.returnBorrowedEth', transaction.tx);
            // Reclaims amounts
            transaction = await lendingInstance.reclaimContributionWithInterest(investor1, {
                from: investor1
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'lendingInstance.reclaimContributionWithInterest', transaction.tx);
            transaction = await lendingInstance.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'lendingInstance.reclaimContributionWithInterest', transaction.tx);
            transaction = await lendingInstance.reclaimLocalNodeFee().should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.reclaimLocalNodeFee', transaction.tx);
            transaction = await lendingInstance.reclaimEthicHubTeamFee().should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.reclaimEthicHubTeamFee', transaction.tx);

            // Show balances
            //console.log('=== FINISH ===');
            //await traceBalancesAllActors();
        });
    });
});

contract('Integration: EthicHubLending (LocalNode not exists)', function () {
    let instances;
    let storageInstance;
    let userManagerInstance;
    let reputationInstance;
    let lendingInstance;
    let ownerLending;
    let cmcInstance;

    describe('Local Node != Local Node of lending contract', function () {
        it.skip('should not deploy contract', async function () {
            await advanceBlock();
            instances = await deployedContracts();
            storageInstance = instances[0];
            userManagerInstance = instances[1];
            reputationInstance = instances[2];
            cmcInstance = instances[3];
            // register first LocalNode necessary on lending contract
            await userManagerInstance.registerLocalNode(localNode1);
            await userManagerInstance.registerRepresentative(borrower);
            lendingInstance = await lending.new(
                //Arguments
                latestTime() + duration.days(1), //_fundingStartTime
                latestTime() + duration.days(35), //_fundingEndTime
                borrower, //_representative
                10, //_annualInterest
                ether(1), //_totalLendingAmount
                2, //_lendingDays
                storage.address, //_storageAddress
                localNode1,
                ethichubTeam,
                3, //ethichub fee
                4 //localNode fee
            )
            await userManagerInstance.registerCommunity(community);
            //Gives set permissions on storage
            await cmcInstance.addNewLendingContract(lendingInstance.address, {
                from: localNode2
            }).should.be.rejectedWith(EVMRevert)
            console.log("--> EthicHubLending deployed");
            //Lending saves parameters in storage, checks if owner is localNode
            await lendingInstance.saveInitialParametersToStorage(
                2, //maxDefaultDays
                20, //community members
                community, //community rep wallet
                {
                    from: localNode2
                }
            ).should.be.rejectedWith(EVMRevert);
            ownerLending = await new lendingInstance.owner();
            //web3Contract = web3.eth.contract(lendingInstance.abi).at(lendingInstance.address);
            //ownerLending = web3Contract._eth.coinbase;
        });
    });
});

contract('Integration: EthicHubLending not funded', function () {
    let instances;
    let storageInstance;
    let lendingInstance;
    let ownerLending = ownerTruffle;
    let userManagerInstance;
    let reputationInstance;
    //let web3Contract;
    let cmcInstance;
    before(async () => {
        instances = await deployedContracts();
        storageInstance = instances[0];
        userManagerInstance = instances[1];
        reputationInstance = instances[2];
        cmcInstance = instances[3];
        // register first LocalNode necessary on lending contract
        await userManagerInstance.registerLocalNode(localNode1);
        await userManagerInstance.registerRepresentative(borrower);
        lendingInstance = await lending.new(
            //Arguments
            latestTime() + duration.days(1), //_fundingStartTime
            latestTime() + duration.days(35), //_fundingEndTime
            borrower, //_representative
            10, //_annualInterest
            ether(10), //_totalLendingAmount
            2, //_lendingDays
            storage.address, //_storageAddress
            localNode1,
            ethichubTeam,
            3, //ethichub fee
            4 //localNode fee
        )
        await userManagerInstance.registerCommunity(community);
        await userManagerInstance.registerRepresentative(borrower);
        //Gives set permissions on storage
        await cmcInstance.addNewLendingContract(lendingInstance.address);
        console.log("--> EthicHubLending deployed");
        //Lending saves parameters in storage, checks if owner is localNode
        await lendingInstance.saveInitialParametersToStorage(
            2, //maxDefaultDays
            20, //community members
            community //community rep wallet
        )
        ownerLending = await new lendingInstance.owner();
        //web3Contract = web3.eth.contract(lendingInstance.abi).at(lendingInstance.address);
        //ownerLending = web3Contract._eth.coinbase;
    });
    it.skip('should pass if contract are on storage contract', async function () {
        let lendingContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.address", lendingInstance.address));
        lendingContractAddress.should.be.equal(lendingInstance.address);
    });
    describe('The investment flow', function () {
        it.skip('investment not funded', async function () {
            await increaseTimeTo(latestTime() + duration.days(1));
            // Some initial parameters
            const initialEthPerFiatRate = 100;
            const finalEthPerFiatRate = 100;
            const investment1 = ether(2);
            const investment2 = ether(2);
            let transaction;

            // Register all actors
            transaction = await userManagerInstance.registerInvestor(investor1);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor1)', transaction.tx, true);
            transaction = await userManagerInstance.registerInvestor(investor2);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor2)', transaction.tx);
            transaction = await userManagerInstance.registerInvestor(investor3);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor3)', transaction.tx);

            // Show balances
            //console.log('=== INITIAL ===');
            //await traceBalancesAllActors();
            // Init Reputation
            const initialCommunityReputation = await reputationInstance.getCommunityReputation(community).should.be.fulfilled;
            const initialLocalNodeReputation = await reputationInstance.getLocalNodeReputation(localNode1).should.be.fulfilled;

            // Is contribution period
            var isRunning = await lendingInstance.isContribPeriodRunning();
            isRunning.should.be.equal(true);

            // Investment part
            //Raw transaction in truffle develop. CAUTION the private key is from truffle
            //await rawTransaction(investor1, privateKeys[5], lendingInstance.address, '', investment1).should.be.fulfilled;
            //Send transaction
            transaction = await lendingInstance.sendTransaction({
                value: investment1,
                from: investor1
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'lendingInstance.sendTransaction', transaction.tx);
            const contribution1 = await lendingInstance.checkInvestorContribution(investor1);
            contribution1.should.be.bignumber.equal(investment1);
            transaction = await lendingInstance.sendTransaction({
                value: investment2,
                from: investor2
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'lendingInstance.sendTransaction', transaction.tx);
            const contribution2 = await lendingInstance.checkInvestorContribution(investor2);
            contribution2.should.be.bignumber.equal(investment2);

            const endTime = await lendingInstance.fundingEndTime()
            await increaseTimeTo(endTime + duration.days(1));

            // Send funds to borrower
            transaction = await lendingInstance.sendFundsToBorrower({
                from: ownerLending
            }).should.be.rejectedWith(EVMRevert);
            //reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.sendFundsToBorrower', transaction.tx);

            // project not funded
            await lendingInstance.declareProjectNotFunded({
                from: ownerLending
            })
            var state = await lendingInstance.state();
            state.toNumber().should.be.equal(ProjectNotFunded);
            var balance = web3.eth.getBalance(lendingInstance.address);
            balance.toNumber().should.be.equal(ether(4).toNumber());
            // can reclaim contribution from everyone
            balance = web3.eth.getBalance(investor1);
            await lendingInstance.reclaimContribution(investor1).should.be.fulfilled;
            // 0.1 eth less due to used gas
            new BigNumber(await web3.eth.getBalance(investor1)).should.be.bignumber.above(new BigNumber(balance).add(ether(0.9).toNumber()));
            // fail to reclaim from no investor
            await lendingInstance.reclaimContribution(investor3).should.be.rejectedWith(EVMRevert);

            // Show balances
            //console.log('=== FINISH ===');
            //await traceBalancesAllActors();

        });
    });
});


contract('Integration: EthicHubLending not returned on time', function () {
    let instances;
    let storageInstance;
    let lendingInstance;
    let ownerLending = ownerTruffle;
    let userManagerInstance;
    let reputationInstance;
    let cmcInstance;
    let lendingStartTime;

    before(async () => {
        await advanceBlock();
        instances = await deployedContracts();
        storageInstance = instances[0];
        userManagerInstance = instances[1];
        reputationInstance = instances[2];
        cmcInstance = instances[3];
        lendingStartTime = latestTime() + duration.days(1);
        // register first LocalNode necessary on lending contract
        await userManagerInstance.registerLocalNode(localNode1);
        await userManagerInstance.registerRepresentative(borrower);
        lendingInstance = await lending.new(
            //Arguments
            lendingStartTime, //_fundingStartTime
            latestTime() + duration.days(35), //_fundingEndTime
            borrower, //_representative
            10, //_annualInterest
            ether(4), //_totalLendingAmount
            2, //_lendingDays
            storage.address, //_storageAddress
            localNode1,
            ethichubTeam,
            3, //ethichub fee
            4 //localNode fee
        )
        await userManagerInstance.registerCommunity(community);

        //Gives set permissions on storage
        await cmcInstance.addNewLendingContract(lendingInstance.address);
        console.log("--> EthicHubLending deployed");
        //Lending saves parameters in storage, checks if owner is localNode
        await lendingInstance.saveInitialParametersToStorage(
            2, //maxDefaultDays
            20, //community members
            community //community rep wallet
        )
        ownerLending = await new lendingInstance.owner();
        //web3Contract = web3.eth.contract(lendingInstance.abi).at(lendingInstance.address);
        //ownerLending = web3Contract._eth.coinbase;
    });
    it.skip('should pass if contract are on storage contract', async function () {
        let lendingContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.address", lendingInstance.address));
        lendingContractAddress.should.be.equal(lendingInstance.address);
    });
    describe('The investment flow', function () {
        it.skip('investment not returned on time', async function () {
            await increaseTimeTo(latestTime() + duration.days(1));
            await advanceBlock();
            // Some initial parameters
            const initialEthPerFiatRate = 100;
            const finalEthPerFiatRate = 100;
            const investment1 = ether(2);
            const investment2 = ether(2);
            const investment3 = ether(1.5);
            const delayDays = 2;
            let transaction;

            // Register all actors
            transaction = await userManagerInstance.registerInvestor(investor1);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor1)', transaction.tx, true);
            transaction = await userManagerInstance.registerInvestor(investor2);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor2)', transaction.tx);
            transaction = await userManagerInstance.registerInvestor(investor3);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor3)', transaction.tx);

            // Show balances
            //console.log('=== INITIAL ===');
            //await traceBalancesAllActors();
            // Init Reputation
            const initialCommunityReputation = await reputationInstance.getCommunityReputation(community).should.be.fulfilled;
            const initialLocalNodeReputation = await reputationInstance.getLocalNodeReputation(localNode1).should.be.fulfilled;

            await increaseTimeTo(lendingStartTime + duration.minutes(100));
            await advanceBlock();

            // Is contribution period
            var isRunning = await lendingInstance.isContribPeriodRunning();
            isRunning.should.be.equal(true);

            // Investment part
            //Raw transaction in truffle develop. CAUTION the private key is from truffle
            //await rawTransaction(investor1, privateKeys[5], lendingInstance.address, '', investment1).should.be.fulfilled;
            //Send transaction
            transaction = await lendingInstance.sendTransaction({
                value: investment1,
                from: investor1
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'lendingInstance.sendTransaction', transaction.tx);
            const contribution1 = await lendingInstance.checkInvestorContribution(investor1);
            contribution1.should.be.bignumber.equal(investment1);
            transaction = await lendingInstance.sendTransaction({
                value: investment2,
                from: investor2
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'lendingInstance.sendTransaction', transaction.tx);
            const contribution2 = await lendingInstance.checkInvestorContribution(investor2);
            contribution2.should.be.bignumber.equal(investment2);
            // Goal is reached, no accepts more invesments
            transaction = await lendingInstance.sendTransaction({
                value: investment3,
                from: investor3
            }).should.be.rejectedWith(EVMRevert);
            //reportMethodGasUsed('report', 'investor3', 'lendingInstance.sendTransaction', transaction.tx);

            const fundingEndTime = await lendingInstance.fundingEndTime()
            await increaseTimeTo(fundingEndTime.add(duration.minutes(1)));
            await advanceBlock();

            // Send funds to borrower
            transaction = await lendingInstance.sendFundsToBorrower({
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.sendFundsToBorrower', transaction.tx);
            transaction = await lendingInstance.finishInitialExchangingPeriod(initialEthPerFiatRate, {
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.finishInitialExchangingPeriod', transaction.tx);

            // Borrower return amount
            transaction = await lendingInstance.setBorrowerReturnEthPerFiatRate(finalEthPerFiatRate, {
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.setBorrowerReturnEthPerFiatRate', transaction.tx);
            // Show balances
            //console.log('=== MIDDLE ===');
            //await traceBalancesAllActors();

            //delay to 1 of 2 default days
            var defaultTime = fundingEndTime.add(duration.days(3));
            await increaseTimeTo(defaultTime);
            await advanceBlock();

            const borrowerReturnAmount = await lendingInstance.borrowerReturnAmount();
            transaction = await lendingInstance.sendTransaction({
                value: borrowerReturnAmount,
                from: borrower
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'borrower', 'lendingInstance.sendTransaction', transaction.tx);

            await lendingInstance.declareProjectDefault({
                from: ownerLending
            }).should.be.rejectedWith(EVMRevert);

            var lendingDelayDays = await storageInstance.getUint(utils.soliditySha3("lending.delayDays", lendingInstance.address));
            lendingDelayDays.toNumber().should.be.equal(1);

            // Show balances
            //console.log('=== FINISH ===');
            //await traceBalancesAllActors();            
        });
    });
});

contract('Integration: EthicHubLending declare default', function () {
    let instances;
    let storageInstance;
    let lendingInstance;
    let ownerLending = ownerTruffle;
    let userManagerInstance;
    let reputationInstance;
    let cmcInstance;
    let lendingStartTime;

    before(async () => {
        await advanceBlock();
        instances = await deployedContracts();
        storageInstance = instances[0];
        userManagerInstance = instances[1];
        reputationInstance = instances[2];
        cmcInstance = instances[3];
        lendingStartTime = latestTime() + duration.days(1);
        // register first LocalNode necessary on lending contract
        await userManagerInstance.registerLocalNode(localNode1);
        await userManagerInstance.registerRepresentative(borrower);
        lendingInstance = await lending.new(
            //Arguments
            lendingStartTime, //_fundingStartTime
            latestTime() + duration.days(35), //_fundingEndTime
            borrower, //_representative
            10, //_annualInterest
            ether(4), //_totalLendingAmount
            2, //_lendingDays
            storage.address, //_storageAddress
            localNode1,
            ethichubTeam,
            3, //ethichub fee
            4 //localNode fee
        )
        await userManagerInstance.registerCommunity(community);
        //Gives set permissions on storage
        await cmcInstance.addNewLendingContract(lendingInstance.address);
        console.log("--> EthicHubLending deployed");
        //Lending saves parameters in storage, checks if owner is localNode
        await lendingInstance.saveInitialParametersToStorage(
            2, //maxDefaultDays
            20, //community members
            community //community rep wallet
        )
        ownerLending = await new lendingInstance.owner();
    });

    it.skip('should pass if contract are on storage contract', async function () {
        let lendingContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.address", lendingInstance.address));
        lendingContractAddress.should.be.equal(lendingInstance.address);
    });

    describe('The investment flow', function () {
        it.skip('declared project default', async function () {
            await increaseTimeTo(latestTime() + duration.days(1));
            await advanceBlock();
            // Some initial parameters
            const initialEthPerFiatRate = 100;
            const finalEthPerFiatRate = 100;
            const investment1 = ether(2);
            const investment2 = ether(2);
            const investment3 = ether(1.5);
            const delayDays = 2;
            let transaction;

            // Register all actors
            transaction = await userManagerInstance.registerInvestor(investor1);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor1)', transaction.tx, true);
            transaction = await userManagerInstance.registerInvestor(investor2);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor2)', transaction.tx);
            transaction = await userManagerInstance.registerInvestor(investor3);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor3)', transaction.tx);

            // Show balances
            //console.log('=== INITIAL ===');
            //await traceBalancesAllActors();
            // Init Reputation
            const initialCommunityReputation = await reputationInstance.getCommunityReputation(community).should.be.fulfilled;
            const initialLocalNodeReputation = await reputationInstance.getLocalNodeReputation(localNode1).should.be.fulfilled;

            await increaseTimeTo(lendingStartTime + duration.minutes(100));
            await advanceBlock();

            // Is contribution period
            var isRunning = await lendingInstance.isContribPeriodRunning();
            isRunning.should.be.equal(true);

            // Investment part
            //Raw transaction in truffle develop. CAUTION the private key is from truffle
            //await rawTransaction(investor1, privateKeys[5], lendingInstance.address, '', investment1).should.be.fulfilled;
            //Send transaction
            transaction = await lendingInstance.sendTransaction({
                value: investment1,
                from: investor1
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'lendingInstance.sendTransaction', transaction.tx);
            const contribution1 = await lendingInstance.checkInvestorContribution(investor1);
            contribution1.should.be.bignumber.equal(investment1);
            transaction = await lendingInstance.sendTransaction({
                value: investment2,
                from: investor2
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'lendingInstance.sendTransaction', transaction.tx);
            const contribution2 = await lendingInstance.checkInvestorContribution(investor2);
            contribution2.should.be.bignumber.equal(investment2);
            // Goal is reached, no accepts more invesments
            transaction = await lendingInstance.sendTransaction({
                value: investment3,
                from: investor3
            }).should.be.rejectedWith(EVMRevert);

            const fundingEndTime = await lendingInstance.fundingEndTime()
            await increaseTimeTo(fundingEndTime.add(duration.minutes(1)));

            // Send funds to borrower
            transaction = await lendingInstance.sendFundsToBorrower({
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.sendFundsToBorrower', transaction.tx);
            transaction = await lendingInstance.finishInitialExchangingPeriod(initialEthPerFiatRate, {
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.finishInitialExchangingPeriod', transaction.tx);

            // Borrower return amount
            transaction = await lendingInstance.setBorrowerReturnEthPerFiatRate(finalEthPerFiatRate, {
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.setBorrowerReturnEthPerFiatRate', transaction.tx);
            // Show balances
            //console.log('=== MIDDLE ===');
            //await traceBalancesAllActors();

            //This should be the edge case : end of funding time + awaiting for return period.
            var defaultTime = fundingEndTime.add(duration.days(4)).add(duration.days(1));
            await increaseTimeTo(defaultTime);

            await lendingInstance.declareProjectDefault({
                from: ownerLending
            }).should.be.fulfilled;
            const borrowerReturnAmount = await lendingInstance.borrowerReturnAmount();
            transaction = await lendingInstance.sendTransaction({
                value: borrowerReturnAmount,
                from: borrower
            }).should.be.rejectedWith(EVMRevert);
            //reportMethodGasUsed('report', 'borrower', 'lendingInstance.sendTransaction', transaction.tx);

            var lendingDelayDays = await storageInstance.getUint(utils.soliditySha3("lending.delayDays", lendingInstance.address));
            lendingDelayDays.toNumber().should.be.equal(2);

            // Show balances
            //console.log('=== FINISH ===');
            //await traceBalancesAllActors();

        });
    });
});

contract('Integration: EthicHubLending do a payment with paymentGateway', function () {
    let instances;
    let storageInstance;
    let userManagerInstance;
    let reputationInstance;
    let lendingInstance;
    let ownerLending;
    //let web3Contract;
    let cmcInstance;
    before(async () => {
        await advanceBlock();
        instances = await deployedContracts();
        storageInstance = instances[0];
        userManagerInstance = instances[1];
        reputationInstance = instances[2];
        cmcInstance = instances[3];
        // register first LocalNode necessary on lending contract
        await userManagerInstance.registerLocalNode(localNode1);
        await userManagerInstance.registerRepresentative(borrower);
        lendingInstance = await lending.new(
            //Arguments
            latestTime() + duration.days(1), //_fundingStartTime
            latestTime() + duration.days(35), //_fundingEndTime
            borrower, //_representative
            10, //_annualInterest
            ether(1), //_totalLendingAmount
            2, //_lendingDays
            storage.address, //_storageAddress
            localNode1,
            ethichubTeam,
            3, //ethichub fee
            4 //localNode fee
        )
        await userManagerInstance.registerCommunity(community);
        //Gives set permissions on storage
        await cmcInstance.addNewLendingContract(lendingInstance.address);
        console.log("--> EthicHubLending deployed");
        //Lending saves parameters in storage, checks if owner is localNode
        await lendingInstance.saveInitialParametersToStorage(
            2, //maxDefaultDays
            20, //community members
            community //community rep wallet
        )
        ownerLending = await new lendingInstance.owner();
        //web3Contract = web3.eth.contract(lendingInstance.abi).at(lendingInstance.address);
        //ownerLending = web3Contract._eth.coinbase;
    });
    it.skip('should pass if contract are on storage contract', async function () {
        let lendingContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.address", lendingInstance.address));
        lendingContractAddress.should.be.equal(lendingInstance.address);
    });
    describe('The investment flow', function () {
        it.skip('investment reaches goal', async function () {
            await increaseTimeTo(latestTime() + duration.days(1));
            // Some initial parameters
            const initialEthPerFiatRate = 100;
            const finalEthPerFiatRate = 100;
            const investment1 = ether(0.5);
            const investment2 = ether(0.5);
            const investment3 = ether(1.5);
            let transaction;

            // Register all actors
            transaction = await userManagerInstance.registerPaymentGateway(paymentGateway);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerPaymentGateway(paymentGateway)', transaction.tx, true);
            transaction = await userManagerInstance.registerInvestor(investor1);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor1)', transaction.tx, true);
            transaction = await userManagerInstance.registerInvestor(investor2);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor2)', transaction.tx);
            transaction = await userManagerInstance.registerInvestor(investor3);
            reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerInvestor(investor3)', transaction.tx);
            // Unnecessary the migration register LocalNode and Community
            //transaction = await userManagerInstance.registerLocalNode(localNode1);
            //reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerLocalNode(localNode1)', transaction.tx);
            //transaction = await userManagerInstance.registerCommunity(community);
            //reportMethodGasUsed('report', 'ownerUserManager', 'userManagerInstance.registerCommunity(community)', transaction.tx);

            // Show balances
            //console.log('=== INITIAL ===');
            //await traceBalancesAllActors();
            // Init Reputation
            const initialCommunityReputation = await reputationInstance.getCommunityReputation(community).should.be.fulfilled;
            const initialLocalNodeReputation = await reputationInstance.getLocalNodeReputation(localNode1).should.be.fulfilled;

            // Is contribution period
            var isRunning = await lendingInstance.isContribPeriodRunning();
            isRunning.should.be.equal(true);

            // Investment part
            //Raw transaction in truffle develop. CAUTION the private key is from truffle
            //await rawTransaction(investor1, privateKeys[5], lendingInstance.address, '', investment1).should.be.fulfilled;
            //Send transaction
            transaction = await lendingInstance.contributeForAddress(investor1, {
                value: investment1,
                from: paymentGateway
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'lendingInstance.contributeForAddress', transaction.tx);
            const contribution1 = await lendingInstance.checkInvestorContribution(investor1);
            contribution1.should.be.bignumber.equal(investment1);
            transaction = await lendingInstance.sendTransaction({
                value: investment2,
                from: investor2
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'lendingInstance.sendTransaction', transaction.tx);
            const contribution2 = await lendingInstance.checkInvestorContribution(investor2);
            contribution2.should.be.bignumber.equal(investment2);
            // Goal is reached, no accepts more invesments
            transaction = await lendingInstance.sendTransaction({
                value: investment3,
                from: investor3
            }).should.be.rejectedWith(EVMRevert);
            //reportMethodGasUsed('report', 'investor3', 'lendingInstance.sendTransaction', transaction.tx);

            // Send funds to borrower
            transaction = await lendingInstance.sendFundsToBorrower({
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.sendFundsToBorrower', transaction.tx);
            transaction = await lendingInstance.finishInitialExchangingPeriod(initialEthPerFiatRate, {
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.finishInitialExchangingPeriod', transaction.tx);

            // Borrower return amount
            transaction = await lendingInstance.setBorrowerReturnEthPerFiatRate(finalEthPerFiatRate, {
                from: ownerLending
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.setBorrowerReturnEthPerFiatRate', transaction.tx);
            // Show balances
            //console.log('=== MIDDLE ===');
            //await traceBalancesAllActors();
            // Show amounts to return
            const borrowerReturnAmount = await lendingInstance.borrowerReturnAmount();
            //console.log('Community return amount (ETH):' + utils.fromWei(utils.toBN(borrowerReturnAmount)));
            //const borrowerReturnFiatAmount = await lendingInstance.borrowerReturnFiatAmount();
            //console.log('Community return amount (pesos):' + utils.fromWei(utils.toBN(borrowerReturnFiatAmount)));
            transaction = await lendingInstance.sendTransaction({
                value: borrowerReturnAmount,
                from: borrower
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'borrower', 'lendingInstance.returnBorrowedEth', transaction.tx);
            // Reclaims amounts
            transaction = await lendingInstance.reclaimContributionWithInterest(investor1, {
                from: investor1
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor1', 'lendingInstance.reclaimContributionWithInterest', transaction.tx);
            transaction = await lendingInstance.reclaimContributionWithInterest(investor2, {
                from: investor2
            }).should.be.fulfilled;
            reportMethodGasUsed('report', 'investor2', 'lendingInstance.reclaimContributionWithInterest', transaction.tx);
            transaction = await lendingInstance.reclaimLocalNodeFee().should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.reclaimLocalNodeFee', transaction.tx);
            transaction = await lendingInstance.reclaimEthicHubTeamFee().should.be.fulfilled;
            reportMethodGasUsed('report', 'ownerLending', 'lendingInstance.reclaimEthicHubTeamFee', transaction.tx);

            // Show balances
            //console.log('=== FINISH ===');
            //await traceBalancesAllActors();
        });
    });
});

function reportMethodGasUsed(filename, role, methodName, txHash, remove = false) {
    if (remove)
        fs.openSync(filename + '.csv', 'w');
    const gasUsed = web3.eth.getTransactionReceipt(txHash).gasUsed;
    fs.appendFileSync(filename + '.csv', role + ',' + methodName + ',' + gasUsed + '\n');
}