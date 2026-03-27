import { Controller, Post, Body, Req, Res, Headers, HttpCode, RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeService } from './stripe.service';

@Controller()
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-checkout-session')
  async createCheckout(
    @Body() body: {
      priceId: string;
      planId: string;
      restaurantId?: string;
      successUrl: string;
      cancelUrl: string;
      customerEmail?: string;
    },
  ) {
    return this.stripeService.createCheckoutSession(body);
  }

  @Post('create-portal-session')
  async createPortal(
    @Body() body: { customerId: string; returnUrl: string },
  ) {
    return this.stripeService.createPortalSession(body);
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    try {
      const event = this.stripeService.constructWebhookEvent(
        req.rawBody!,
        signature,
      );
      const result = await this.stripeService.handleWebhookEvent(event);
      return res.json(result);
    } catch (err: any) {
      console.error('⚠️ Webhook error:', err.message);
      return res.status(400).json({ error: err.message });
    }
  }
}
