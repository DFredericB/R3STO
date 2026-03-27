import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2026-03-25.dahlia' as any,
    });
  }

  async createCheckoutSession(body: {
    priceId: string;
    planId: string;
    restaurantId?: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }) {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: body.priceId, quantity: 1 }],
      ...(body.customerEmail ? { customer_email: body.customerEmail } : {}),
      metadata: {
        planId: body.planId,
        restaurantId: body.restaurantId || '',
      },
      subscription_data: {
        metadata: {
          planId: body.planId,
          restaurantId: body.restaurantId || '',
        },
      },
      success_url: `${body.successUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancelUrl,
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      locale: 'fr',
    });

    return { sessionId: session.id, url: session.url };
  }

  async createPortalSession(body: { customerId: string; returnUrl: string }) {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: body.customerId,
      return_url: body.returnUrl,
    });
    return { url: session.url };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || '',
    );
  }

  async handleWebhookEvent(event: Stripe.Event) {
    console.log(`✅ Webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { planId, restaurantId } = session.metadata || {};
        console.log(`🎉 Checkout OK — plan: ${planId}, restaurant: ${restaurantId}, customer: ${session.customer}`);
        // TODO: Update DB — set restaurant plan + stripe_customer_id
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const { planId, restaurantId } = sub.metadata || {};
        console.log(`🔄 Sub updated — ${restaurantId} → ${planId} (${sub.status})`);
        // TODO: Update DB — sync plan status
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const { restaurantId } = sub.metadata || {};
        console.log(`❌ Sub canceled — ${restaurantId}`);
        // TODO: Update DB — mark as canceled
        break;
      }

      case 'invoice.payment_succeeded': {
        const inv = event.data.object as Stripe.Invoice;
        console.log(`💰 Payment OK: ${(inv.amount_paid ?? 0) / 100} CHF`);
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        console.error(`❌ Payment FAILED: ${inv.customer_email}`);
        // TODO: Send alert, flag restaurant
        break;
      }

      default:
        console.log(`Unhandled: ${event.type}`);
    }

    return { received: true };
  }
}
