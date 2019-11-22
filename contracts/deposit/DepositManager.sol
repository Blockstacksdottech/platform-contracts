pragma solidity 0.5.13;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/GSN/GSNRecipient.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

import "../interfaces/IContributionTarget.sol";
import "../storage/EthicHubStorageInterface.sol";

contract DepositManager is Initializable, Ownable, GSNRecipient {

    uint8 public version;
    EthicHubStorageInterface public ethicHubStorage;

    IERC20 public stableCoin;

    function initialize(
        EthicHubStorageInterface _ethicHubStorage, IERC20 _stableCoin
    ) public initializer {
        require(address(_ethicHubStorage) != address(0), "Storage address cannot be zero address");

        Ownable.initialize(_msgSender());
        GSNRecipient.initialize();

        ethicHubStorage = _ethicHubStorage;
        version = 1;

        stableCoin = _stableCoin;
    }

    function acceptRelayedCall(
        address relay,
        address from,
        bytes calldata encodedFunction,
        uint256 transactionFee,
        uint256 gasPrice,
        uint256 gasLimit,
        uint256 nonce,
        bytes calldata approvalData,
        uint256 maxPossibleCharge
    ) external view returns (uint256, bytes memory) {
      return _approveRelayedCall();
    }

    function _preRelayedCall(bytes memory context) internal returns (bytes32) {
    }

    function _postRelayedCall(bytes memory context, bool, uint256 actualCharge, bytes32) internal {
    }

    function contribute(address target, address contributor, uint256 amount) public {
        require(contributor != address(0), "Contributor address is zero address");
        require(
            address(target) == ethicHubStorage.getAddress(keccak256(abi.encodePacked("contract.address", target))),
            "Not a valid lending contract address"
        );
        require(
            stableCoin.balanceOf(_msgSender()) >= amount &&
            stableCoin.allowance(_msgSender(), address(this)) >= amount,
            "No balance allowed to transfer or insufficient amount"
        );

        stableCoin.transferFrom(_msgSender(), address(target), amount);
        IContributionTarget(target).deposit(_msgSender(), amount);
    }

    function setRelayHubAddress(address relayAddress) public {
        _upgradeRelayHub(relayAddress);
    }
}