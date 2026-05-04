// Search Route — The main pipeline: search → scrape → score → pitch
import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { leadQueue } from '@leadforge/workers';

export async function searchRoutes(app: FastifyInstance) {
  // Full search pipeline
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = request.body as {
      niche?: string;
      city?: string;
      state?: string;
      country?: string;
      maxResults?: number;
    } | undefined;

    const niche = body?.niche;
    const city = body?.city;
    const state = body?.state;
    const country = body?.country;
    const maxResults = body?.maxResults;

    if (!niche || !city) {
      return reply.status(400).send({ error: 'niche and city are required' });
    }

    const userId = (request.user as any).id;

    // Check plan limits
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const searchLimits: Record<string, number> = { FREE: 10, STARTER: 200, PRO: 1000, AGENCY: 5000 };
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const searchesThisMonth = await prisma.search.count({
      where: { userId, createdAt: { gte: monthStart } },
    });

    if (searchesThisMonth >= (searchLimits[user.plan] ?? 0)) {
      return reply.status(429).send({
        error: 'Search limit reached for your plan',
        limit: searchLimits[user.plan],
        upgrade: user.plan === 'FREE',
      });
    }

    // Create search record
    const search = await prisma.search.create({
      data: { userId, niche, city, state, country },
    });

    // Dispatch to worker (async pipeline)
    const job = await leadQueue.add('search-and-enrich', {
      searchId: search.id,
      userId,
      niche,
      city,
      state,
      country,
      maxResults: maxResults && maxResults > 0 ? maxResults : 20,
    });

    return {
      searchId: search.id,
      jobId: job.id,
      status: 'processing',
      message: `Searching for ${niche} businesses in ${city}...`,
    };
  });

  // Check search status
  app.get('/:searchId/status', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { searchId } = request.params as { searchId: string };
    const userId = (request.user as any).id;

    const search = await prisma.search.findFirst({
      where: { id: searchId, userId },
      include: { leads: { select: { id: true, businessName: true, overallScore: true } } },
    });

    if (!search) return reply.status(404).send({ error: 'Search not found' });

    return {
      search,
      leadCount: search.leads.length,
      status: search.leads.length > 0 ? 'complete' : 'processing',
    };
  });

  // Get leads from a search
  app.get('/:searchId/leads', { preHandler: [app.authenticate] }, async (request) => {
    const { searchId } = request.params as { searchId: string };
    const userId = (request.user as any).id;
    const { sortBy, minScore, limit } = request.query as {
      sortBy?: string;
      minScore?: number;
      limit?: number;
    };

    const validSortFields = ['overallScore', 'businessName', 'createdAt'] as const;
    const sortField = validSortFields.includes(sortBy as any) ? sortBy : 'overallScore';

    const parsedLimit = typeof limit === 'number' ? limit : parseInt(String(limit)) || 50;

    const leads = await prisma.lead.findMany({
      where: {
        searchId,
        userId,
        ...(minScore ? { overallScore: { gte: minScore } } : {}),
      },
      orderBy: { [sortField!]: 'desc' },
      take: parsedLimit,
    });

    return { leads, count: leads.length };
  });
}
