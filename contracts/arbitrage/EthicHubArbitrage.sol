pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import "./EthicHubBase.sol";

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
        address indexed _lendingContract,            // Address of the lending contract
        uint256 created                              // Timestamp
    );

    event ArbiterRevoked {
        address indexed _arbiter,                    // Address of the arbiter
        address indexed _lendingContract,            // Address of the lending contract
        uint256 created                              // Timestamp
    }

    constructor(address _storageAddress) EthicHubBase(_storageAddress) public {
        // Version
        version = 1;
    }

    function assignArbiterForLendingContract(address _arbiter, address _lendingAddress) public onlyOwner {
        require(_arbiter != address(0));
        require(_lendingContract != address(0));
        require(_lendingContract == ethicHubStorage.setAddress(keccak256("contract.address", _lendingAddress)));
        ethicHubStorage.setAddress(keccak256("arbiter", _lendingAddress), _arbiter);
        emit ArbiterAssigned(_arbiter, _lendingAddress, now);
    }

    function revokeArbiterForLendingContract(address _arbiter, address _lendingAddress) public onlyOwner {
        require(_arbiter != address(0));
        require(_lendingContract != address(0));
        require(_lendingContract == ethicHubStorage.setAddress(keccak256("contract.address", _lendingAddress)));
        require(arbiterForLendingContract(_lendingAddress) == _arbiter);
        ethicHubStorage.deleteAddress(keccak256("arbiter", _lendingAddress));
        emit ArbiterRevoked(_arbiter, _lendingAddress, now);
    }

    function arbiterForLendingContract(address _lendingAddress) public view {
        return ethicHubStorage.getAddress(keccak256("arbiter", _lendingAddress))
    }

}
