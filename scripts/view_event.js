require('babel-register');
require('babel-polyfill');
require('dotenv').config();

var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider('https://kovan.ethichub.com'));
//console.log('remote: ' + web3.version);
console.log('remote: ' + web3.version);
//var BN = web3.utils.BN;
const loader = require('./contract_loader.js');

var contractAddress = '0xF86BEbaB4894012de35925eB57a6b11666f32704';

loader.load(web3, 'EthicHubLending',contractAddress).then( async (contractInstance) =>  {
    contractInstance.getPastEvents('allEvents', {
            fromBlock: 0,
            toBlock: 'latest'
    }, function(error, events){ console.log(events); })
    .then(function(events){
            console.log(events) // same results as the optional callback above
    });

    contractInstance.once('allEvents', {
            fromBlock: 0
    }, function(error, events){ console.log(events); });

});
