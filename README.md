# Kolektyw3 Access

Coworking spaces that accept crypto payments still rely on a human to check the transaction and manually send a door code — Kolektyw3 Access removes that bottleneck entirely, turning a single wallet interaction into instant, verifiable physical access.

## Features

- **Buy with USDC, get a door code** — pay $20 USDC from any Ethereum wallet, receive a soulbound membership NFT and a door access code, all in one flow with no ETH needed for gas.
- **Buy with Stripe, get a code by email** — pay by card via Stripe Checkout; a door code is sent to your email the moment payment clears.
- **Request a VAT invoice** — after purchase, non-Polish companies receive a bilingual PDF invoice by email; Polish entities get a KSeF-ready e-invoice.
- **Admin code management** — operators upload door codes through a SIWE-authenticated admin page or via a Bearer-token-protected API; codes are queued in Redis and dispensed one-per-purchase.

## Core technology

| | |
|---|---|
| **SIWE** | Sign-In with Ethereum authenticates admin actions and ties on-chain identity to off-chain sessions without passwords. |
| **ERC-721 NFT** | Soulbound (non-transferable) membership token tracks active access on-chain; door verification checks `hasValidMembership()` directly. |
| **USDC** | Payments settle in USDC on Base; `transferFrom` is called inside `mint()` so approval and purchase happen atomically. |

## How it works

```
Crypto purchase
  User ──── pay 20 USDC ────────> Frontend ──── mint() ──────> NFT contract
                                       │<─── NFT confirmed ──────────┘
                                       │──── dequeue code ─────> Redis
  User <─── door code ────────────────┘

Card purchase
  User ──── Stripe Checkout ──────> Stripe ──── webhook ──────> /api/stripe-webhook
                                                                      │──── dequeue code ─> Redis
  User <─── code by email ──────────────────────────────────────────┘

Door verification
  Member ── scan QR ──────────────> Admin tablet ──── hasValidMembership() ──> contract
                                                   └── verify SIWE session ──> ✓ door opens
```

## Setup

See [DEPLOYMENT.md](./DEPLOYMENT.md) for environment variables, contract deployment, and Vercel setup.
