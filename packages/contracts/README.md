# Kolektyw3 Access

Crypto-native coworking access — pay with USDC, get a door code instantly. No staff needed, no waiting.

## The problem

Coworking spaces that accept crypto payments still require a human in the loop: someone checks the transaction, sends a code, and hopes the timing works out. For ETH-native users this is friction enough to just not bother.

Kolektyw3 Access removes the human from the loop entirely. A single USDC transaction mints a soulbound membership NFT and immediately generates a time-bound QR code the member can use at the door — all in under 60 seconds from a fresh email signup.

## How it works

```
User                    Frontend                  Smart Contract         Door
 │                          │                           │                  │
 ├─ connect wallet ────────>│                           │                  │
 ├─ pay USDC + mint ───────>│──── mint() ─────────────>│                  │
 │                          │<─── NFT minted ───────────│                  │
 ├─ request QR ────────────>│                           │                  │
 │<─ EIP-712 signed key ────│  (5-min expiry window)    │                  │
 │                          │                           │                  │
 ├─ scan QR at door ─────────────────────────────────────────────────────>│
 │                          │                           │<── balanceOf() ──│
 │                          │                           │──── ✓ ──────────>│
 │<─────────────────────────────────────────────────────────── door opens ─│
```

- **Membership NFT** — soulbound ERC-721, one per address
- **Payment** — USDC; gas is sponsored so users only sign, never hold ETH
- **Key** — time-bound signed QR code with a 5-minute sliding window
- **Verification** — signature check + on-chain NFT balance; both must pass

## Project layout

```
packages/
  contracts/   Solidity (Foundry) — NFT contract, deploy scripts
  frontend/    Next.js — wallet connect, purchase flow, QR key, admin scanner
```

## Setup

### Prerequisites
- Node 20+, pnpm, Foundry

```bash
pnpm install        # install all workspace deps
forge build         # compile contracts
pnpm dev            # start frontend dev server
```

### Contracts

```bash
cp packages/contracts/.env.example packages/contracts/.env
# edit .env, then:
./packages/contracts/scripts/deploy.sh local     # Anvil
./packages/contracts/scripts/deploy.sh sepolia   # Base Sepolia
./packages/contracts/scripts/deploy.sh mainnet   # Base mainnet
```

### Frontend

```bash
cp packages/frontend/.env.example packages/frontend/.env.local
# edit .env.local (see table below), then:
pnpm dev
```

## Environment variables

### Frontend (`packages/frontend/.env.local`)

| Variable | Secret | Description |
|---|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | no | `31337` local / `84532` Base Sepolia / `8453` Base mainnet |
| `NEXT_PUBLIC_RPC_URL` | no | RPC endpoint for the chosen chain |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | no | Deployed `Kolektyw3AccessNFT` address |
| `NEXT_PUBLIC_USDC_ADDRESS` | no | USDC on the chosen chain |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | no | Your Reown/WalletConnect project ID |
| `STRIPE_SECRET_KEY` | **yes** | Stripe secret key (server-side only) |
| `STRIPE_WEBHOOK_SECRET` | **yes** | Stripe webhook signing secret |
| `RESEND_API_KEY` | **yes** | Resend API key for email delivery |

### Contracts (`packages/contracts/.env`)

| Variable | Secret | Description |
|---|---|---|
| `PRIVATE_KEY` | **yes** | Deployer private key |
| `TREASURY_ADDRESS` | no | Address that receives USDC payments |
| `OWNER_ADDRESS` | no | Contract owner (can update price/treasury) |
| `USDC_ADDRESS` | no | Overrides the per-network default in deploy script |
| `ETHERSCAN_API_KEY` | **yes** | For contract verification on BaseScan (optional) |

## Running tests

```bash
forge test              # contract unit tests
forge test -vv          # verbose
pnpm test               # frontend tests (if applicable)
```
