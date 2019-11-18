pragma solidity 0.5.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract MockStableCoin is ERC20Detailed, ERC20 {
  constructor()
    ERC20()
    ERC20Detailed('StableCoin', 'STC', 18) public {
    _mint(address(this), 10**28); // 10.000.000.000 StableCoins
    _mint(msg.sender, 10**26); // 1.000.000.000.000 StableCoins
  }
}