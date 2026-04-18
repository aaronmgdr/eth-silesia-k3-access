import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { codeService } from '@/lib/code-service';
import { emailService } from '@/lib/email-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    if (event.type === 'charge.succeeded') {
      const charge = event.data.object as Stripe.Charge;

      // Get customer email from charge metadata or customer
      const customerEmail = charge.metadata?.email || charge.receipt_email;
      const identifier = charge.metadata?.identifier || customerEmail;

      if (!customerEmail || !identifier) {
        console.error('No customer email or identifier found in charge');
        return NextResponse.json(
          { error: 'No customer email or identifier' },
          { status: 400 }
        );
      }

      // Dequeue (atomically get and mark as used) an access code
      const code = await codeService.dequeueCode(identifier);

      if (!code) {
        console.error('No available codes for', identifier);
        return NextResponse.json(
          { error: 'No available codes' },
          { status: 500 }
        );
      }

      // Send email with code
      await emailService.sendAccessCode(customerEmail, code);

      console.log(`Code ${code} sent to ${identifier}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
