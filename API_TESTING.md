# API Testing Guide

Test the backend endpoints directly without the frontend.

## Quick Start

1. **Start dev server**:
   ```bash
   cd packages/app
   pnpm dev
   ```

2. **Start Stripe webhook listener** (in another terminal):
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook/stripe
   ```

3. **Run test commands below** (in third terminal)

---

## Test 1: Verify NFT (Crypto Flow)

**Endpoint**: `POST /api/verify-nft`

**Request**:
```bash
curl -X POST http://localhost:3000/api/verify-nft \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x1234567890123456789012345678901234567890"
  }'
```

**Success Response** (if NFT exists):
```json
{
  "success": true,
  "code": "1234",
  "address": "0x1234567890123456789012345678901234567890"
}
```

**Error Response** (if no NFT):
```json
{
  "error": "No membership NFT found"
}
```

---

## Test 2: Stripe Webhook (Stripe Flow)

**Endpoint**: `POST /api/webhook/stripe`

### Option A: Use Stripe CLI (Recommended)

```bash
stripe trigger charge.succeeded
```

**Expected behavior**:
1. Webhook fires to `/api/webhook/stripe`
2. Server logs: `Code 1234 sent to test@example.com`
3. Check Resend dashboard for email sent

### Option B: Manual Trigger (Advanced)

First, get the webhook secret from CLI output and set `STRIPE_WEBHOOK_SECRET` in `.env.local`.

Create a test charge payload:
```bash
curl -X POST http://localhost:3000/api/webhook/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1234567890,v1=..." \
  -d '{
    "type": "charge.succeeded",
    "data": {
      "object": {
        "id": "ch_test_123",
        "receipt_email": "user@example.com",
        "billing_details": {
          "email": "user@example.com"
        }
      }
    }
  }'
```

---

## Test 3: Code Pool Status (Debug)

Check remaining codes in mock pool:

```bash
curl http://localhost:3000/api/code-pool-status
```

*(This endpoint doesn't exist yet - can add if needed for debugging)*

---

## Test 4: Full Flow (Manual)

### Crypto Payment Flow

1. **Get your wallet address** from MetaMask/Rainbow
   - Copy address: `0x...`

2. **Call verify-nft**:
   ```bash
   curl -X POST http://localhost:3000/api/verify-nft \
     -H "Content-Type: application/json" \
     -d '{"address": "0x..."}'
   ```

3. **Expected result**:
   - If NFT minted: `{"success": true, "code": "1234"}`
   - If no NFT: `{"error": "No membership NFT found"}`

### Stripe Payment Flow

1. **Open Stripe checkout**:
   - Visit: https://buy.stripe.com/14A3cvct6giUdOS9S953O08
   - Or use Stripe test card: `4242 4242 4242 4242`

2. **Webhook auto-fires**:
   - Stripe CLI captures: `charge.succeeded`
   - Backend forwards to localhost

3. **Check Resend**:
   - Go to https://resend.com/logs
   - Should see email sent to your test email
   - Email contains code (e.g., "1234")

---

## Troubleshooting API Tests

### "connection refused"
- Dev server not running on 3000
- Check: `lsof -i :3000`
- Kill and restart: `pnpm dev`

### "Internal server error" in verify-nft
- Contract address not set in `.env.local`
- RPC URL unreachable
- Check: `echo $NEXT_PUBLIC_RPC_URL`

### "Invalid signature" in webhook
- Webhook secret mismatch
- Make sure `STRIPE_WEBHOOK_SECRET` matches Stripe CLI output
- Recreate with: `stripe listen --forward-to ...`

### "No codes available"
- Mock pool exhausted (25 codes)
- Reset with: update `src/lib/codePool.ts`
- Or deploy with real kolektyw3 API

---

## Adding Debug Endpoint (Optional)

If you want to check code pool status:

```typescript
// pages/api/debug/code-pool.ts
import { getRemainingCodeCount } from '@/lib/codePool';

export async function GET() {
  return Response.json({
    remaining: getRemainingCodeCount(),
    total: 25,
  });
}
```

Then test:
```bash
curl http://localhost:3000/api/debug/code-pool
```

---

## Integration with Frontend

Once API is verified working:

1. **Frontend calls `/api/verify-nft`**:
   ```typescript
   const response = await fetch('/api/verify-nft', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ address: userAddress }),
   });
   const { code } = await response.json();
   ```

2. **Stripe webhook auto-sends email**:
   - User sees code in inbox
   - Or retrieves via dashboard (TODO)

---

## Load Testing (Advanced)

To test multiple simultaneous code requests:

```bash
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/verify-nft \
    -H "Content-Type: application/json" \
    -d "{\"address\": \"0x$(printf '%040x' $i)\"}" &
done
wait
```

Expected: 5 different codes assigned
