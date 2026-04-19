# Backend API Tests

Comprehensive test suite for Kolektyw3 Access backend flows.

## Test Coverage

### API Routes

#### Receipt API (`api/receipt.test.ts`)
- Valid submissions with/without txHash
- VAT type handling (Polish vs EU)
- KSeF e-invoice triggering
- Input validation (address, name, address, VAT type, email)
- Data persistence to Redis with TTL
- Error handling

#### Stripe Webhook (`api/stripe-webhook.test.ts`)
- Charge succeeded event processing
- Code dequeue for identifier
- Email sending with access code
- Signature validation
- Missing/invalid data rejection
- Email service failure handling
- Event type filtering

### Library Tests

#### Invoice Storage (`lib/invoice-storage.test.ts`)
- Save/retrieve/clear operations
- Data persistence across form interactions
- Before-purchase scenarios (form fill without txHash)
- After-purchase scenarios (auto-submit with txHash)
- Error recovery

#### KSeF Integration (`lib/ksef.test.ts`)
- Polish VAT invoice handling
- EU VAT invoice routing (to PDF)
- Data validation
- Idempotency
- Error resilience

### Integration Tests

#### Receipt Flow (`integration/receipt-flow.test.ts`)
Complete end-to-end workflows:
1. **Fill before purchase, auto-submit after**
   - User fills invoice on /access page
   - Data saves to localStorage
   - Purchase completes → txHash available
   - System auto-submits invoice with txHash
   - Data cleared after submission

2. **Manual submission after purchase**
   - User purchases first
   - Manually fills and submits invoice
   - System includes txHash in submission

3. **Submission without purchase**
   - User can fill invoice anytime
   - Submission works even without txHash
   - txHash can be added later

4. **EU VAT handling**
   - Non-Polish companies trigger PDF invoice
   - Not routed to KSeF

5. **User feedback**
   - "Details saved" message before purchase
   - "Invoice submitted" message after auto-submit
   - Different states handled correctly

6. **Edge cases**
   - Rapid form saves
   - Data expiry handling
   - Multiple addresses with separate invoices

## Running Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run specific test file
pnpm test api/receipt.test.ts

# Run with coverage
pnpm test --coverage
```

## Mocking Strategy

- **Stripe**: Mocked `stripe.webhooks.constructEvent` for signature validation
- **Redis**: Mocked `makeRedis()` to capture data without external storage
- **KSeF/Resend**: Mocked service calls to test routing logic
- **localStorage**: Real localStorage implementation for integration tests

## Key Test Scenarios

### Before Purchase (No txHash)
```
User fills invoice → saves to localStorage → displays "Details saved"
```

### After Purchase (With txHash)
```
Purchase complete → txHash in localStorage → auto-submit invoice → display "Invoice submitted"
```

### Validation
```
All required fields: address, name, streetAddress, vatType, vatNumber, email
Optional: txHash (null before purchase, populated after)
```

## Assertions

Tests verify:
- Correct HTTP status codes (200, 400, 500)
- Proper error messages
- Service calls with correct payloads
- Data persistence and retrieval
- Cross-address isolation
- Error resilience and logging
