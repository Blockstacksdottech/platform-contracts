pragma solidity 0.5.8;

import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "./storage/EthicHubStorageInterface.sol";

contract EthicHubBase is Initializable {

    uint8 public version;

    EthicHubStorageInterface public ethicHubStorage;

    function initialize(EthicHubStorageInterface _ethicHubStorage, uint8 _version) public initializer {
        require(address(_ethicHubStorage) != address(0), "Storage address cannot be undefined");
        ethicHubStorage = _ethicHubStorage;
        version = _version;
    }
}
