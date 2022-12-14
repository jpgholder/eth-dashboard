// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NftStaking is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable rewardsToken;
    IERC721 public immutable nftCollection;
    uint256 public immutable rewardsPerHour;

    constructor(
        address _nftCollection,
        address _rewardsToken,
        uint _rewardsPerHour
    ) {
        nftCollection = IERC721(_nftCollection);
        rewardsToken = IERC20(_rewardsToken);
        rewardsPerHour = _rewardsPerHour;
    }

    struct StakedToken {
        address staker;
        uint256 tokenId;
    }

    struct Staker {
        uint256 amountStaked;
        StakedToken[] stakedTokens;
        uint256 timeOfLastUpdate;
        uint256 unclaimedRewards;
    }

    mapping(address => Staker) public stakers;
    mapping(uint256 => address) public stakerAddress;
    mapping(uint256 => uint256) private stakedTokenIdxs;

    function stake(uint256 _tokenId) external nonReentrant {
        if (stakers[msg.sender].amountStaked > 0) {
            uint256 rewards = calculateRewards(msg.sender);
            stakers[msg.sender].unclaimedRewards += rewards;
        }

        require(
            nftCollection.ownerOf(_tokenId) == msg.sender,
            "You don't own this token!"
        );
        require(stakerAddress[_tokenId] == address(0), "Already staked!");

        nftCollection.transferFrom(msg.sender, address(this), _tokenId);
        StakedToken memory stakedToken = StakedToken(msg.sender, _tokenId);
        stakers[msg.sender].stakedTokens.push(stakedToken);
        stakers[msg.sender].amountStaked++;
        stakedTokenIdxs[_tokenId] = stakers[msg.sender].stakedTokens.length - 1;
        stakerAddress[_tokenId] = msg.sender;
        stakers[msg.sender].timeOfLastUpdate = block.timestamp;
    }

    function withdraw(uint256 _tokenId) external nonReentrant {
        require(
            stakers[msg.sender].amountStaked > 0,
            "You have no tokens staked"
        );
        require(
            stakerAddress[_tokenId] == msg.sender,
            "You don't own this token!"
        );

        uint256 rewards = calculateRewards(msg.sender);
        stakers[msg.sender].unclaimedRewards += rewards;

        uint256 tokenIdx = stakedTokenIdxs[_tokenId];
        if (stakers[msg.sender].stakedTokens[tokenIdx].staker != address(0)) {
            stakers[msg.sender].stakedTokens[tokenIdx].staker = address(0);
            stakers[msg.sender].amountStaked--;
            stakerAddress[_tokenId] = address(0);
            nftCollection.transferFrom(address(this), msg.sender, _tokenId);
            stakers[msg.sender].timeOfLastUpdate = block.timestamp;
        }
    }

    function claimRewards() external {
        uint256 rewards = calculateRewards(msg.sender) +
            stakers[msg.sender].unclaimedRewards;
        require(rewards > 0, "You have no rewards to claim");
        stakers[msg.sender].timeOfLastUpdate = block.timestamp;
        stakers[msg.sender].unclaimedRewards = 0;
        rewardsToken.safeTransfer(msg.sender, rewards);
    }

    function availableRewards(address _staker) external view returns (uint256) {
        uint256 rewards = calculateRewards(_staker) +
            stakers[_staker].unclaimedRewards;
        return rewards;
    }

    function getStakedTokens(address _user)
        external
        view
        returns (StakedToken[] memory)
    {
        if (stakers[_user].amountStaked > 0) {
            StakedToken[] memory _stakedTokens = new StakedToken[](
                stakers[_user].amountStaked
            );
            uint256 _index = 0;

            for (uint256 j = 0; j < stakers[_user].stakedTokens.length; j++) {
                if (stakers[_user].stakedTokens[j].staker != (address(0))) {
                    _stakedTokens[_index] = stakers[_user].stakedTokens[j];
                    _index++;
                }
            }

            return _stakedTokens;
        } else {
            return new StakedToken[](0);
        }
    }

    function calculateRewards(address _staker)
        internal
        view
        returns (uint256 _rewards)
    {
        return (((
            ((block.timestamp - stakers[_staker].timeOfLastUpdate) *
                stakers[_staker].amountStaked)
        ) * rewardsPerHour) / 3600);
    }
}
