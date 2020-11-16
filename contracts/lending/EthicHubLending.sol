pragma solidity 0.5.13;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/lifecycle/Pausable.sol";

import "../EthicHubBase.sol";
import "../storage/EthicHubStorageInterface.sol";

contract EthicHubLending is Pausable, Ownable {
    using SafeMath for uint256;

    enum LendingState {
        Uninitialized,
        AcceptingContributions,
        Funded,
        AwaitingReturn,
        ProjectNotFunded,
        ContributionReturned,
        Default
    }

    uint8 public version;
    EthicHubStorageInterface public ethicHubStorage;

    mapping(address => Investor) public investors;
    uint256 public investorCount;
    uint256 public reclaimedContributions;
    uint256 public fundingStartTime; // Start time of contribution period in UNIX time
    uint256 public fundingEndTime; // End time of contribution period in UNIX time
    uint256 public totalContributed;

    bool public capReached;

    LendingState public state;

    uint256 public annualInterest;
    uint256 public totalLendingAmount;
    uint256 public lendingDays;
    uint256 public borrowerReturnDays;
    uint256 public maxDelayDays;

    address payable public borrower;
    address public localNode;
    address payable public ethicHubTeam;
    address payable public systemFeesCollector;

    uint256 public ethichubFee;
    uint256 public systemFees;

    // Interest rate is using base uint 100 and 100% 10000, this means 1% is 100
    // this guarantee we can have a 2 decimal presicion in our calculation
    uint256 public constant interestBaseUint = 100;
    uint256 public constant interestBasePercent = 10000;

    bool public systemFeesReclaimed;
    bool public ethicHubTeamFeeReclaimed;

    uint256 public returnedAmount;

    struct Investor {
        uint256 amount;
        bool isCompensated;
    }

    // Events
    event CapReached(uint endTime);
    event Contribution(uint totalContributed, address indexed investor, uint amount, uint investorsCount);
    event Compensated(address indexed contributor, uint amount);
    event StateChange(uint state);
    event ReturnAmount(address indexed borrower, uint amount);
    event BorrowerChanged(address indexed newBorrower);
    event InvestorChanged(address indexed oldInvestor, address indexed newInvestor);
    event Reclaim(address indexed target, uint256 amount);

    modifier checkIfArbiter() {
        address arbiter = ethicHubStorage.getAddress(keccak256(abi.encodePacked("arbiter", this)));
        require(arbiter == msg.sender, "Sender not authorized");
        _;
    }

    modifier onlyOwnerOrLocalNode() {
        require(localNode == msg.sender || owner() == msg.sender,"Sender not authorized");
        _;
    }

    constructor(
        uint256 _fundingStartTime,
        uint256 _fundingEndTime,
        uint256 _annualInterest,
        uint256 _totalLendingAmount,
        uint256 _lendingDays,
        uint256 _ethichubFee,
        uint256 _systemFees,
        address payable _borrower,
        address payable _localNode,
        address payable _ethicHubTeam,
        address _ethicHubStorage,
        uint256 _maxDelayDays,
        address payable _systemFeesCollector
        ) public {
        require(address(_ethicHubStorage) != address(0), "Storage address cannot be zero address");

        ethicHubStorage = EthicHubStorageInterface(_ethicHubStorage);
        version = 10;
        
        require(_fundingEndTime > fundingStartTime, "fundingEndTime should be later than fundingStartTime");
        require(_borrower != address(0), "No borrower set");
        require(ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "representative", _borrower))), "Borrower not registered representative");
        require(_localNode != address(0), "No Local Node set");
        require(_ethicHubTeam != address(0), "No EthicHub Team set");
        require(ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "localNode", _localNode))), "Local Node is not registered");
        require(_totalLendingAmount > 0, "_totalLendingAmount must be > 0");
        require(_lendingDays > 0, "_lendingDays must be > 0");
        require(_annualInterest > 0 && _annualInterest < 100, "_annualInterest must be between 0 and 100");
        require(_systemFeesCollector != address(0));
        maxDelayDays = _maxDelayDays;
        reclaimedContributions = 0;
        borrowerReturnDays = 0;

        fundingStartTime = _fundingStartTime;
        fundingEndTime = _fundingEndTime;
        annualInterest = _annualInterest;
        totalLendingAmount = _totalLendingAmount;
        lendingDays = _lendingDays;
        ethichubFee = _ethichubFee;
        systemFees = _systemFees;

        borrower = _borrower;
        localNode = _localNode;
        systemFeesCollector = _systemFeesCollector;
        ethicHubTeam = _ethicHubTeam;

        state = LendingState.AcceptingContributions;

        Ownable.initialize(msg.sender);
        Pausable.initialize(msg.sender);
    }

    function setBorrower(address payable _borrower) external checkIfArbiter {
        require(_borrower != address(0), "No borrower set");
        require(ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "representative", _borrower))), "Borrower not registered representative");

        borrower = _borrower;

        emit BorrowerChanged(borrower);
    }

    function changeInvestorAddress(address _oldInvestor, address payable _newInvestor) external checkIfArbiter {
        require(_newInvestor != address(0));
        require(ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "investor", _newInvestor))));
        require(investors[_oldInvestor].amount != 0, "OldInvestor should have invested in this project");
        require(
            investors[_newInvestor].amount == 0,
            "newInvestor should not have invested anything"
        );

        investors[_newInvestor].amount = investors[_oldInvestor].amount;
        investors[_newInvestor].isCompensated = investors[_oldInvestor].isCompensated;

        delete investors[_oldInvestor];

        emit InvestorChanged(_oldInvestor, _newInvestor);
    }

    function returnBorrowed() external payable {
        require(msg.sender == borrower, "In state AwaitingReturn only borrower can contribute");
        require(state == LendingState.AwaitingReturn, "State is not AwaitingReturn");

        bool projectRepayed = false;
        uint excessRepayment = 0;
        uint newReturnedAmount = 0;

        emit ReturnAmount(borrower, msg.value);

        (newReturnedAmount, projectRepayed, excessRepayment) = calculatePaymentGoal(borrowerReturnAmount(), returnedAmount, msg.value);

        returnedAmount = newReturnedAmount;

        if (projectRepayed == true) {
            borrowerReturnDays = getDaysPassedBetweenDates(fundingEndTime, now);
            changeState(LendingState.ContributionReturned);
        }

        if (excessRepayment > 0) {
            address(borrower).transfer(excessRepayment);
        }
    }

    // @notice Function to participate in contribution period
    //  Amounts from the same address should be added up
    //  If cap is reached, end time should be modified
    //  Funds should be transferred into multisig wallet
    // @param contributor Address
    function deposit(address payable contributor) external payable whenNotPaused {
        require(
            ethicHubStorage.getBool(keccak256(abi.encodePacked("user", "investor", contributor))),
            "Contributor is not registered lender"
        );
        require(state == LendingState.AcceptingContributions, "state is not AcceptingContributions");
        require(isContribPeriodRunning(), "can't contribute outside contribution period");

        uint oldTotalContributed = totalContributed;
        uint newTotalContributed = 0;
        uint excessContribAmount = 0;

        (newTotalContributed, capReached, excessContribAmount) = calculatePaymentGoal(totalLendingAmount, oldTotalContributed, msg.value);

        totalContributed = newTotalContributed;

        if (capReached) {
            fundingEndTime = now;
            emit CapReached(fundingEndTime);
            changeState(LendingState.Funded);
        }

        if (investors[contributor].amount == 0) {
            investorCount = investorCount.add(1);
        }

        if (excessContribAmount > 0) {
            address(contributor).transfer(excessContribAmount);
            investors[contributor].amount = investors[contributor].amount.add(msg.value).sub(excessContribAmount);
            emit Contribution(newTotalContributed, contributor, msg.value.sub(excessContribAmount), investorCount);
        } else {
            investors[contributor].amount = investors[contributor].amount.add(msg.value);
            emit Contribution(newTotalContributed, contributor, msg.value, investorCount);
        }
    }

    /**
     * After the contribution period ends unsuccesfully, this method enables the contributor
     *  to retrieve their contribution
     */
    function declareProjectNotFunded() external onlyOwnerOrLocalNode {
        require(totalContributed < totalLendingAmount);
        require(state == LendingState.AcceptingContributions);
        require(now > fundingEndTime);

        changeState(LendingState.ProjectNotFunded);
    }

    function declareProjectDefault() external onlyOwnerOrLocalNode {
        require(state == LendingState.AwaitingReturn);
        require(getDelayDays(now) >= maxDelayDays);
        changeState(LendingState.Default);
    }


    /**
     * Method to reclaim contribution after project is declared default (% of partial funds)
     * @param  beneficiary the contributor
     *
     */
    function reclaimContributionDefault(address payable beneficiary) external {
        require(state == LendingState.Default);
        require(!investors[beneficiary].isCompensated);

        // contribution = contribution * partial_funds / total_funds
        uint256 contribution = checkInvestorReturns(beneficiary);

        require(contribution > 0);

        investors[beneficiary].isCompensated = true;
        reclaimedContributions = reclaimedContributions.add(1);

        doReclaim(beneficiary, contribution);
    }

    /**
     * Method to reclaim contribution after a project is declared as not funded
     * @param  beneficiary the contributor
     *
     */
    function reclaimContribution(address payable beneficiary) external {
        require(state == LendingState.ProjectNotFunded, "State is not ProjectNotFunded");
        require(!investors[beneficiary].isCompensated, "Contribution already reclaimed");
        uint256 contribution = investors[beneficiary].amount;
        require(contribution > 0, "Contribution is 0");

        investors[beneficiary].isCompensated = true;
        reclaimedContributions = reclaimedContributions.add(1);

        doReclaim(beneficiary, contribution);
    }

    function reclaimContributionWithInterest(address payable beneficiary) external {
        require(state == LendingState.ContributionReturned, "State is not ContributionReturned");
        require(!investors[beneficiary].isCompensated, "Lender already compensated");
        uint256 contribution = checkInvestorReturns(beneficiary);
        require(contribution > 0, "Contribution is 0");

        investors[beneficiary].isCompensated = true;
        reclaimedContributions = reclaimedContributions.add(1);

        doReclaim(beneficiary, contribution);
    }

    function reclaimSystemFees() external {
        require(state == LendingState.ContributionReturned, "State is not ContributionReturned");
        require(systemFeesReclaimed == false, "Local Node's fee already reclaimed");
        uint256 fee = totalLendingAmount.mul(systemFees).mul(interestBaseUint).div(interestBasePercent);
        require(fee > 0, "Local Node's team fee is 0");

        systemFeesReclaimed = true;

        doReclaim(systemFeesCollector, fee);
    }

    function reclaimEthicHubTeamFee() external {
        require(state == LendingState.ContributionReturned, "State is not ContributionReturned");
        require(ethicHubTeamFeeReclaimed == false, "EthicHub team's fee already reclaimed");
        uint256 fee = totalLendingAmount.mul(ethichubFee).mul(interestBaseUint).div(interestBasePercent);
        require(fee > 0, "EthicHub's team fee is 0");

        ethicHubTeamFeeReclaimed = true;

        doReclaim(ethicHubTeam, fee);
    }

    function reclaimLeftover() external checkIfArbiter {
        require(state == LendingState.ContributionReturned || state == LendingState.Default, "State is not ContributionReturned or Default");
        require(systemFeesReclaimed, "Local Node fee is not reclaimed");
        require(ethicHubTeamFeeReclaimed, "Team fee is not reclaimed");
        require(investorCount == reclaimedContributions, "Not all investors have reclaimed their share");

        doReclaim(ethicHubTeam, address(this).balance);
    }

    function doReclaim(address payable target, uint256 amount) internal {
        uint256 contractBalance = address(this).balance;
        uint256 reclaimAmount = (contractBalance < amount) ? contractBalance : amount;
        
        address(target).transfer(reclaimAmount);

        emit Reclaim(target, reclaimAmount);
    }

    

    /**
     * Calculates if a target value is reached after increment, and by how much it was surpassed.
     * @param goal the target to achieve
     * @param oldTotal the total so far after the increment
     * @param contribValue the increment
     * @return (the incremented count, not bigger than max), (goal has been reached), (excess to return)
     */
    function calculatePaymentGoal(uint goal, uint oldTotal, uint contribValue) internal pure returns(uint, bool, uint) {
        uint newTotal = oldTotal.add(contribValue);
        bool goalReached = false;
        uint excess = 0;
        if (newTotal >= goal && oldTotal < goal) {
            goalReached = true;
            excess = newTotal.sub(goal);
            contribValue = contribValue.sub(excess);
            newTotal = goal;
        }
        return (newTotal, goalReached, excess);
    }

    function sendFundsToBorrower() external onlyOwnerOrLocalNode {
        // Waiting for Exchange
        require(state == LendingState.Funded, "State has to be AcceptingContributions");

        changeState(LendingState.AwaitingReturn);
        address(borrower).transfer(totalContributed);
    }

    /**
    * Calculates days passed after defaulting
    * @param date timestamp to calculate days
    * @return day number
    */
    function getDelayDays(uint date) public view returns(uint) {
        uint lendingDaysSeconds = lendingDays * 1 days;
        uint defaultTime = fundingEndTime.add(lendingDaysSeconds);

        if (date < defaultTime) {
            return 0;
        } else {
            return getDaysPassedBetweenDates(defaultTime, date);
        }
    }

    /**
    * Calculates days passed between two dates in seconds
    * @param firstDate timestamp
    * @param lastDate timestamp
    * @return days passed
    */
    function getDaysPassedBetweenDates(uint firstDate, uint lastDate) public pure returns(uint) {
        require(firstDate <= lastDate, "lastDate must be bigger than firstDate");
        return lastDate.sub(firstDate).div(60).div(60).div(24);
    }

    // lendingInterestRate with 2 decimal
    // 15 * (lending days)/ 365 + 4% system fee + 3% LendingDev fee
    function lendingInterestRatePercentage() public view returns(uint256){
        return annualInterest.mul(interestBaseUint)
            // current days
            .mul(getDaysPassedBetweenDates(fundingEndTime, now)).div(365)
            .add(systemFees.mul(interestBaseUint))
            .add(ethichubFee.mul(interestBaseUint))
            .add(interestBasePercent);
    }

    // lendingInterestRate with 2 decimal
    function investorInterest() public view returns(uint256){
        return annualInterest.mul(interestBaseUint).mul(borrowerReturnDays).div(365).add(interestBasePercent);
    }

    function borrowerReturnAmount() public view returns(uint256) {
        return totalLendingAmount.mul(lendingInterestRatePercentage()).div(interestBasePercent);
    }


    function isContribPeriodRunning() public view returns(bool) {
        return fundingStartTime <= now && fundingEndTime > now && !capReached;
    }

    function checkInvestorContribution(address investor) public view returns(uint256){
        return investors[investor].amount;
    }

    function checkInvestorReturns(address investor) public view returns(uint256) {
        uint256 investorAmount = 0;
        if (state == LendingState.ContributionReturned) {
            investorAmount = investors[investor].amount;
            return investorAmount.mul(investorInterest()).div(interestBasePercent);
        } else if (state == LendingState.Default){
            investorAmount = investors[investor].amount;
            // contribution = contribution * partial_funds / total_funds
            return investorAmount.mul(returnedAmount).div(totalLendingAmount);
        } else {
            return 0;
        }
    }

    function getUserContributionReclaimStatus(address userAddress) public view returns(bool isCompensated){
        return investors[userAddress].isCompensated;
    }

    function changeState(LendingState newState) internal {
        state = newState;
        emit StateChange(uint(newState));
    }
}
