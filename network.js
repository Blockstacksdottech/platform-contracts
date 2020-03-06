module.exports = {
  local: {
    provider: function () {
      return new GSNDevProvider('http://localhost:8545', {
        txfee: 70,
        useGSN: false,
        // The last two accounts defined in test.sh
        ownerAddress: '0x26be9c03ca7f61ad3d716253ee1edcae22734698',
        relayerAddress: '0xdc5fd04802ea70f6e27aec12d56716624c98e749',
      })
    },
    network_id: "*" // Match any network id
  },
  coverage: {
    provider: function () {
      return new GSNDevProvider('http://localhost:8545', {
        txfee: 70,
        useGSN: false,
        // The last two accounts defined in test.sh
        ownerAddress: '0x26be9c03ca7f61ad3d716253ee1edcae22734698',
        relayerAddress: '0xdc5fd04802ea70f6e27aec12d56716624c98e749',
      })
    },
    network_id: '*', // eslint-disable-line camelcase
    gas: 0x10000000,
    gasPrice: 0x01,
  },
  // ganache: {
  //   provider: function () {
  //     return new HDWalletProvider(process.env.GANACHE_MNEMONIC, "http://127.0.0.1:8545");
  //   },
  //   gas: 5000000,
  //   gasPrice: 5e9,
  //   networkId: '*',
  // },
  rinkeby: {
    provider: function () {
      return new HDWalletProvider(process.env.RINKEBY_MNEMONIC, "https://rinkeby.infura.io/v3/" + process.env.INFURA_KEY);
    },
    network_id: '*',
    gasLimit: 6000000,
    gas: 4700000
  },
  kovan: {
    provider: function () {
      return new HDWalletProvider(process.env.KOVAN_MNEMONIC, "https://kovan.infura.io/v3/" + process.env.INFURA_KEY);
    },
    network_id: '*',
    gasLimit: 6000000,
    gas: 4700000
  }
}