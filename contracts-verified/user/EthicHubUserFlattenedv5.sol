
// File: @openzeppelin/upgrades/contracts/Initializable.sol

pragma solidity >=0.4.24 <0.7.0;


/**
 * @title Initializable
 *
 * @dev Helper contract to support initializer functions. To use it, replace
 * the constructor with a function that has the `initializer` modifier.
 * WARNING: Unlike constructors, initializer functions must be manually
 * invoked. This applies both to deploying an Initializable contract, as well
 * as extending an Initializable contract via inheritance.
 * WARNING: When used with inheritance, manual care must be taken to not invoke
 * a parent initializer twice, or ensure that all initializers are idempotent,
 * because this is not dealt with automatically as with constructors.
 */
contract Initializable {

  /**
   * @dev Indicates that the contract has been initialized.
   */
  bool private initialized;

  /**
   * @dev Indicates that the contract is in the process of being initialized.
   */
  bool private initializing;

  /**
   * @dev Modifier to use in the initializer function of a contract.
   */
  modifier initializer() {
    require(initializing || isConstructor() || !initialized, "Contract instance has already been initialized");

    bool isTopLevelCall = !initializing;
    if (isTopLevelCall) {
      initializing = true;
      initialized = true;
    }

    _;

    if (isTopLevelCall) {
      initializing = false;
    }
  }

  /// @dev Returns true if and only if the function is running in the constructor
  function isConstructor() private view returns (bool) {
    // extcodesize checks the size of the code stored in an address, and
    // address returns the current address. Since the code is still not
    // deployed when running a constructor, any checks on its code size will
    // yield zero, making it an effective way to detect if a contract is
    // under construction or not.
    address self = address(this);
    uint256 cs;
    assembly { cs := extcodesize(self) }
    return cs == 0;
  }

  // Reserved storage space to allow for layout changes in the future.
  uint256[50] private ______gap;
}

// File: @openzeppelin/contracts-ethereum-package/contracts/GSN/Context.sol

pragma solidity ^0.5.0;


/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with GSN meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
contract Context is Initializable {
    // Empty internal constructor, to prevent people from mistakenly deploying
    // an instance of this contract, which should be used via inheritance.
    constructor () internal { }
    // solhint-disable-previous-line no-empty-blocks

    function _msgSender() internal view returns (address payable) {
        return msg.sender;
    }

    function _msgData() internal view returns (bytes memory) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}

// File: @openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol

pragma solidity ^0.5.0;



/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be aplied to your functions to restrict their use to
 * the owner.
 */
