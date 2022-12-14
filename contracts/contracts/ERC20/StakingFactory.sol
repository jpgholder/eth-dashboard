// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "./Staking.sol";

contract StakingPoolFactory {
    mapping(address => address[]) createdPools; // user address -> created contracts

    mapping(address => address) public tokenStakings; // token address -> staking contract address

    event PoolCreated(address poolAddress, address creatorAddress);

    function createPool(address _token, uint _duration) external {
        require(tokenStakings[_token] == address(0), "Pool already exists");
        StakingPool pool = new StakingPool(_token, _duration);
        address poolAddress = address(pool);
        createdPools[msg.sender].push(poolAddress);
        tokenStakings[_token] = poolAddress;
        pool.transferOwnership(msg.sender);
        emit PoolCreated(poolAddress, msg.sender);
    }

    function getUserPools(
        address _address
    ) external view returns (address[] memory pools) {
        pools = createdPools[_address];
    }
}
