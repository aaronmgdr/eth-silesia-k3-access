# contracts

Solidity smart contracts for Kolektyw3 Access, built with Foundry and deployed on Base.

## Contract

**`src/Kolektyw3AccessNFT.sol`** — ERC-721 soulbound membership token.

Key design decisions:

- **Soulbound** — `_update()` reverts on any transfer where both `from` and `to` are non-zero. Minting and burning work normally.
- **Atomic payment** — `mint()` calls `USDC.transferFrom(member, treasury, membershipPrice)` before minting. No separate approval step in the happy path; callers must hold a prior ERC-20 allowance (set via Permit2 or a normal `approve`).
- **Renewable** — if a member's NFT exists but `membershipValidUntil` is in the past, `mint()` reuses the existing token ID and extends the expiry rather than minting a second token.
- **Expiry stored off-chain** — `membershipValidUntil[address]` is the authoritative expiry. The frontend calls `hasValidMembership(address)` (view function) for door checks rather than parsing token metadata.

```
membershipPrice     = 20e6  (20 USDC, 6 decimals)
membershipDuration  = 1 days
```

Both are owner-updatable via `setMembershipPrice` / `setMembershipDuration`.

## Setup

Prerequisites: [Foundry](https://book.getfoundry.sh/getting-started/installation).

```bash
forge install          # install OpenZeppelin and other deps
forge build            # compile
forge test             # run tests
forge test -vv         # verbose output
```

## Deployment

```bash
cp .env.example .env
# fill in PRIVATE_KEY, TREASURY_ADDRESS, OWNER_ADDRESS
```

```bash
# Local Anvil
./scripts/deploy.sh local

# Base Sepolia testnet
./scripts/deploy.sh sepolia

# Base mainnet
./scripts/deploy.sh mainnet
```

The deploy script reads chain config from `foundry.toml` and writes the deployed address to stdout. Copy it into `packages/frontend/.env.local` as `NEXT_PUBLIC_CONTRACT_ADDRESS`.

## Environment variables

| Variable | Secret | Description |
|---|---|---|
| `PRIVATE_KEY` | yes | Deployer wallet private key |
| `TREASURY_ADDRESS` | no | Address that receives USDC from purchases |
| `OWNER_ADDRESS` | no | Contract owner (can change price / treasury) |
| `USDC_ADDRESS` | no | Overrides per-network USDC default in deploy script |
| `ETHERSCAN_API_KEY` | yes | BaseScan verification (optional) |

## Contract interface (relevant to frontend)

```solidity
// Read
function hasValidMembership(address account) external view returns (bool);
function membershipValidUntil(address account) external view returns (uint256);
function memberTokenId(address account) external view returns (uint256);
function membershipPrice() external view returns (uint256);

// Write (requires prior USDC allowance)
function mint(address member) external returns (uint256 tokenId);
function burn(uint256 tokenId) external;

// Owner only
function setMembershipPrice(uint256 newPrice) external;
function setMembershipDuration(uint256 newDuration) external;
function setTreasury(address newTreasury) external;
```
