require('@babel/register');
require('@babel/polyfill');
require('dotenv').config();

var HDWalletProvider = require("@truffle/hdwallet-provider");
const { GSNDevProvider } = require('@openzeppelin/gsn-provider');

let mnemonic = process.env.MNEMONIC;


module.exports = {
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    },
    compilers: {
        solc: {
            version: "0.5.8"
        }
    },
    networks: {
        development: {
            provider: new GSNDevProvider('http://localhost:8545', {
                txfee: 70,
                useGSN: false,
                ownerAddress: '0xb70000F0dA71b7e618b0Ab33AE288dba50d4807F',
                relayerAddress: '0xd216153c06e857cd7f72665e0af1d7d82172f494',
            }),
            network_id: "*" // Match any network id
        },
        coverage: {
            provider: new GSNDevProvider('http://localhost:8545', {
                txfee: 70,
                useGSN: false,
                ownerAddress: '0xb70000F0dA71b7e618b0Ab33AE288dba50d4807F',
                relayerAddress: '0xd216153c06e857cd7f72665e0af1d7d82172f494',
            }),
            network_id: '*', // eslint-disable-line camelcase
            gas: 0x10000000,
            gasPrice: 0x01,
        },
        ganache: {
            host: "127.0.0.1",
            port: 9545,
            network_id: "*" // Match any network id
        },
        rinkeby: {
            provider: function () {
                return new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/" + process.env.INFURA_KEY);
            },
            network_id: '*',
            gasLimit: 6000000,
            gas: 4700000
        },
        kovan: {
            provider: function () {
                return new HDWalletProvider(mnemonic, "https://kovan.infura.io/" + process.env.INFURA_KEY);
            },
            network_id: '*',
            gasLimit: 6000000,
            gas: 4700000
        }
    }
};