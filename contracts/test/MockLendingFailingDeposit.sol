pragma solidity 0.5.13;

import "../interfaces/IContributionTarget.sol";

contract MockLendingFailingDeposit is IContributionTarget {
    event Constructed();

    constructor() public {
      emit Constructed();
    }
    function deposit(address contributor, uint256 amount) external {
        require(amount == 6969696969, "IContributionTarget Failed");
    }
}
