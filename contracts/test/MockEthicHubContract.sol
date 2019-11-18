pragma solidity 0.5.8;

import "../EthicHubBase.sol";
import "../storage/EthicHubStorageInterface.sol";

contract MockEthicHubContract is EthicHubBase {

    /// @dev constructor
    constructor(EthicHubStorageInterface _ethicHubStorage, uint8 _version) public {
        EthicHubBase.initialize(_ethicHubStorage);

        version = _version;
    }

    function getStorageAddress() public view returns (address) {
        return address(ethicHubStorage);
    }
}
