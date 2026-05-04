// Signal Routes — List and manage signals
import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';

export async function signalRoutes(app: FastifyInstance) {
  // List active signals
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const userId = (request.user as any).id;
    const { type, minSeverity, limit } = request.query as {
      type?: string;
      minSeverity?: string;
      limit?: string;
    };

    const where: any = {
      lead: { userId },
      expiresAt: { gte: new Date() },
    };
    if (type) where.type = type;
    if (minSeverity) {
      const severity = parseInt(minSeverity);
      if (!isNaN(severity)) where.severity = { gte: severity };
    }

    const parsedLimit = parseInt(limit || '50');

    const signals = await prisma.signal.findMany({
      where,
      include: {
        lead: { select: { id: true, businessName: true, niche: true, city: true, overallScore: true } },
      },
      orderBy: { severity: 'desc' },
      take: isNaN(parsedLimit) ? 50 : parsedLimit,
    });

    return { signals, count: signals.length };
  });

  // Signal summary (grouped by type)
  app.get('/summary', { preHandler: [app.authenticate] }, async (request) => {
    const userId = (request.user as any).id;

    const signals = await prisma.signal.findMany({
      where: {
        lead: { userId },
        expiresAt: { gte: new Date() },
      },
      select: { type: true, severity: true },
    });

    const summary: Record<string, { count: number; avgSeverity: number }> = {};
    for (const signal of signals) {
      if (!summary[signal.type]) {
        summary[signal.type] = { count: 0, avgSeverity: 0 };
      }
      summary[signal.type].count++;
      summary[signal.type].avgSeverity += signal.severity;
    }

    for (const key of Object.keys(summary)) {
      const entry = summary[key];
      entry.avgSeverity = entry.count > 0 ? Math.round(entry.avgSeverity / entry.count) : 0;
    }

    return { summary, totalActive: signals.length };
  });
}
