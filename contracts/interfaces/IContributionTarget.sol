pragma solidity 0.5.8;


contract IContributionTarget {
    modifier onlyOwnerOrLocalNode() {_;}

    function deposit(address contributor, uint256 amount) external;
}