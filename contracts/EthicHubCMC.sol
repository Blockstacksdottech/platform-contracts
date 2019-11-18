pragma solidity 0.5.8;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

import "./EthicHubBase.sol";
import "./storage/EthicHubStorageInterface.sol";

/**
 * @title EthichubCMC
 * @dev This contract manage ethichub contracts creation and update.
 */

contract EthicHubCMC is EthicHubBase, Ownable {

    event ContractUpgraded (
        address indexed _oldContractAddress, // Address of the contract being upgraded
        address indexed _newContractAddress, // Address of the new contract
        uint256 created // Creation timestamp
    );

    event ContractRemoved (
        address indexed _contractAddress, // Address of the contract being removed
        uint256 removed // Remove timestamp
    );

    event LendingContractAdded (
        address indexed _newContractAddress, // Address of the new contract
        uint256 created // Creation timestamp
    );


    modifier onlyOwnerOrLocalNode() {
        bool isLocalNode = ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "localNode", msg.sender)));
        require(isLocalNode || owner() == msg.sender);
        _;
    }

    constructor(EthicHubStorageInterface _ethicHubStorage) public {
        EthicHubBase.initialize(_ethicHubStorage);

        version = 4;
    }

    function addNewLendingContract(address _lendingAddress) public onlyOwnerOrLocalNode {
        require(_lendingAddress != address(0));
        ethicHubStorage.setAddress(keccak256(abi.encodePacked("contract.address", _lendingAddress)), _lendingAddress);
        emit LendingContractAdded(_lendingAddress, now);
    }

    function upgradeContract(address _newContractAddress, string memory _contractName) public onlyOwner {
        require(_newContractAddress != address(0));
        require(keccak256(abi.encodePacked("contract.name","")) != keccak256(abi.encodePacked("contract.name",_contractName)));
        address oldAddress = ethicHubStorage.getAddress(keccak256(abi.encodePacked("contract.name", _contractName)));
        ethicHubStorage.setAddress(keccak256(abi.encodePacked("contract.address", _newContractAddress)), _newContractAddress);
        ethicHubStorage.setAddress(keccak256(abi.encodePacked("contract.name", _contractName)), _newContractAddress);
        ethicHubStorage.deleteAddress(keccak256(abi.encodePacked("contract.address", oldAddress)));
        emit ContractUpgraded(oldAddress, _newContractAddress, now);
    }

    function removeContract(address _contractAddress, string memory _contractName) public onlyOwner {
        require(_contractAddress != address(0));
        address contractAddress = ethicHubStorage.getAddress(keccak256(abi.encodePacked("contract.name", _contractName)));
        require(_contractAddress == contractAddress);
        ethicHubStorage.deleteAddress(keccak256(abi.encodePacked("contract.address", _contractAddress)));
        ethicHubStorage.deleteAddress(keccak256(abi.encodePacked("contract.name", _contractName)));
        emit ContractRemoved(_contractAddress, now);
    }
}
