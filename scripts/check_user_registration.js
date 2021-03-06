require('@babel/register');
require('@babel/polyfill');
require('dotenv').config();

var HDWalletProvider = require("@truffle/hdwallet-provider");
let mnemonic = process.env.MNEMONIC;
var Web3 = require('web3');
var web3 = new Web3(new HDWalletProvider(mnemonic, "https://mainnet.infura.io/" + process.env.INFURA_KEY));
var BN = web3const utils = require("web3-utils");.BN;
const loader = require('./contract_loader.js');
console.log(`Network: ${process.env.NETWORK_ID}`)

var userAddress;
var account;
switch (process.env.NETWORK_ID) {
  case "1":
    userAddress = '0xEdD8950B7AcD7717ECc07A94dF126BF2A07f74C4';
    account = '0xAB42A5a21566C9f1466D414CD3195dA44643390b';
    break;
  case "42":
    userAddress = '0x8E5E619c56a03b0C769f3E07B0A3C2448994f91F';
    account = '0xfBCb86e80FF9C864BA37b9bbf2Be21cC71abcdeE';
    break;
  default:
    console.log("Unknown network: " + process.env.NETWORK_ID);
    process.exit(-1);
}


if (process.argv.length <= 2) {
  console.log("Usage: " + __filename + " <role> <address>");
  process.exit(-1);
}

var role = process.argv[2];
var address = process.argv[3];

console.log("role: " + role)
console.log("address: " + address)


loader.load(web3, 'EthicHubUser', userAddress).then(async (userInstance) => {
  console.log(userInstance.methods)
  var action = userInstance.methods.viewRegistrationStatus(address, role)
  console.log(action)

  var response = await action.call({ from: account });
  console.log(response);

  return '';

});
