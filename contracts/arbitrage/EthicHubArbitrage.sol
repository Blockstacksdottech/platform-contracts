pragma solidity 0.5.13;

import "@openzeppelin/contracts/ownership/Ownable.sol";

import "../EthicHubBase.sol";
import "../storage/EthicHubStorageInterface.sol";

/**
 * @title EthicHubArbitrage
 * @dev This contract will assign an arbiter for a lending contract.
 * The arbiter is the only role allowed to change the borrower address for a lending contract
 * The nature of the arbiter (wallet, voting contract...) will be determined each case.
 * This is an emergency mechanism only, in case of compromised or lost borrower accounts.
 */

contract EthicHubArbitrage is EthicHubBase, Ownable {

    uint8 public version;
    EthicHubStorageInterface public ethicHubStorage;

    event ArbiterAssigned (
        address indexed _arbiter, // Address of the arbiter
        address indexed _lendingContract // Address of the lending contract
    );

    event ArbiterRevoked (
        address indexed _arbiter, // Address of the arbiter
        address indexed _lendingContract // Address of the lending contract
    );

    constructor(EthicHubStorageInterface _ethicHubStorage) public {
        require(address(_ethicHubStorage) != address(0), "Storage address cannot be zero address");

        ethicHubStorage = _ethicHubStorage;
        version = 1;
    }

    function assignArbiterForLendingContract(address _arbiter, address _lendingContract) public onlyOwner {
        require(_arbiter != address(0), "Aribter address is not valid");
        require(_lendingContract != address(0), "Lending contract address is not valid");
        require(_lendingContract == ethicHubStorage.getAddress(keccak256(abi.encodePacked("contract.address", _lendingContract))));
        ethicHubStorage.setAddress(keccak256(abi.encodePacked("arbiter", _lendingContract)), _arbiter);
        emit ArbiterAssigned(_arbiter, _lendingContract);
    }

    function revokeArbiterForLendingContract(address _arbiter, address _lendingContract) public onlyOwner {
        require(_arbiter != address(0), "Aribter address is not valid");
        require(_lendingContract != address(0), "Lending contract address is not valid");
        require(_lendingContract == ethicHubStorage.getAddress(keccak256(abi.encodePacked("contract.address", _lendingContract))));
        require(arbiterForLendingContract(_lendingContract) == _arbiter);
        ethicHubStorage.deleteAddress(keccak256(abi.encodePacked("arbiter", _lendingContract)));
        emit ArbiterRevoked(_arbiter, _lendingContract);
    }

    function arbiterForLendingContract(address _lendingContract) public view returns(address) {
        return ethicHubStorage.getAddress(keccak256(abi.encodePacked("arbiter", _lendingContract)));
    }
}
