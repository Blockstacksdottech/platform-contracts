pragma solidity 0.5.13;

import '../interfaces/ITokenBridge.sol';

contract MockTokenBridge is ITokenBridge {


    event LogAddress(address log);
    event LogUint (uint256 log);

    function relayTokens(address _sender, address _receiver, uint256 _amount) external {
        emit LogAddress(_sender);
        emit LogAddress(_receiver);
        emit LogUint(_amount);
    }

}
