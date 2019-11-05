const web3_1_0 = require('web3');
const BigNumber = web3.BigNumber
const utils = require("web3-utils");

//const Lending = artifacts.require('Lending');
const storage = artifacts.require('./storage/EthicHubStorage.sol');
const cmc = artifacts.require('./EthicHubCMC.sol');
const reputation = artifacts.require('./reputation/EthicHubReputation.sol');
const userManager = artifacts.require('./user/EthicHubUser.sol');
const arbitrage = artifacts.require('./arbitrage/EthicHubArbitrage.sol');

// Deploy EthicHub network
module.exports = async (deployer, network) => {
    // if (network !== 'ganache' && network !== 'development' && network !== 'develop') {
    //     console.log("Skipping deploying EthicHub in dev networks");
    //     return;
    // }

    //Contract management
    console.log("--> Deploying EthicHubStorage...");
    await deployer.deploy(storage)
    const storageInstance = await storage.deployed()
    console.log("--> EthicHubStorage deployed");

    console.log("--> Deploying EthichubCMC...");
    await deployer.deploy(cmc, storageInstance.address)
    const cmcInstance = await cmc.deployed()
    console.log("--> EthichubCMC deployed");

    //Give CMC access to storage
    console.log("--> Registering EthichubCMC in the network...");
    await storageInstance.setAddress(utils.soliditySha3("contract.address", cmc.address), cmc.address);
    await storageInstance.setAddress(utils.soliditySha3("contract.name", "cmc"), cmc.address);
    console.log("--> EthichubCMC registered");

    console.log("--> Deploying EthicHubReputation...");
    await deployer.deploy(reputation, storageInstance.address)
    const reputationInstance = await reputation.deployed()
    console.log("--> EthicHubReputation deployed");

    //Set deployed reputation's role in the network
    console.log("--> Registering EthicHubReputation in the network...");
    await cmcInstance.upgradeContract(reputationInstance.address, "reputation");
    console.log("--> EthicHubReputation registered");

    //Deploy users
    console.log("--> Deploying EthicHubUser...");
    await deployer.deploy(userManager, storageInstance.address)
    console.log("--> EthicHubUser deployed");

    //Set deployed user's role in the network
    await cmcInstance.upgradeContract(userManager.address, "users");
    console.log("--> EthicHubUser registered");

    //Deploy arbitrage
    console.log("--> Deploying EthicHubArbitrage...");
    await deployer.deploy(arbitrage, storageInstance.address);
    console.log("--> EthicHubArbitrage deployed");

    console.log("--> Registering EthicHubArbitrage in the network...");
    await cmcInstance.upgradeContract(arbitrage.address, "arbitrage");
    console.log("--> EthicHubArbitrage registered");

    console.log("--> EthicHub network ready");
};