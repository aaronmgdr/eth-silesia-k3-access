# Production Deployment Checklist

When ready to ship Kolektyw3 Access to production.

**For deployment instructions, see `DEPLOY.md`** (covers local, testnet, and mainnet).

## Pre-Deployment

- [ ] Contract deployed to **Base mainnet** (not testnet)
- [ ] Contract verified on BaseScan
- [ ] Treasury address set (kolektyw3's wallet)
- [ ] Owner address set (admin wallet)
- [ ] Stripe account in **live mode** (not test mode)
- [ ] Resend account verified and upgraded (if needed)
- [ ] Environment variables collected for production

## Frontend Deployment (Vercel)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Silesia Access ready for production"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Connect repo: https://vercel.com/new
   - Select `packages/app` as root directory
   - Add environment variables (see SETUP.md)
   - Deploy!

3. **Custom domain**:
   - Point domain to Vercel
   - Example: `memberships.kolektyw3.pl`



## Stripe Setup

1. **Switch to live mode**:
   - Stripe Dashboard → Settings → Account status
   - Get live API keys

2. **Configure webhook**:
   - Settings → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhook/stripe`
   - Events: `charge.succeeded`, `payment_intent.succeeded`
   - Get webhook secret

3. **Update checkout link**:
   - Create new Stripe checkout for production
   - Add product/pricing
   - Replace link in frontend

## Resend Setup

1. **Verify sender domain**:
   - Resend Dashboard → Domains
   - Add your domain (e.g., memberships@kolektyw3.pl)
   - Follow DKIM setup

2. **Update email sender**:
   - Change `from: 'memberships@ethsilesia.dev'` 
   - To: `from: 'memberships@kolektyw3.pl'`
   - In `/api/webhook/stripe`

## Code Pool Integration

Replace mock with real API:

```typescript
// src/lib/codePool.ts
export async function getNextCode(): Promise<string | null> {
  const response = await fetch(
    process.env.KOLEKTYW3_CODE_POOL_API_URL,
    {
      headers: {
        Authorization: `Bearer ${process.env.KOLEKTYW3_API_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    console.error('Failed to fetch code');
    return null;
  }
  
  const { code } = await response.json();
  return code;
}
```

Add `KOLEKTYW3_CODE_POOL_API_URL` and `KOLEKTYW3_API_KEY` to your production environment.

## Para SDK Integration (Optional)

When ready to support email-based signup:

1. Create Para account
2. Get App ID and API key
3. Add to environment variables
4. Update frontend components to use Para instead of just wagmi

## Testing Before Launch

- [ ] Create test Stripe payment → email received with code
- [ ] Verify NFT purchase → code generated correctly
- [ ] Test door access with code (if physical lock integrated)
- [ ] Check email branding/styling
- [ ] Load test: multiple simultaneous purchases
- [ ] Security review: no exposed keys, proper error handling

## Going Live Checklist

- [ ] Announce to kolektyw3
- [ ] Test with real users (beta)
- [ ] Monitor Vercel logs and Resend for issues
- [ ] Monitor contract on BaseScan for activity
- [ ] Set up alerts/monitoring:
  - Stripe webhook failures
  - High error rates in logs
  - Contract security issues

## Post-Launch

- [ ] Analytics: track conversion (Stripe → code sent)
- [ ] Collect feedback from kolektyw3
- [ ] Optimize UX based on real user data
- [ ] Plan next features (recurring memberships, etc.)

---

## Monitoring

### Vercel
- Visit: https://vercel.com/dashboard
- Check: Function logs, error rates, deployment status

### Stripe
- Dashboard: Recent charges, failed payments, webhook logs

### Resend
- Logs: Email delivery status, bounce rates

### Smart Contract
- BaseScan: Contract activity, transactions
- Example: `https://basescan.org/address/0x...`

---

## Rollback Plan

If something breaks:

**Frontend**: 
- Revert deployment on Vercel (one-click)

**Smart Contract**:
- Can't change (immutable)
- Update treasury/owner if needed

**Webhook URL**:
- Update Stripe webhook endpoint to different server
- Temporary redirect while fixing

---

## Future Improvements

- [ ] Recurring memberships (monthly, yearly)
- [ ] QR code scanning (if door hardware supports)
- [ ] User dashboard (view membership status)
- [ ] Admin panel (kolektyw3 team)
- [ ] Analytics (revenue, signup funnel)
- [ ] Multi-chain support (Polygon, Arbitrum)
