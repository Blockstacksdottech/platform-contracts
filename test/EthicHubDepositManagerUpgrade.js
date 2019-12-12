const {
    TestHelper
} = require('@openzeppelin/cli')
const {
    Contracts,
    ZWeb3
} = require('@openzeppelin/upgrades')
const {
    GSNDevProvider
} = require('@openzeppelin/gsn-provider')


// let provider = new GSNDevProvider('http://localhost:8545', {
//             txfee: 70,
//             useGSN: false,
//             // The last two accounts defined in test.sh
//             ownerAddress: '0x26be9c03ca7f61ad3d716253ee1edcae22734698',
//             relayerAddress: '0xbB49ad04422F9FA6a217f3Ed82261B942f6981f7',
// })


ZWeb3.initialize(web3.currentProvider)

const EthicHubDepositManager = Contracts.getFromLocal('EthicHubDepositManager')

const {
    BN
} = require('@openzeppelin/test-helpers')

const chai = require('chai')

chai.use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should()

const MockStorage = artifacts.require('MockStorage')
const MockStableCoin = artifacts.require('MockStableCoin')

const CHAIN_ID = "666"

contract('DepositManager', function (accounts, lol, what) {

    beforeEach(async function () {
        this.project = await TestHelper()
        // this.mockStorage = await MockStorage.new()
        // this.stableCoin = await MockStableCoin.new(CHAIN_ID)
    })

    it.only('should create a proxy', async function () {
        const proxy = await this.project.createProxy(EthicHubDepositManager, {
            initMethod: 'initialize',
            initArgs: [this.mockStorage.address, this.stableCoin]
        })
        const owner = await proxy.methods.owner().call().should.be.succesful()
        console.log(owner)
        const result = await proxy.methods.relayHubVersion().call().should.be.succesful()
        console.log(result)
    })
})