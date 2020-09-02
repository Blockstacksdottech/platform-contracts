pragma solidity 0.5.13;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/GSN/GSNRecipient.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

import "../interfaces/IContributionTarget.sol";
import "../storage/EthicHubStorageInterface.sol";

contract EthicHubDepositManager is Initializable, Ownable, GSNRecipient {

    uint8 public version;
    EthicHubStorageInterface public ethicHubStorage;
    IERC20 public stableCoin;
    event LogAddress(address log);
    event LogBool(bool log);
    event LogString(string log);

    function initialize(
        address _ethicHubStorage, address _stableCoin
    ) public initializer {
        require(address(_ethicHubStorage) != address(0), "Storage address cannot is zero address");
        require(address(_stableCoin) != address(0), "Stable Coin address cannot is zero address");

        Ownable.initialize(_msgSender());
        GSNRecipient.initialize();

        ethicHubStorage = EthicHubStorageInterface(_ethicHubStorage);
        version = 1;
        stableCoin = IERC20(_stableCoin);
    }

    function initializeToV2() public {
        require(version < 2, "EthicHubDepositManager: Already upgraded to version 2");
        version = 2;
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
        emit LogString("contributor not 0x0");
        require(
            address(target) == ethicHubStorage.getAddress(keccak256(abi.encodePacked("contract.address", target))),
            "Not a valid lending contract address"
        );
        emit LogString("valid contract");
        require(
            ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "investor", contributor))) ||
            ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "representative", contributor))),
            "Contributor is not registered lender or borrower"
        );
        emit LogString("contributor registered lender or borrower");
        address token_sender = _msgSender();
        emit LogAddress(token_sender);
        emit LogBool(ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "relayer", _msgSender()))));
        /*if (ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "relayer", _msgSender())))) {

            token_sender = contributor;
        }
        emit LogAddress(token_sender);
        require(
            stableCoin.balanceOf(token_sender) >= amount &&
            stableCoin.allowance(token_sender, address(this)) >= amount,
            "No balance allowed to transfer or insufficient amount"
        );
        require(
            amount > 0, "Amount cannot be 0"
        );

        

        require(stableCoin.transferFrom(token_sender, address(target), amount), "transferFrom dai failed");
        IContributionTarget(target).deposit(contributor, amount);*/
    }

    function setRelayHubAddress(address relayAddress) public onlyOwner {
        _upgradeRelayHub(relayAddress);
    }
}