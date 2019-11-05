pragma solidity 0.5.8;

import "../../contracts/EthicHubBase.sol";
import "../../contracts/storage/EthicHubStorageInterface.sol";

contract MockEthicHubContract is EthicHubBase {

    /// @dev constructor
    constructor(EthicHubStorageInterface _ethicHubStorage, uint8 _version) EthicHubBase(_ethicHubStorage) public {
        version = _version;
    }

    function getStorageAddress() public view returns (address) {
        return address(ethicHubStorage);
    }
}
