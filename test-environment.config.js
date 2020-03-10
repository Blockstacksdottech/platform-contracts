// test-environment.config.js
const {
  GSNDevProvider
} = require('@openzeppelin/gsn-provider')

module.exports = {
  accounts: {
    amount: 10, // Number of unlocked accounts
    ether: 100, // Initial balance of unlocked accounts (in ether)
  },

  contracts: {
    type: 'truffle', // Contract abstraction to use: 'truffle' for @truffle/contract or 'web3' for web3-eth-contract
    defaultGas: 6e6, // Maximum gas for contract calls (when unspecified)
  },

  blockGasLimit: 8e6, // Maximum gas per block,
  artifactsDir: '',
  setupProvider: (baseProvider) => {
    const {
      accounts
    } = require('@openzeppelin/test-environment')

    let gsnProvider = new GSNDevProvider(baseProvider, {
      txfee: 70,
      useGSN: false,
      ownerAddress: accounts[8],
      relayerAddress: accounts[9]
    })
    console.log(gsnProvider.baseProvider.host)
    return gsnProvider
  }
};

