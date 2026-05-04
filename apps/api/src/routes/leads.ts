// Lead Routes — CRUD, filtering, detail
import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';

export async function leadRoutes(app: FastifyInstance) {
  // List leads with filters
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const userId = (request.user as any).id;
    const { niche, city, minScore, stage, limit, offset } = request.query as {
      niche?: string;
      city?: string;
      minScore?: string;
      stage?: string;
      limit?: string;
      offset?: string;
    };

    const where: any = { userId };
    if (niche) where.niche = { contains: niche, mode: 'insensitive' };
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (minScore) where.overallScore = { gte: parseInt(minScore) };
    if (stage) where.pipelineStage = stage;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { overallScore: 'desc' },
      take: parseInt(limit || '50'),
      skip: parseInt(offset || '0'),
    });

    const total = await prisma.lead.count({ where });

    return { leads, total, limit: parseInt(limit || '50'), offset: parseInt(offset || '0') };
  });

  // Get lead detail
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as any).id;

    const lead = await prisma.lead.findFirst({
      where: { id, userId },
      include: {
        signals: { orderBy: { detectedAt: 'desc' }, take: 10 },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!lead) return reply.status(404).send({ error: 'Lead not found' });

    return { lead };
  });

  // Update lead (stage, notes, tags)
  app.patch('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request.user as any).id;
    const updates = request.body as {
      pipelineStage?: string;
      notes?: string;
      tags?: string[];
    };

    const lead = await prisma.lead.findFirst({ where: { id, userId } });
    if (!lead) return reply.status(404).send({ error: 'Lead not found' });

    const updated = await prisma.lead.update({
      where: { id },
      data: updates,
    });

    // Log activity if stage changed
    if (updates.pipelineStage && updates.pipelineStage !== lead.pipelineStage) {
      await prisma.activity.create({
        data: {
          leadId: id,
          type: 'STAGE_CHANGED',
          detail: `Stage changed: ${lead.pipelineStage} → ${updates.pipelineStage}`,
        },
      });
    }

    return { lead: updated };
  });
}
