# frontend

Next.js 16 (App Router) frontend for Kolektyw3 Access.

## Stack

- **Next.js 16 / React 19** — App Router, server components, route handlers
- **Reown AppKit + wagmi** — wallet connection (injected, WalletConnect, Coinbase)
- **viem** — contract reads, SIWE verification, EIP-712
- **Upstash Redis** — nonce store, code queue, receipt storage
- **Stripe** — card checkout webhook handler
- **Resend** — transactional email (door codes, PDF invoices)
- **@react-pdf/renderer** — server-side PDF invoice generation
- **Tailwind CSS 4**

## Local setup

```bash
cp .env.example .env.local
# fill in values (see table below)
pnpm install
pnpm dev          # http://localhost:3001
```

## Environment variables

| Variable | Secret | Description |
|---|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | no | `31337` / `84532` / `8453` |
| `NEXT_PUBLIC_RPC_URL` | no | RPC endpoint for the chain |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | no | Deployed `Kolektyw3AccessNFT` address |
| `NEXT_PUBLIC_USDC_ADDRESS` | no | USDC contract on the chosen chain |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | no | Reown/WalletConnect project ID |
| `NEXT_PUBLIC_DEMO_MODE` | no | `true` to show hackathon disclaimer, skip real invoices |
| `UPSTASH_REDIS_REST_URL` | yes | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | yes | Upstash Redis REST token |
| `STRIPE_SECRET_KEY` | yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | yes | Stripe webhook signing secret |
| `RESEND_API_KEY` | yes | Resend API key |
| `RESEND_FROM_EMAIL` | no | Sender address (default `kolektyw3@resend.dev`) |
| `ADMIN_CODE_SETTERS` | yes | Colon-separated list of admin 0x addresses |
| `CODE_ADMIN_KEY` | yes | Bearer token for machine-to-machine code uploads |
| `KSEF_ENABLED` | no | `true` to activate KSeF e-invoice submission |

## Project structure

```
app/
  page.tsx                   Landing — wallet connect, purchase CTA
  access/page.tsx            Post-purchase — show door code, request receipt
  buy/page.tsx               USDC purchase flow (AppKit + contract write)
  admin/codes/page.tsx       Admin — upload door codes (SIWE-gated)
  api/
    nonce/                   GET — issue SIWE nonce (stored in Redis, 5-min TTL)
    verify-nft/              POST — verify SIWE + NFT ownership, return door code
    receipt/                 POST — save billing details, send PDF or KSeF invoice
    stripe-webhook/          POST — handle Stripe payment, email door code
    admin/codes/             POST — upload code batch (SIWE or Bearer token)

lib/
  chain.ts                   Single source of truth for active chain config
  contract.ts                viem publicClient + contract ABI helpers
  site.ts                    Company identity (name, address, NIP, IBAN…)
  code-service.ts            Redis code queue: enqueue / dequeue / list
  nonce-store.ts             Redis-backed SIWE nonce store
  invoice-pdf.tsx            @react-pdf/renderer component — bilingual A4 invoice
  invoice-sender.ts          Render PDF buffer → send via Resend
  ksef/                      KSeF e-invoicing (Polish NIP path)
    types.ts                 Shared TypeScript types
    builder.ts               Build KSeFInvoice from receipt data + NBP rate
    client.ts                Stubbed KSeF API client (set KSEF_ENABLED=true)
    index.ts                 Feature-flagged entry point

context/
  AuthContext.tsx            SIWE session state, sign-in / sign-out

components/
  DayPassPurchase.tsx        USDC mint flow + code display + localStorage cache
  ReceiptForm.tsx            Billing details form (name, address, NIP/VAT, email)
```

## Key flows

### USDC purchase → door code

1. User connects wallet via AppKit (`useAppKitAccount`).
2. `DayPassPurchase` approves USDC spend and calls `mint(address)` on the contract.
3. On confirmation, `POST /api/verify-nft` is called with a SIWE message + signature.
4. Server verifies signature (`verifySiweMessage`), checks `hasValidMembership` on-chain, dequeues a code from Redis (`kolektyw3:codes:queue`).
5. Code is returned to the browser and cached in localStorage under `kolektyw3:code:{address}`.

### Stripe purchase → email

1. User clicks the Stripe Checkout link (configured per event).
2. Stripe sends `charge.succeeded` to `POST /api/stripe-webhook`.
3. Webhook dequeues a code and emails it via Resend.

### Admin code upload

Two auth paths accepted by `POST /api/admin/codes`:

- **Bearer token** — `Authorization: Bearer $CODE_ADMIN_KEY` (CI/scripts).
- **SIWE** — send `{ message, signature }` from an address in `ADMIN_CODE_SETTERS`.

Paste raw text: comma/pipe-delimited CSV or a Markdown table. The parser skips header rows and `|---|` separator lines automatically.

### PDF invoice

On `POST /api/receipt` with `vatType: 'other'` (non-Polish entity):

1. `buildInvoice(receipt)` fetches the NBP USD→PLN rate and constructs a `KSeFInvoice`.
2. `renderToBuffer(<InvoiceDocument invoice={...} />)` generates the PDF server-side.
3. Resend attaches the PDF and delivers it to `receipt.email`.

In `NEXT_PUBLIC_DEMO_MODE=true`, a plain-text acknowledgement is sent instead of a real invoice.

### KSeF (Polish VAT)

On `POST /api/receipt` with `vatType: 'pl'`:

- `issueInvoice(receipt)` is called fire-and-forget.
- It no-ops unless `KSEF_ENABLED=true`.
- With the flag set, `buildInvoice` constructs the FA(2) invoice object; `submitInvoice` in `lib/ksef/client.ts` is a stub with three clear TODOs: session auth, FA(2) XML serialization, persistent sequence counter.

## Chain config

`lib/chain.ts` is the single source of truth. Every file that needs a chain object imports `activeChain` from there — never hardcode chain IDs or import chain objects directly from viem/wagmi elsewhere.

## SIWE session

`context/AuthContext.tsx` manages sign-in state. The session is keyed to the connected address; switching wallets clears it. Nonces are single-use and stored in Redis with a 5-minute TTL to prevent replay attacks.
