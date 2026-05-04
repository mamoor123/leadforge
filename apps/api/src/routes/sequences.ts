// Outreach Sequences Route
import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { generateEmailPitch, generateLinkedInPitch, generateSMSPitch, type OutreachContext } from '@leadforge/shared/services/outreach-engine';

export async function sequenceRoutes(app: FastifyInstance) {
  // List sequences
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const userId = (request.user as any).id;
    const sequences = await prisma.sequence.findMany({
      where: { userId },
      include: { steps: { orderBy: { order: 'asc' } }, _count: { select: { enrollments: true } } },
    });
    return { sequences };
  });

  // Create sequence
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = (request.user as any).id;
    const { name, channel, steps } = request.body as {
      name: string;
      channel: 'EMAIL' | 'LINKEDIN' | 'SMS';
      steps: Array<{ subject?: string; bodyTemplate: string; delayDays: number }>;
    };

    const sequence = await prisma.sequence.create({
      data: {
        userId,
        name,
        channel,
        steps: {
          create: steps.map((s, i) => ({
            order: i + 1,
            subject: s.subject,
            bodyTemplate: s.bodyTemplate,
            delayDays: s.delayDays,
          })),
        },
      },
      include: { steps: true },
    });

    return sequence;
  });

  // Enroll leads in sequence
  app.post('/:sequenceId/enroll', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { sequenceId } = request.params as { sequenceId: string };
    const { leadIds } = request.body as { leadIds: string[] };
    const userId = (request.user as any).id;

    // Verify ownership
    const sequence = await prisma.sequence.findFirst({ where: { id: sequenceId, userId } });
    if (!sequence) return reply.status(404).send({ error: 'Sequence not found' });

    const enrollments = [];
    for (const leadId of leadIds) {
      try {
        const enrollment = await prisma.sequenceEnrollment.create({
          data: { sequenceId, leadId },
        });
        enrollments.push(enrollment);

        // Log activity
        await prisma.activity.create({
          data: {
            leadId,
            type: 'STAGE_CHANGED',
            detail: `Enrolled in sequence: ${sequence.name}`,
          },
        });

        // Update lead stage
        await prisma.lead.update({
          where: { id: leadId },
          data: { pipelineStage: 'CONTACTED', lastContactedAt: new Date() },
        });
      } catch (e) {
        // Skip duplicate enrollments (unique constraint on sequenceId + leadId)
        if ((e as any)?.code === 'P2002') {
          // Prisma unique constraint violation — expected, skip silently
        } else {
          console.error(`Failed to enroll lead ${leadId}:`, (e as Error).message);
        }
      }
    }

    return { enrolled: enrollments.length };
  });

  // Generate AI pitch for a lead
  app.post('/generate-pitch', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { leadId, channel } = request.body as { leadId: string; channel: string };
    const userId = (request.user as any).id;

    const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
    if (!lead) return reply.status(404).send({ error: 'Lead not found' });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const context: OutreachContext = {
      businessName: lead.businessName,
      niche: lead.niche,
      city: lead.city || '',
      contactName: lead.contactName || undefined,
      website: lead.website || undefined,
      websiteAnalysis: (lead.analysisData as any) || undefined,
      signals: ((lead.signalData as any) || []).map((s: any) => ({
        type: s.type,
        title: s.title,
        description: s.description,
      })),
      senderName: user?.name || 'Your Name',
      senderCompany: 'Your Company',
      senderServices: ['website design', 'SEO', 'digital marketing'],
    };

    if (channel === 'LINKEDIN') {
      return generateLinkedInPitch(context);
    } else if (channel === 'SMS') {
      return { message: generateSMSPitch(context) };
    } else {
      return generateEmailPitch(context);
    }
  });

  // Get sequence stats
  app.get('/:sequenceId/stats', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { sequenceId } = request.params as { sequenceId: string };
    const userId = (request.user as any).id;

    const sequence = await prisma.sequence.findFirst({
      where: { id: sequenceId, userId },
      include: {
        enrollments: true,
        _count: { select: { enrollments: true } },
      },
    });

    if (!sequence) return reply.status(404).send({ error: 'Sequence not found' });

    const enrollments = sequence.enrollments;
    return {
      total: enrollments.length,
      active: enrollments.filter(e => e.status === 'ACTIVE').length,
      completed: enrollments.filter(e => e.status === 'COMPLETED').length,
      replied: enrollments.filter(e => e.status === 'REPLIED').length,
      bounced: enrollments.filter(e => e.status === 'BOUNCED').length,
      replyRate: enrollments.length > 0
        ? Math.round((enrollments.filter(e => e.repliedAt).length / enrollments.length) * 100)
        : 0,
    };
  });
}
