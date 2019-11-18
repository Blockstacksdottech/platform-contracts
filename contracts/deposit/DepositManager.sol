pragma solidity 0.5.8;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

import "../EthicHubBase.sol";
import "../interfaces/IContributionTarget.sol";

contract DepositManager is Initializable, EthicHubBase {

    IERC20 public stableCoin;

    function initialize(
        EthicHubStorageInterface _ethicHubStorage, IERC20 _stableCoin
    ) public initializer {
        EthicHubBase.initialize(_ethicHubStorage);
        stableCoin = _stableCoin;
    }

    function contribute(IContributionTarget target, address contributor, uint256 amount) public {
        require(contributor != address(0), "Contributor address is not valid");
        require(
            address(target) == ethicHubStorage.getAddress(keccak256(abi.encodePacked("contract.address", target))),
            "Not a valid lending contract address"
        );
        require(
            stableCoin.balanceOf(msg.sender) >= amount &&
            stableCoin.allowance(msg.sender, address(this)) >= amount,
            "No balance allowed to transfer or insufficient amount"
        );

        stableCoin.transferFrom(msg.sender, address(target), amount);
        target.deposit(contributor, amount);
    }
}