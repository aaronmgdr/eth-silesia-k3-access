// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Kolektyw3AccessNFT is ERC721, Ownable, ReentrancyGuard {
    error AlreadyHasMembership();
    error TransferNotAllowed();
    error InvalidPermitSignature();

    IERC20 public immutable USDC;
    address public treasury;

    uint256 public membershipPrice = 20e6; // $20 USDC (6 decimals)
    uint256 public membershipDuration = 1 days;
    uint256 private tokenIdCounter = 1;

    mapping(address => uint256) public memberTokenId;
    mapping(address => uint256) public membershipValidUntil;

    event MembershipMinted(address indexed member, uint256 indexed tokenId, uint256 validUntil);
    event MembershipBurned(address indexed member, uint256 indexed tokenId);
    event MembershipPriceUpdated(uint256 newPrice);
    event TreasuryUpdated(address indexed newTreasury);
    event MembershipDurationUpdated(uint256 newDuration);

    constructor(
        address _usdc,
        address _treasury,
        address _owner
    ) ERC721("Kolektyw3 Access", "K3A") Ownable(_owner) {
        require(_usdc != address(0), "Invalid USDC");
        require(_treasury != address(0), "Invalid treasury");

        USDC = IERC20(_usdc);
        treasury = _treasury;
    }

    function setMembershipPrice(uint256 newPrice) external onlyOwner {
        membershipPrice = newPrice;
        emit MembershipPriceUpdated(newPrice);
    }

    function setMembershipDuration(uint256 newDuration) external onlyOwner {
        require(newDuration > 0, "Duration must be positive");
        membershipDuration = newDuration;
        emit MembershipDurationUpdated(newDuration);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

function mint(address member) external nonReentrant returns (uint256 tokenId) {
        require(member != address(0), "Invalid member");
        require(treasury != address(0), "Treasury not set");

        // Transfer USDC from member to treasury
        bool success = USDC.transferFrom(member, treasury, membershipPrice);
        require(success, "USDC transfer failed");

        uint256 validUntil = block.timestamp + membershipDuration;

        // Check if member already has a membership
        if (memberTokenId[member] != 0) {
            // They have an existing membership - check if it's expired
            require(membershipValidUntil[member] < block.timestamp, "Membership still active");
            // Membership expired, extend it (reuse existing NFT)
            membershipValidUntil[member] = validUntil;
            tokenId = memberTokenId[member];
        } else {
            // No existing membership, mint new NFT
            tokenId = tokenIdCounter++;
            memberTokenId[member] = tokenId;
            _mint(member, tokenId);
        }

        membershipValidUntil[member] = validUntil;
        emit MembershipMinted(member, tokenId, validUntil);
    }

    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        address member = msg.sender;
        memberTokenId[member] = 0;
        _burn(tokenId);
        emit MembershipBurned(member, tokenId);
    }

    function hasMembership(address account) external view returns (bool) {
        return memberTokenId[account] != 0;
    }

    function hasValidMembership(address account) external view returns (bool) {
        return memberTokenId[account] != 0 && membershipValidUntil[account] >= block.timestamp;
    }

    function getMemberTokenId(address account) external view returns (uint256) {
        return memberTokenId[account];
    }

    function getMembershipValidUntil(address account) external view returns (uint256) {
        return membershipValidUntil[account];
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0)) {
            revert TransferNotAllowed();
        }
        return from;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
