// CRM Routes — Pipeline management, notes, activities
import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';

export async function crmRoutes(app: FastifyInstance) {
  // Pipeline overview (leads grouped by stage)
  app.get('/pipeline', { preHandler: [app.authenticate] }, async (request) => {
    const userId = (request.user as any).id;

    const leads = await prisma.lead.findMany({
      where: { userId },
      select: {
        id: true,
        businessName: true,
        niche: true,
        city: true,
        overallScore: true,
        pipelineStage: true,
        lastContactedAt: true,
      },
      orderBy: { overallScore: 'desc' },
    });

    const pipeline: Record<string, typeof leads> = {};
    for (const lead of leads) {
      if (!pipeline[lead.pipelineStage]) pipeline[lead.pipelineStage] = [];
      pipeline[lead.pipelineStage].push(lead);
    }

    return {
      pipeline,
      counts: Object.fromEntries(
        Object.entries(pipeline).map(([stage, items]) => [stage, items.length])
      ),
      total: leads.length,
    };
  });

  // Add note to lead
  app.post('/leads/:leadId/notes', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { leadId } = request.params as { leadId: string };
    const userId = (request.user as any).id;
    const body = request.body as { content?: string } | undefined;
    const content = body?.content;

    if (!content) {
      return reply.status(400).send({ error: 'content is required' });
    }

    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
    if (!lead) return reply.status(404).send({ error: 'Lead not found' });

    const activity = await prisma.activity.create({
      data: {
        leadId,
        type: 'NOTE',
        detail: content,
      },
    });

    return { activity };
  });

  // Get lead activities
  app.get('/leads/:leadId/activities', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { leadId } = request.params as { leadId: string };
    const userId = (request.user as any).id;

    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
    if (!lead) return reply.status(404).send({ error: 'Lead not found' });

    const activities = await prisma.activity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { activities };
  });
}
