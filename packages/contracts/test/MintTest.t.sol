// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Kolektyw3AccessNFT} from "../src/Kolektyw3AccessNFT.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockUSDC is IERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function totalSupply() external pure override returns (uint256) {
        return 0;
    }

    function name() external pure returns (string memory) {
        return "Mock USDC";
    }

    function symbol() external pure returns (string memory) {
        return "USDC";
    }

    function decimals() external pure returns (uint8) {
        return 6;
    }
}

contract MintTest is Test {
    Kolektyw3AccessNFT public nft;
    MockUSDC public usdc;
    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public member = makeAddr("member");
    address public other = makeAddr("other");

    function setUp() public {
        usdc = new MockUSDC();
        nft = new Kolektyw3AccessNFT(address(usdc), treasury, owner);

        // Give member 100 USDC
        usdc.mint(member, 100e6);
    }

    function test_BasicMint() public {
        // Approve contract to spend USDC
        vm.startPrank(member);
        usdc.approve(address(nft), 20e6);

        // Mint
        uint256 tokenId = nft.mint(member);

        // Verify
        assertEq(tokenId, 1);
        assertEq(nft.ownerOf(tokenId), member);
        assertEq(nft.memberTokenId(member), tokenId);
        assertTrue(nft.hasMembership(member));

        // Verify USDC was transferred to treasury
        assertEq(usdc.balanceOf(treasury), 20e6);
        assertEq(usdc.balanceOf(member), 80e6);

        vm.stopPrank();
    }

    function test_MintInsufficientApproval() public {
        vm.startPrank(member);
        // Only approve 10 USDC
        usdc.approve(address(nft), 10e6);

        // Should fail
        vm.expectRevert("Insufficient allowance");
        nft.mint(member);

        vm.stopPrank();
    }

    function test_MintInsufficientBalance() public {
        // Give other only 10 USDC
        usdc.mint(other, 10e6);

        vm.startPrank(other);
        usdc.approve(address(nft), 20e6);

        // Should fail - insufficient balance
        vm.expectRevert("Insufficient balance");
        nft.mint(other);

        vm.stopPrank();
    }

    function test_MintTwice() public {
        vm.startPrank(member);
        usdc.approve(address(nft), 50e6);

        // First mint
        uint256 tokenId1 = nft.mint(member);
        assertEq(tokenId1, 1);
        assertTrue(nft.hasMembership(member));

        // Try to mint again immediately - should fail (membership still active)
        vm.expectRevert("Membership still active");
        nft.mint(member);

        vm.stopPrank();
    }

    function test_MintAfterExpiry() public {
        vm.startPrank(member);
        usdc.approve(address(nft), 50e6);

        // First mint
        uint256 tokenId1 = nft.mint(member);
        assertEq(tokenId1, 1);

        // Fast forward 1 day + 1 second
        vm.warp(block.timestamp + 1 days + 1);

        // Second mint should succeed (membership expired)
        uint256 tokenId2 = nft.mint(member);
        assertEq(tokenId2, 1); // Same NFT, just extended

        vm.stopPrank();
    }

    function test_MintZeroAddress() public {
        vm.startPrank(member);
        usdc.approve(address(nft), 20e6);

        vm.expectRevert("Invalid member");
        nft.mint(address(0));

        vm.stopPrank();
    }

    function test_MintNoApproval() public {
        vm.startPrank(member);
        // Don't approve anything

        vm.expectRevert("Insufficient allowance");
        nft.mint(member);

        vm.stopPrank();
    }

    function test_MintMultipleUsers() public {
        // Member 1
        vm.startPrank(member);
        usdc.approve(address(nft), 20e6);
        uint256 tokenId1 = nft.mint(member);
        assertEq(tokenId1, 1);
        vm.stopPrank();

        // Member 2 (other)
        usdc.mint(other, 100e6);
        vm.startPrank(other);
        usdc.approve(address(nft), 20e6);
        uint256 tokenId2 = nft.mint(other);
        assertEq(tokenId2, 2); // Different token IDs
        vm.stopPrank();

        // Verify both have membership
        assertTrue(nft.hasMembership(member));
        assertTrue(nft.hasMembership(other));
    }

    function test_MintVerifyBalances() public {
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        uint256 memberBefore = usdc.balanceOf(member);

        vm.startPrank(member);
        usdc.approve(address(nft), 20e6);
        nft.mint(member);
        vm.stopPrank();

        assertEq(usdc.balanceOf(treasury), treasuryBefore + 20e6);
        assertEq(usdc.balanceOf(member), memberBefore - 20e6);
    }

    function test_MintVerifyMembershipDuration() public {
        uint256 blockTime = block.timestamp;

        vm.startPrank(member);
        usdc.approve(address(nft), 20e6);
        nft.mint(member);
        vm.stopPrank();

        uint256 validUntil = nft.getMembershipValidUntil(member);
        assertEq(validUntil, blockTime + 1 days);
    }

    function test_HasValidMembership() public {
        vm.startPrank(member);
        usdc.approve(address(nft), 20e6);
        nft.mint(member);

        // Should have valid membership right after mint
        assertTrue(nft.hasValidMembership(member));

        vm.stopPrank();

        // Fast forward past expiry
        vm.warp(block.timestamp + 1 days + 1);

        // Should not have valid membership
        assertFalse(nft.hasValidMembership(member));
    }

    function test_TransferBlocked() public {
        vm.startPrank(member);
        usdc.approve(address(nft), 20e6);
        uint256 tokenId = nft.mint(member);
        vm.stopPrank();

        // Try to transfer to other - should fail (soulbound)
        vm.startPrank(member);
        vm.expectRevert(Kolektyw3AccessNFT.TransferNotAllowed.selector);
        nft.transferFrom(member, other, tokenId);
        vm.stopPrank();
    }

    function test_BurnAndRemint() public {
        vm.startPrank(member);
        usdc.approve(address(nft), 50e6);

        // First mint
        uint256 tokenId1 = nft.mint(member);
        assertTrue(nft.hasMembership(member));

        // Burn
        nft.burn(tokenId1);
        assertFalse(nft.hasMembership(member));

        // Re-mint should work and get new token ID
        uint256 tokenId2 = nft.mint(member);
        assertEq(tokenId2, 2); // New token ID
        assertTrue(nft.hasMembership(member));

        vm.stopPrank();
    }


    function test_ApprovalExactly() public {
        vm.startPrank(member);
        // Approve exactly the price, nothing more
        usdc.approve(address(nft), 20e6);
        nft.mint(member);

        // Second approve for second mint attempt
        usdc.approve(address(nft), 20e6);

        // Fast forward past expiry
        vm.warp(block.timestamp + 1 days + 1);

        // Should still succeed with exact approval
        uint256 tokenId2 = nft.mint(member);
        assertEq(tokenId2, 1); // Same token, just extended

        vm.stopPrank();
    }

    function test_MultipleRenewals() public {
        vm.startPrank(member);
        usdc.approve(address(nft), 100e6);

        // First mint
        uint256 tokenId1 = nft.mint(member);

        // Fast forward and renew 3 times
        for (uint i = 0; i < 3; i++) {
            vm.warp(block.timestamp + 1 days + 1);
            uint256 tokenId = nft.mint(member);
            assertEq(tokenId, tokenId1); // Always same token
        }

        // Verify total USDC paid
        assertEq(usdc.balanceOf(treasury), 80e6); // 4 mints × 20e6

        vm.stopPrank();
    }

    function test_MembershipExactBoundary() public {
        vm.startPrank(member);
        usdc.approve(address(nft), 50e6);
        nft.mint(member);
        vm.stopPrank();

        uint256 validUntil = nft.getMembershipValidUntil(member);

        // At exact boundary - still valid
        vm.warp(validUntil);
        assertTrue(nft.hasValidMembership(member));

        // One second past - expired
        vm.warp(validUntil + 1);
        assertFalse(nft.hasValidMembership(member));
    }


    function test_LargeAmount() public {
        // Give member large balance
        usdc.mint(member, 1000000e6);

        vm.startPrank(member);
        usdc.approve(address(nft), 1000000e6);

        uint256 tokenId = nft.mint(member);
        assertEq(tokenId, 1);
        assertEq(usdc.balanceOf(treasury), 20e6);

        vm.stopPrank();
    }

    function test_OwnerOnly() public {
        vm.startPrank(other);
        vm.expectRevert();
        nft.setMembershipPrice(50e6);
        vm.stopPrank();
    }
}
