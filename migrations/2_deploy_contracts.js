const web3_1_0 = require('web3');
const BigNumber = web3.BigNumber
const utils = web3_1_0.utils;

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
    console.log("--> Deploying EthicHubStorage...");
    return deployer.deploy(storage).then(() => {
        //Contract management
        console.log("--> EthicHubStorage deployed");
        console.log("--> Deploying EthichubCMC...");
        return deployer.deploy(cmc, storage.address).then(() => {
            console.log("--> EthichubCMC deployed");
            return storage.deployed().then(async storageInstance => {
                //Give CMC access to storage
                console.log("--> Registering EthichubCMC in the network...");
                await storageInstance.setAddress(utils.soliditySha3("contract.address", cmc.address), cmc.address);
                await storageInstance.setAddress(utils.soliditySha3("contract.name", "cmc"), cmc.address);
                console.log("--> EthichubCMC registered");

                //Deploy reputation
                console.log("--> Deploying EthicHubReputation...");
                return deployer.deploy(reputation, storage.address).then(() => {
                    console.log("--> EthicHubReputation deployed");
                    //Set deployed reputation's role in the network
                    return cmc.deployed().then(async cmcInstance => {
                        console.log("--> Registering EthicHubReputation in the network...");
                        await cmcInstance.upgradeContract(reputation.address,"reputation");
                        console.log("--> EthicHubReputation registered");

                        //Deploy users
                        console.log("--> Deploying EthicHubUser...");
                        return deployer.deploy(userManager,storage.address).then(() => {
                            console.log("--> EthicHubUser deployed");
                            //Set deployed user's role in the network
                            return cmc.deployed().then(async cmcInstance => {
                                console.log("--> Registering EthicHubUser in the network...");
                                await cmcInstance.upgradeContract(userManager.address,"users");
                                console.log("--> EthicHubReputation registered");

                                //Deploy arbitrage
                                console.log("--> Deploying EthicHubArbitrage...");
                                return deployer.deploy(arbitrage,storage.address).then(() => {
                                    console.log("--> EthicHubArbitrage deployed");
                                    //Set deployed user's role in the network
                                    return cmc.deployed().then(async cmcInstance => {
                                        console.log("--> Registering EthicHubArbitrage in the network...");
                                        await cmcInstance.upgradeContract(arbitrage.address,"arbitrage");
                                        console.log("--> EthicHubArbitrage registered");
                                        console.log("--> EthicHub network ready");
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

};
