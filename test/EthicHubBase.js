'use strict';
import {
    advanceBlock
} from './helpers/advanceToBlock'

const {
    BN
} = require('@openzeppelin/test-helpers');

const chain = require('chai');

chain.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()


const MockStorage = artifacts.require('./helper_contracts/MockStorage.sol')
const MockEthicHubContract = artifacts.require('./helper_contracts/MockEthicHubContract.sol')

contract('EthicHubBase', function(accounts) {
    beforeEach(async function() {
        await advanceBlock();
        this.mockStorage = await MockStorage.new();
    });

    describe('Storage setting', function() {
        it('should set correct address', async function() {
            const ethicHubContract = await MockEthicHubContract.new(this.mockStorage.address, 1);
            const storageAddress = await ethicHubContract.getStorageAddress();
            storageAddress.should.be.equal(this.mockStorage.address);
        });

        it('should set correct version', async function() {
            const ethicHubContract = await MockEthicHubContract.new(this.mockStorage.address, 3);
            const version = await ethicHubContract.version();
            version.should.be.bignumber.equal(new BN(3));
        });
    });
});