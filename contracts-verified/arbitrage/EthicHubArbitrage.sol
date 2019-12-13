pragma solidity ^0.4.23;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "../EthicHubBase.sol";

/**
 * @title EthicHubArbitrage
 * @dev This contract will assign an arbiter for a lending contract.
 * The arbiter is the only role allowed to change the borrower address for a lending contract
 * The nature of the arbiter (wallet, voting contract...) will be determined each case.
 * This is an emergency mechanism only, in case of compromised or lost borrower accounts.
 */

contract EthicHubArbitrage is EthicHubBase, Ownable {

    event ArbiterAssigned (
        address indexed _arbiter,                    // Address of the arbiter
        address indexed _lendingContract            // Address of the lending contract
    );

    event ArbiterRevoked (
        address indexed _arbiter,                    // Address of the arbiter
        address indexed _lendingContract            // Address of the lending contract
    );

    constructor(address _storageAddress) EthicHubBase(_storageAddress) public {
        // Version
        version = 1;

        Ownable.initialize(msg.sender);
    }

    function assignArbiterForLendingContract(address _arbiter, address _lendingContract) public onlyOwner {
        require(_arbiter != address(0));
        require(_lendingContract != address(0));
        require(_lendingContract == ethicHubStorage.getAddress(keccak256("contract.address", _lendingContract)));
        ethicHubStorage.setAddress(keccak256("arbiter", _lendingContract), _arbiter);
        emit ArbiterAssigned(_arbiter, _lendingContract);
    }

    function revokeArbiterForLendingContract(address _arbiter, address _lendingContract) public onlyOwner {
        require(_arbiter != address(0));
        require(_lendingContract != address(0));
        require(_lendingContract == ethicHubStorage.getAddress(keccak256("contract.address", _lendingContract)));
        require(arbiterForLendingContract(_lendingContract) == _arbiter);
        ethicHubStorage.deleteAddress(keccak256("arbiter", _lendingContract));
        emit ArbiterRevoked(_arbiter, _lendingContract);
    }

    function arbiterForLendingContract(address _lendingContract) public view returns(address) {
        return ethicHubStorage.getAddress(keccak256("arbiter", _lendingContract));
    }

}
