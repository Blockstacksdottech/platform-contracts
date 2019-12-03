require('@babel/register');
require('@babel/polyfill');
require('dotenv').config();

var HDWalletProvider = require("@truffle/hdwallet-provider");
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

var cmc;
var userManager;
const loader = require('./contract_loader.js');
var cmcAddress;
var userAddress;
var storageAddress;
var localNode;
var representative;
var community;
var team = '0xdFb6994ADD952486d2B65af4A6c9D511b122f172';
switch (process.env.NETWORK_ID) {
  case "1":
    userAddress = '0xEdD8950B7AcD7717ECc07A94dF126BF2A07f74C4';
    account = '0xAB42A5a21566C9f1466D414CD3195dA44643390b';
    storageAddress = '';
    localNode = '';
    representative = '';
    community = '';
    team = '';
    break;
  case "42":
    userAddress = '0x8E5E619c56a03b0C769f3E07B0A3C2448994f91F';
    account = '0xfBCb86e80FF9C864BA37b9bbf2Be21cC71abcdeE';
    storageAddress = process.env.KOVAN_STORAGE_ADDRESS;
    cmcAddress = process.env.KOVAN_CMC_ADDRESS;
    localNode = '0x08B909c5c1Fc6bCc4e69BA865b3c38b6365bD894';
    representative = '';
    community = '0x26e630b8C0638BC0421Bf268F751f4030e942E43';
    team = '';
    break;
  default:
    console.log("Unknown network: " + process.env.NETWORK_ID);
    process.exit(-1);
}




loader.load(web3, 'EthicHubCMC', process.env.KOVAN_CMC_ADDRESS).then(async cmcInstance => {
  cmc = cmcInstance;

  const fundingStartTime = now() + duration.minutes(15);
  const fundingEndTime = now() + duration.days(2);
  console.log(fundingStartTime);
  console.log(fundingEndTime);

  console.log(ether('100'));
  //const deployable = loader.getDeployable(web3, 'EthicHubLending');
  const instance = await loader.load(web3, 'EthicHubLending', '0xFFd7f869ed762dAEAAf059f0F0f2092bC394D9A9')
  console.log(instance)
  /*try {
    const lendingInstance = await deployable.contract.deploy({
        data: deployable.byteCode,
        arguments: [
          `${fundingStartTime}`, //uint256 _fundingStartTime,
          `${fundingEndTime}`, //uint256 _fundingEndTime,
          '15', //uint256 _annualInterest,
          '10', //ether('100'), //uint256 _totalLendingAmount,
          '10', //uint256 _lendingDays,
          '4', //uint256 _ethichubFee,
          '4', //uint256 _localNodeFee,
          '0x2a99a665db43E4D2efDb5d918180b45e300a1673', //accounts[2],//_borrower
          '0x08B909c5c1Fc6bCc4e69BA865b3c38b6365bD894', //localNode,//localNode
          '0x08B909c5c1Fc6bCc4e69BA865b3c38b6365bD894', //team
          process.env.KOVAN_STORAGE_ADDRESS, //storage
          process.env.KOVAN_STABLE_COIN, //IERC20 _stableCoin
        ]
      })
      .send({
        from: process.env.KOVAN_ACCOUNT,
        gas: 4500000,
        gasPrice: '1000000000',
      });
  } catch (error) {
    console.log(error)
    return
  }*/
  console.log("Deployed");
  //console.log(lendingInstance.options.address) // instance with the new contract address
  //await cmc.methods.addNewLendingContract(lendingInstance.options.address).send({ from: accounts[0], gas: 4000000 });
  await instance.methods.saveInitialParametersToStorage(
    '2',//maxDefaultDays
    '20',//community members
    '0x26e630b8C0638BC0421Bf268F751f4030e942E43' //community rep wallet
  ).send({
    from: process.env.KOVAN_ACCOUNT,
    gas: 4000000,
    gasPrice: '3000000000',
  })



})
