pragma solidity 0.4.25;

import "../../contracts/EthicHubBase.sol";


contract MockEthicHubContract is EthicHubBase {

    /// @dev constructor
    constructor(address _storageAddress, uint8 _version) EthicHubBase(_storageAddress) public {
      // Version
        version = _version;
    }

    function getStorageAddress() public view returns (address) {
        return ethicHubStorage;
    }

}
