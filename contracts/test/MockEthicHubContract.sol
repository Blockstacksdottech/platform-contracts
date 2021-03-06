pragma solidity 0.5.13;

import "../EthicHubBase.sol";
import "../storage/EthicHubStorageInterface.sol";

contract MockEthicHubContract is EthicHubBase {

    /// @dev constructor
    constructor(address _ethicHubStorage, uint8 _version) public {
        EthicHubBase.initialize(_ethicHubStorage, _version);
    }

    function getStorageAddress() public view returns (address) {
        return address(ethicHubStorage);
    }
}
