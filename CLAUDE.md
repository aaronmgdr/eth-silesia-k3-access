# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kolektyw3 Access** — A decentralized membership system for coworking spaces that turns Ethereum wallets into physical keys. Users purchase membership NFTs with a single USDC transaction (gasless via Account Abstraction), receive a time-bound digital key (EIP-712 signed QR code with 5-minute expiry), and gate physical access by verifying on-chain NFT ownership.

Built for **ETHSilesia 2026** hackathon. Target demo: < 60 seconds from fresh email signup to door access.

## Tech Stack

- **Frontend**: React, Next.js (App Router)
- **Smart Contracts**: Solidity (Foundry), deployed on Base Sepolia
- **Membership Standard**: ERC-721 (soulbound, non-transferable)
- **Payment & Approval**: Permit2 (EIP-2612) + USDC
- **Identity**: Para SDK (embedded wallets for email/social, unified connector for external wallets)
- **Account Abstraction**: Paymaster sponsorship (gasless for users)
- **Key Generation**: EIP-712 signed payloads (time-bound QR codes)
- **Verification**: viem (off-chain signature verification), on-chain NFT balance checks

## Setup & Commands

### Install Dependencies
```bash
pnpm install
```

### Development
```bash
pnpm dev          # Start Next.js dev server
pnpm build        # Build for production
pnpm lint         # Run linter
```

### Testing
```bash
pnpm test         # Run all tests
pnpm test path/to/test  # Run specific test
```

### Smart Contracts (Foundry)
```bash
forge build       # Compile contracts
forge test        # Run contract tests
forge deploy      # Deploy contracts (configure network/key management)
```

## Architecture

### User Flows

**Flow A: Newbie (Social Onboarding)**
1. Sign up via email/passkey (Para embedded wallet)
2. Dashboard shows "Purchase Day Pass" (USDC payment)
3. Permit2 bundling: approval + mint in one click (paymaster sponsors gas)
4. Success → receive EIP-712 signed digital key (QR code, 5-min expiry)

**Flow B: Pro (DeFi Native)**
1. Connect external wallet (Uniswap/Rainbow via Para unified connector)
2. Buy membership in single click (Permit2 signature)
3. Paymaster abstracts gas → user only pays USDC
4. Receive dynamic QR key with sliding 5-minute window

**Flow C: Admin (Door Verification)**
1. Tablet/admin device scans QR code string
2. Off-chain: `viem.verifyTypedData()` checks signature ownership
3. On-chain: `contract.balanceOf(address)` confirms active membership
4. Both pass → UI flashes green, triggers door unlock (webhook or mock)

### Smart Contracts (Solidity + Foundry)

**Kolektyw3AccessNFT (ERC-721, soulbound)**
```solidity
function mintWithPermit(
  address user,
  uint256 tier,
  bytes calldata permitSignature
) external
```
- Verifies Permit2 signature
- Transfers USDC to treasury
- Mints soulbound NFT to user
- No transferability (soulbound)

**Key Contract Functions**
- `balanceOf(address)` — check active membership (door verification)
- `tokenURI(uint256)` — metadata endpoint

### Frontend Architecture

**Pages**
- `/` — Landing + wallet/email connect (Para)
- `/dashboard` — User profile, active memberships, generate key
- `/purchase` — Membership tier selection → Permit2 signing flow
- `/key` — Generate time-bound QR code (EIP-712 payload)
- `/admin` — Scanner page, QR verification, signature + NFT balance validation

**Key Libs**
- `viem` — signature verification, contract calls, EIP-712 payload construction
- Para SDK — embedded wallets, wallet connection, transaction relay
- `ethers.js` or `viem` — Permit2 integration, contract interaction

### Account Abstraction & Paymaster

- All user transactions routed through paymaster
- Paymaster sponsors ETH gas cost
- Users pay only USDC (converted at sponsor end)
- Para SDK handles AA integration transparently

### EIP-712 Digital Key

QR payload structure:
```
- Signed by user's wallet
- QR encodes: address + validUntil + signature
- 5-minute sliding window (new QR generated on each refresh)
- Prevents replay & screenshot sharing

## Development Notes

- **Network**: Base Sepolia for development, Base mainnet for production
- **Permit2**: Requires USDC approval on-chain (handled by Permit2 signature, not separate approval tx)
- **Para Setup**: Configure app ID, embedded wallet provider, connector whitelist (Uniswap, Rainbow, etc.)
- **Paymaster**: Set up sponsor account with sufficient USDC for gas covering
- **EIP-712 Validation**: Always verify signature matches expected domain & message structure
- **Door Lock Integration**: Demo uses simple webhook or UI success; production would trigger physical lock via IoT API

## Project Structure

```
kolektyw3-access/
├── packages/
│   ├── contracts/          # Solidity + Foundry
│   │   ├── src/Kolektyw3AccessNFT.sol
│   │   ├── test/
│   │   ├── script/Deploy.s.sol
│   │   ├── scripts/deploy-local.sh
│   │   ├── foundry.toml
│   │   └── .env.example
│   └── app/                # Next.js frontend
│       ├── app/
│       │   ├── page.tsx
│       │   ├── api/verify-nft/
│       │   └── ...
│       ├── lib/
│       │   ├── contract.ts
│       │   └── codePool.ts
│       ├── components/
│       └── .env.example
├── DEPLOY.md              # Deployment instructions
├── SETUP.md               # Development setup
└── pnpm-workspace.yaml
```

## Environment Variables

- **Contracts**: `packages/contracts/.env` — copy from `.env.example`
- **Frontend**: `packages/frontend/.env.local` — copy from `.env.example`

## Deployment

**See `DEPLOY.md` for complete deployment instructions** covering:
- Local testing with Anvil
- Base Sepolia testnet
- Base mainnet production

## Testing Strategy

**Smart Contracts**
```bash
forge test                      # Run all tests
forge test --match-contract Kolektyw3AccessNFT  # Single contract
```

**Frontend**
```bash
pnpm dev                        # Local dev, test flows manually
pnpm test                       # Unit tests (if applicable)
```

**Integration Testing**
- Permit2 signature generation → contract mint
- Para embedded wallet → transaction signing
- EIP-712 payload → signature verification (viem.verifyTypedData)
- NFT balance → door access decision
