'use strict'
const {
    accounts,
    contract,
    web3
} = require('@openzeppelin/test-environment')
const {
    BN,
    time,
    expectEvent,
    expectRevert
} = require('@openzeppelin/test-helpers')


const MockStorage = contract.fromArtifact('MockStorage')
const MockEthicHubContract = contract.fromArtifact('MockEthicHubContract')

describe('EthicHubBase', function () {
    const [owner] = accounts
    let mockStorage
    beforeEach(async function() {
        await time.advanceBlock()
        mockStorage = await MockStorage.new({ from: owner })
    })

    describe('Storage setting', function() {
        it('should set correct address', async function() {
            const ethicHubContract = await MockEthicHubContract.new(mockStorage.address, 1, {
                from: owner
            })
            expect(await ethicHubContract.getStorageAddress()).toEqual(mockStorage.address)
        })

        it('should set correct version', async function() {
            const ethicHubContract = await MockEthicHubContract.new(mockStorage.address, 3, {
                from: owner
            })
            const result = await ethicHubContract.version()
            expect(result.toString()).toEqual("3")
        })
    })
})