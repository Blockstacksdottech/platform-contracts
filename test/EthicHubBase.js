'use strict';

const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const {
    BN,
    time
} = require('@openzeppelin/test-helpers');

const chain = require('chai');

chain.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()


const MockStorage = contract.fromArtifact('MockStorage')
const MockEthicHubContract = contract.fromArtifact('MockEthicHubContract')

describe('EthicHubBase', function() {
    beforeEach(async function() {
        await time.advanceBlock();
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