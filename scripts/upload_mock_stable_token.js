require('@babel/register');
require('@babel/polyfill');
require('dotenv').config();

var HDWalletProvider = require("@truffle/hdwallet-provider");
let mnemonic = process.env.MNEMONIC;
var Web3 = require('web3');
var web3 = new Web3(new HDWalletProvider(process.env.KOVAN_MNEMONIC, process.env.KOVAN_URL))
const { BN } = require('@openzeppelin/test-helpers');
const utils = require("web3-utils");

function latestTime() {
  return web3.eth.getBlock(web3.eth.blockNumber).timestamp;
}

const duration = {
  seconds: function (val) { return val },
  minutes: function (val) { return val * this.seconds(60) },
  hours: function (val) { return val * this.minutes(60) },
  days: function (val) { return val * this.hours(24) },
  weeks: function (val) { return val * this.days(7) },
  years: function (val) { return val * this.days(365) }
};

function ether(n) {
  return new BN(utils.toWei(n, 'ether'));
}

function now() {
  return Math.round((new Date()).getTime() / 1000);
}

const loader = require('./contract_loader.js');

doStuff = async () => {
  const deployable = loader.getDeployable(web3, 'MockStableCoin', false);
  const lendingInstance = await deployable.contract.deploy({
      data: deployable.byteCode,
      arguments: [
        '42'
      ]
    })
    .send({
      from: process.env.KOVAN_ACCOUNT,
      gas: 4500000,
      gasPrice: '300000000000',
    });

  console.log("Deployed");
}
doStuff()