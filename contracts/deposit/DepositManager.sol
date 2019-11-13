pragma solidity 0.5.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../EthicHubBase.sol";
import "../interfaces/IContributionTarget.sol";

contract DepositManager is EthicHubBase {

    IERC20 public dai;

    constructor(
        EthicHubStorageInterface _ethicHubStorage,IERC20 _dai
    ) EthicHubBase(_ethicHubStorage)
    public {
        dai = _dai;
    }

    function contribute(IContributionTarget target, address contributor, uint256 amount) public {
        require(contributor != address(0), "Contributor address is not valid");
        require(
            address(target) == ethicHubStorage.getAddress(keccak256(abi.encodePacked("contract.address", target))),
            "Not a valid lending contract address"
        );
        require(
            dai.balanceOf(msg.sender) >= amount &&
            dai.allowance(msg.sender, address(this)) >= amount,
            "No DAI allowed to transfer or insufficient amount"
        );

        dai.transferFrom(msg.sender, address(target), amount);
        target.deposit(contributor, amount);
    }
}