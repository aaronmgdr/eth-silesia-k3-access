# Kolektyw3 Access - Frontend & Backend

Next.js app with API routes for code distribution and NFT verification.

## Setup

```bash
# Copy environment template
cp .env.example .env.local

# Fill in your secrets (Stripe, Resend, contract addresses, etc)
nano .env.local

# Run dev server
pnpm dev
```

Visit `http://localhost:3000`

## API Routes

### POST /api/webhook/stripe
Stripe webhook listener. Triggered on successful payments.

**Flow**:
1. Extract `customer.receipt_email`
2. Fetch code from mock pool
3. Email code to customer

**Setup with Stripe CLI**:
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
# copy the signing secret to STRIPE_WEBHOOK_SECRET in .env.local
```

### POST /api/verify-nft
Verify user has membership NFT and return code.

**Request**: `{ "address": "0x..." }`

**Response**: `{ "success": true, "code": "1234", "address": "0x..." }`

## Code Pool

Mock codes in `src/lib/codePool.ts`. Replace with API call to kolektyw3's service when ready.

## TODO

1. Frontend: crypto purchase flow (Para + Permit2)
2. Frontend: code display UI
3. Integration tests
4. Production deployment
