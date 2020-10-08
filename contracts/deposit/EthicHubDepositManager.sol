/*
    Copyright (C) 2020 EthicHub
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
    address public relayer;
    address public tokenBridge;
   
    modifier onlyRelayer() {
        require(relayer == msg.sender);
        _;
    }

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

    function setTokenBridge(address _tokenBridge) external onlyOwner {
        tokenBridge = _tokenBridge;
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
            ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "investor", contributor))) ||
            ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "representative", contributor))),
            "Contributor is not registered lender or borrower"
        );
        
        require(
            stableCoin.balanceOf(_msgSender()) >= amount &&
            stableCoin.allowance(_msgSender(), address(this)) >= amount,
            "No balance allowed to transfer or insufficient amount"
        );
        require(
            amount > 0, "Amount cannot be 0"
        );

        require(stableCoin.transferFrom(_msgSender(), address(target), amount), "transferFrom dai failed");
        IContributionTarget(target).deposit(contributor, amount);
    }


    function sendToBridge(address _sender, uint256 _amount) external onlyRelayer {
        require(stableCoin.transferFrom(_sender, tokenBridge, _amount), "transferFrom stable coin failed");
    }

    function setRelayHubAddress(address relayAddress) public onlyOwner {
        _upgradeRelayHub(relayAddress);
    }

    function setTrustedRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }

}