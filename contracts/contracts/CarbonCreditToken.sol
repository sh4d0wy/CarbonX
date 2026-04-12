// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title CarbonCreditToken
/// @notice Minimal ERC20 token with unlimited supply through controlled minting.
contract CarbonCreditToken {
    string public constant name = "Carbon Credit Token";
    string public constant symbol = "CCT";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    address public owner;
    address public minter;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);

    modifier onlyOwner() {
        require(msg.sender == owner, "CarbonCreditToken: not owner");
        _;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "CarbonCreditToken: not minter");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "CarbonCreditToken: zero address");
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= value, "CarbonCreditToken: insufficient allowance");

        if (currentAllowance != type(uint256).max) {
            allowance[from][msg.sender] = currentAllowance - value;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }

        _transfer(from, to, value);
        return true;
    }

    function mint(address to, uint256 value) external onlyMinter returns (bool) {
        require(to != address(0), "CarbonCreditToken: zero address");
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "CarbonCreditToken: zero address");
        require(balanceOf[from] >= value, "CarbonCreditToken: insufficient balance");

        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}