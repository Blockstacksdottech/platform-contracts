/*
    Test of smart contract of a Whitelisted Accounts.

    Copyright (C) 2018 EthicHub

    This file is part of platform contracts.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';
const { accounts, contract, web3 } = require('@openzeppelin/test-environment');

const {
    BN,
    time,
    expectRevert
} = require('@openzeppelin/test-helpers');

const utils = require("web3-utils");

const User = contract.fromArtifact('EthicHubUser');
const Storage = contract.fromArtifact('EthicHubStorage');
const EthicHubCMC = contract.fromArtifact('EthicHubCMC');

describe('User', function() {

    const [owner, localNode, investor, community, representative, paymentGateway] = accounts
    let storage
    let cmc
    let users
    
    describe('whitelisted accounts', function() {
        beforeEach(async function() {
            await time.advanceBlock();
            storage = await Storage.new();
            cmc = await EthicHubCMC.new(storage.address)
            await storage.setAddress(utils.soliditySha3("contract.address", cmc.address), cmc.address)
            await storage.setAddress(utils.soliditySha3("contract.name", 'cmc'), cmc.address)
            users = await User.new(storage.address, {
                from: owner
            });

            await cmc.upgradeContract(users.address, 'users')
        });

        it('onlyOwner can change status', async function() {
            let prof = "localNode";
            expect(await users.viewRegistrationStatus(localNode, prof)).toEqual(false)
            // expectRevert(await users.registerLocalNode(localNode, {
            //     from: owner
            // }))
            // expect(await users.viewRegistrationStatus(localNode, prof)).toEqual(false)
        });

        it('register/unregister localNode', async function() {
            let prof = "localNode";
            expect(await users.viewRegistrationStatus(localNode, prof)).toEqual(false)
            await users.registerLocalNode(localNode, {
                from: owner
            })
            expect(await users.viewRegistrationStatus(localNode, prof)).toEqual(true)
            await users.unregisterLocalNode(localNode, {
                from: owner
            })
            expect(await users.viewRegistrationStatus(localNode, prof)).toEqual(false)
        });

        it('register/unregister community', async function() {
            let prof = "community";
            expect(await users.viewRegistrationStatus(community, prof)).toEqual(false)
            await users.registerCommunity(community, {
                from: owner
            })
            expect(await users.viewRegistrationStatus(community, prof)).toEqual(true)
            await users.unregisterCommunity(community, {
                from: owner
            })
            expect(await users.viewRegistrationStatus(community, prof)).toEqual(false)
        });

        it('register/unregister investor', async function() {
            let prof = "investor";
            expect(await users.viewRegistrationStatus(investor, prof)).toEqual(false)
            await users.registerInvestor(investor, {
                from: owner
            })
            expect(await users.viewRegistrationStatus(investor, prof)).toEqual(true)
            await users.unregisterInvestor(investor, {
                from: owner
            })
            expect(await users.viewRegistrationStatus(investor, prof)).toEqual(false)
        });

        it('register/unregister representative', async function() {
            let prof = "representative";
            expect(await users.viewRegistrationStatus(representative, prof)).toEqual(false)
            await users.registerRepresentative(representative, {
                from: owner
            })
            expect(await users.viewRegistrationStatus(representative, prof)).toEqual(true)
            await users.unregisterRepresentative(representative, {
                from: owner
            })
            expect(await users.viewRegistrationStatus(representative, prof)).toEqual(false)
        });

        it('register/unregister paymentGateway', async function() {
            let prof = "paymentGateway";
            expect(await users.viewRegistrationStatus(paymentGateway, prof)).toEqual(false)
            await users.registerPaymentGateway(paymentGateway, {
                from: owner
            })
            expect(await users.viewRegistrationStatus(paymentGateway, prof)).toEqual(true)
            await users.unregisterPaymentGateway(paymentGateway, {
                from: owner
            })
            expect(await users.viewRegistrationStatus(paymentGateway, prof)).toEqual(false)
        });
    });
});