// Billing Routes — Stripe integration stubs
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function billingRoutes(app: FastifyInstance) {
  // Get current plan
  app.get('/plan', { preHandler: [app.authenticate] }, async (request) => {
    const userId = (request.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, stripeCustomerId: true },
    });

    const planLimits: Record<string, { searches: number; signals: boolean; sequences: number }> = {
      FREE: { searches: 10, signals: false, sequences: 0 },
      STARTER: { searches: 200, signals: true, sequences: 3 },
      PRO: { searches: 1000, signals: true, sequences: -1 },
      AGENCY: { searches: 5000, signals: true, sequences: -1 },
    };

    return {
      plan: user?.plan || 'FREE',
      limits: planLimits[user?.plan || 'FREE'],
      stripeCustomerId: user?.stripeCustomerId,
    };
  });

  // Create checkout session (stub)
  app.post('/checkout', { preHandler: [app.authenticate] }, async (request, reply) => {
    // TODO: implement Stripe checkout
    return reply.status(501).send({
      error: 'Stripe checkout not yet implemented',
      message: 'Set STRIPE_SECRET_KEY in .env and implement Stripe integration',
    });
  });

  // Stripe webhook (stub)
  app.post('/webhook', async (request, reply) => {
    // TODO: implement Stripe webhook handler
    return reply.status(501).send({
      error: 'Stripe webhook not yet implemented',
    });
  });
}