contract Ownable is Initializable, Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    function initialize(address sender) public initializer {
        _owner = sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Returns true if the caller is the current owner.
     */
    function isOwner() public view returns (bool) {
        return _msgSender() == _owner;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * > Note: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     */
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    uint256[50] private ______gap;
}

// File: contracts/storage/EthicHubStorageInterface.sol

pragma solidity 0.5.13;


/**
 * Interface for the eternal storage.
 * Thanks RocketPool!
 * https://github.com/rocket-pool/rocketpool/blob/master/contracts/interface/RocketStorageInterface.sol
 */
contract EthicHubStorageInterface {

    //modifier for access in sets and deletes
    modifier onlyEthicHubContracts() {_;}

    // Setters
    function setAddress(bytes32 _key, address _value) external;
    function setUint(bytes32 _key, uint _value) external;
    function setString(bytes32 _key, string calldata _value) external;
    function setBytes(bytes32 _key, bytes calldata _value) external;
    function setBool(bytes32 _key, bool _value) external;
    function setInt(bytes32 _key, int _value) external;
    // Deleters
    function deleteAddress(bytes32 _key) external;
    function deleteUint(bytes32 _key) external;
    function deleteString(bytes32 _key) external;
    function deleteBytes(bytes32 _key) external;
    function deleteBool(bytes32 _key) external;
    function deleteInt(bytes32 _key) external;

    // Getters
    function getAddress(bytes32 _key) external view returns (address);
    function getUint(bytes32 _key) external view returns (uint);
    function getString(bytes32 _key) external view returns (string memory);
    function getBytes(bytes32 _key) external view returns (bytes memory);
    function getBool(bytes32 _key) external view returns (bool);
    function getInt(bytes32 _key) external view returns (int);
}

// File: contracts/user/EthicHubUser.sol

/*
    Smart contract of user status.

    Copyright (C) 2018 EthicHub
    This file is part of platform contracts.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
pragma solidity 0.5.13;



/* @title User
@dev This is an extension to add user
*/
contract EthicHubUser is Ownable {

    uint8 public version;
    EthicHubStorageInterface public ethicHubStorage;

    event UserStatusChanged(address target, string profile, bool isRegistered);

    constructor(address _ethicHubStorage) public {
        require(address(_ethicHubStorage) != address(0), "Storage address cannot be zero address");

        ethicHubStorage = EthicHubStorageInterface(_ethicHubStorage);
        version = 5;

        Ownable.initialize(msg.sender);
    }

    /**
     * @dev Changes registration status of an address for participation.
     * @param target Address that will be registered/deregistered.
     * @param profile profile of user.
     * @param isRegistered New registration status of address.
     */
    function changeUserStatus(
        address target,
        string memory profile,
        bool isRegistered
        ) public onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        require(bytes(profile).length != 0);
        ethicHubStorage.setBool(keccak256(abi.encodePacked("user", profile, target)), isRegistered);
        emit UserStatusChanged(target, profile, isRegistered);
    }


    /**
     * @dev delete an address for participation.
     * @param target Address that will be deleted.
     * @param profile profile of user.
     */
    function deleteUserStatus(address target, string memory profile) internal onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        require(bytes(profile).length != 0);
        ethicHubStorage.deleteBool(keccak256(abi.encodePacked("user", profile, target)));
        emit UserStatusChanged(target, profile, false);
    }


    /**
     * @dev View registration status of an address for participation.
     * @return isRegistered boolean registration status of address for a specific profile.
     */
    function viewRegistrationStatus(address target, string memory profile) public view returns(bool isRegistered) {
        require(target != address(0), "Target address cannot be undefined");
        require(bytes(profile).length != 0);
        isRegistered = ethicHubStorage.getBool(keccak256(abi.encodePacked("user", profile, target)));
    }

    /**
     * @dev register a localNode address.
     */
    function registerLocalNode(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "localNode", target)));
        if (!isRegistered) {
            changeUserStatus(target, "localNode", true);
        }
    }

    /**
     * @dev unregister a localNode address.
     */
    function unregisterLocalNode(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "localNode", target)));
        if (isRegistered) {
            deleteUserStatus(target, "localNode");
        }
    }

    /**
     * @dev register a community address.
     */
    function registerCommunity(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "community", target)));
        if (!isRegistered) {
            changeUserStatus(target, "community", true);
        }
    }

    /**
     * @dev unregister a community address.
     */
    function unregisterCommunity(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "community", target)));
        if (isRegistered) {
            deleteUserStatus(target, "community");
        }
    }

    /**
     * @dev register a invertor address.
     */
    function registerInvestor(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        changeUserStatus(target, "investor", true);
    }

    /**
     * @dev unregister a investor address.
     */
    function unregisterInvestor(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "investor", target)));
        if (isRegistered) {
            deleteUserStatus(target, "investor");
        }
    }

    /**
     * @dev register a community representative address.
     */
    function registerRepresentative(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        changeUserStatus(target, "representative", true);
    }

    /**
     * @dev unregister a representative address.
     */
    function unregisterRepresentative(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "representative", target)));
        if (isRegistered) {
            deleteUserStatus(target, "representative");
        }
    }

    /**
     * @dev register a paymentGateway address.
     */
    function registerPaymentGateway(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        changeUserStatus(target, "paymentGateway", true);
    }

    /**
     * @dev unregister a paymentGateway address.
     */
    function unregisterPaymentGateway(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "paymentGateway", target)));
        if (isRegistered) {
            deleteUserStatus(target, "paymentGateway");
        }
    }

    /**
    * @dev register a relayer address.
    */
    function registerRelayer(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        changeUserStatus(target, "relayer", true);
    }

    /**
     * @dev unregister a relayer address.
     */
    function unregisterRelayer(address target) external onlyOwner {
        require(target != address(0), "Target address cannot be undefined");
        bool isRegistered = ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "relayer", target)));
        if (isRegistered) {
            deleteUserStatus(target, "relayer");
        }
    }
}
