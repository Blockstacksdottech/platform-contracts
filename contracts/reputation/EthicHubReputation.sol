pragma solidity 0.5.13;

import "@openzeppelin/contracts/math/SafeMath.sol";

import '../EthicHubBase.sol';
import './EthicHubReputationInterface.sol';
import "../storage/EthicHubStorageInterface.sol";

contract EthicHubReputation is EthicHubReputationInterface, EthicHubBase {
    using SafeMath for uint;

    // 10 with 2 decilmals
    uint constant maxReputation = 1000;
    uint constant reputationStep = 100;

    // Tier 1 x 20 people
    uint constant minProyect = 20;
    uint constant public initReputation = 500;

    // 0.05
    uint constant incrLocalNodeMultiplier = 5;

    event ReputationUpdated(address indexed affected, uint newValue);

    /*** Modifiers ************/

    /// @dev Only allow access from the latest version of a contract in the Rocket Pool network after deployment
    modifier onlyUsersContract() {
        require(
            ethicHubStorage.getAddress(keccak256(abi.encodePacked("contract.name", "users"))) == msg.sender,
            "Caller is not users contract"
            );
        _;
    }

    modifier onlyLendingContract() {
        require(
            ethicHubStorage.getAddress(keccak256(abi.encodePacked("contract.address", msg.sender))) == msg.sender,
            "Caller is not lending contract"
            );
        _;
    }

    /// @dev constructor
    constructor(EthicHubStorageInterface _ethicHubStorage) public {
        EthicHubBase.initialize(_ethicHubStorage, 2);
    }

    function burnReputation(uint delayDays) external onlyLendingContract {
        address lendingContract = msg.sender;

        //Get temporal parameters
        uint maxDelayDays = ethicHubStorage.getUint(keccak256(abi.encodePacked("lending.maxDelayDays", lendingContract)));
        emit ReputationUpdated(msg.sender, maxDelayDays);
        require(maxDelayDays != 0, "Max delay should be different than 0");
        require(delayDays != 0, "Max delayDays should be different than 0");

        //Affected players
        address community = ethicHubStorage.getAddress(keccak256(abi.encodePacked("lending.community", lendingContract)));
        require(community != address(0), "Community address should be valid");
        //Affected local node
        address localNode = ethicHubStorage.getAddress(keccak256(abi.encodePacked("lending.localNode", lendingContract)));
        require(localNode != address(0), "Community address should be valid");

        //***** Community
        uint previousCommunityReputation = ethicHubStorage.getUint(keccak256(abi.encodePacked("community.reputation", community)));
        //Calculation and update
        uint newCommunityReputation = burnCommunityReputation(delayDays, maxDelayDays, previousCommunityReputation);
        ethicHubStorage.setUint(keccak256(abi.encodePacked("community.reputation", community)), newCommunityReputation);
        emit ReputationUpdated(community, newCommunityReputation);

        //***** Local node
        uint previousLocalNodeReputation = ethicHubStorage.getUint(keccak256(abi.encodePacked("localNode.reputation", localNode)));
        uint newLocalNodeReputation = burnLocalNodeReputation(delayDays, maxDelayDays, previousLocalNodeReputation);
        ethicHubStorage.setUint(keccak256(abi.encodePacked("localNode.reputation", localNode)), newLocalNodeReputation);
        emit ReputationUpdated(localNode, newLocalNodeReputation);
    }

    function incrementReputation(uint completedProjectsByTier) external onlyLendingContract {
        address lendingContract = msg.sender;
        //Affected players
        address community = ethicHubStorage.getAddress(keccak256(abi.encodePacked("lending.community", lendingContract)));
        require(community != address(0));
        //Affected local node
        address localNode = ethicHubStorage.getAddress(keccak256(abi.encodePacked("lending.localNode", lendingContract)));
        require(localNode != address(0));

        //Tier
        uint projectTier = ethicHubStorage.getUint(keccak256(abi.encodePacked("lending.tier", lendingContract)));
        require(projectTier > 0);
        require(completedProjectsByTier > 0);

        //***** Community
        uint previousCommunityReputation = ethicHubStorage.getUint(keccak256(abi.encodePacked("community.reputation", community)));
        //Calculation and update
        uint newCommunityReputation = incrementCommunityReputation(previousCommunityReputation, completedProjectsByTier);
        ethicHubStorage.setUint(keccak256(abi.encodePacked("community.reputation", community)), newCommunityReputation);
        emit ReputationUpdated(community, newCommunityReputation);

        //***** Local node
        uint borrowers = ethicHubStorage.getUint(keccak256(abi.encodePacked("lending.communityMembers", lendingContract)));
        uint previousLocalNodeReputation = ethicHubStorage.getUint(keccak256(abi.encodePacked("localNode.reputation", localNode)));
        uint newLocalNodeReputation = incrementLocalNodeReputation(previousLocalNodeReputation, projectTier, borrowers);
        ethicHubStorage.setUint(keccak256(abi.encodePacked("localNode.reputation", localNode)), newLocalNodeReputation);
        emit ReputationUpdated(localNode, newLocalNodeReputation);
    }

    function incrementCommunityReputation(uint previousReputation, uint completedProjectsByTier) public pure returns(uint) {
        require(completedProjectsByTier > 0);
        uint nextRep = previousReputation.add(reputationStep.div(completedProjectsByTier));
        if (nextRep >= maxReputation) {
            return maxReputation;
        } else {
            return nextRep;
        }
    }

    function incrementLocalNodeReputation(uint previousReputation, uint tier, uint borrowers) public pure returns(uint) {
        require(tier >= 1, "Tier needs to be >=1");
        //this should 20 but since it's hardcoded in EthicHubLending, let's be safe.
        //TODO store min borrowers in EthicHubStorage
        require(borrowers > 0, "Borrowers cannot be zero");
        uint increment = (tier.mul(borrowers).div(minProyect)).mul(incrLocalNodeMultiplier);
        uint nextRep = previousReputation.add(increment);
        if (nextRep >= maxReputation) {
            return maxReputation;
        } else {
            return nextRep;
        }
    }

    function burnLocalNodeReputation(uint delayDays, uint maxDelayDays, uint prevReputation) public pure returns(uint) {
        if (delayDays >= maxDelayDays){
            return 0;
        }
        uint decrement = prevReputation.mul(delayDays).div(maxDelayDays);
        if (delayDays < maxDelayDays && decrement < reputationStep) {
            return prevReputation.sub(decrement);
        } else {
            return prevReputation.sub(reputationStep);
        }
    }

    function burnCommunityReputation(uint delayDays, uint maxDelayDays, uint prevReputation) public pure returns(uint) {
        if (delayDays < maxDelayDays) {
            return prevReputation.sub(prevReputation.mul(delayDays).div(maxDelayDays));
        } else {
            return 0;
        }
    }

    function initLocalNodeReputation(address localNode) onlyUsersContract external {
        require(ethicHubStorage.getUint(keccak256(abi.encodePacked("localNode.reputation", localNode))) == 0);
        ethicHubStorage.setUint(keccak256(abi.encodePacked("localNode.reputation", localNode)), initReputation);
    }

    function initCommunityReputation(address community) onlyUsersContract external {
        require(ethicHubStorage.getUint(keccak256(abi.encodePacked("comunity.reputation", community))) == 0);
        ethicHubStorage.setUint(keccak256(abi.encodePacked("community.reputation", community)), initReputation);
    }

    function getCommunityReputation(address target) public view returns(uint256) {
        return ethicHubStorage.getUint(keccak256(abi.encodePacked("community.reputation", target)));
    }

    function getLocalNodeReputation(address target) public view returns(uint256) {
        return ethicHubStorage.getUint(keccak256(abi.encodePacked("localNode.reputation", target)));
    }

}
