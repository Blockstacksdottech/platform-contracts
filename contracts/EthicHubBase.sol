pragma solidity 0.5.8;

import "./storage/EthicHubStorageInterface.sol";

contract EthicHubBase {

    uint8 public version;

    EthicHubStorageInterface public ethicHubStorage;

    constructor(EthicHubStorageInterface _ethicHubStorage) public {
        require(address(_ethicHubStorage) != address(0), "Storage address cannot be undefined");
        ethicHubStorage = _ethicHubStorage;
    }
}
