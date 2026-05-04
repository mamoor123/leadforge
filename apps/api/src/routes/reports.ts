// Report Routes — Generate audit reports
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function reportRoutes(app: FastifyInstance) {
  // Generate report data for a lead
  app.get('/leads/:leadId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { leadId } = request.params as { leadId: string };
    const userId = (request.user as any).id;

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: { signals: true },
    });
    if (!lead) return reply.status(404).send({ error: 'Lead not found' });

    // Import report generator
    const { generateReportData } = await import('@leadforge/shared/services/outreach-engine');

    const reportData = generateReportData({
      businessName: lead.businessName,
      niche: lead.niche,
      city: lead.city || '',
      website: lead.website || undefined,
      websiteAnalysis: (lead.analysisData as any) || undefined,
      score: {
        overall: lead.overallScore,
        website: lead.websiteScore,
        seo: lead.seoScore,
        social: lead.socialScore,
        reviews: lead.reviewScore,
        signals: lead.signalScore,
        opportunity: 0,
        urgency: 0,
        budget: 0,
        reasoning: '',
      },
      signals: lead.signals.map((s) => ({
        type: s.type,
        title: s.title,
        description: s.description || '',
      })),
      senderName: 'LeadForge User',
      senderCompany: 'Your Company',
      senderServices: ['website design', 'SEO', 'digital marketing'],
    });

    return { report: reportData };
  });
}
