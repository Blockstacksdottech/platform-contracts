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

        ethicHubStorage.setAddress(keccak256(abi.encodePacked("depositManager.address", address(this))), address(this));
    }

    function contribute(IContributionTarget _target, address _contributor, uint256 _amount) public {
        require(_contributor != address(0), "Contributor address is not valid");
        require(address(_target) == ethicHubStorage.getAddress(keccak256(abi.encodePacked("contract.address", _target))),
                "Not a valid lending contract address");
        require(dai.balanceOf(msg.sender) >= _amount &&
                dai.allowance(msg.sender, address(this)) >= _amount,
                "No DAI allowed to transfer or insufficient amount");

        dai.transferFrom(msg.sender, address(this), _amount);
        _target.deposit(_contributor, _amount);
    }
}