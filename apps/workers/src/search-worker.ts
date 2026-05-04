// Search & Enrichment Worker — The heavy lifting pipeline
// Runs async: scrape Google → analyze websites → score leads → generate pitches

import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { searchBusinesses } from '@leadforge/shared/services/google-places';
import { analyzeWebsite } from '@leadforge/shared/services/website-analyzer';
import { scoreLead } from '@leadforge/shared/services/lead-scorer';
import { detectSignals, aggregateSignals } from '@leadforge/shared/services/signal-engine';
import { generateEmailPitch, generateReportData } from '@leadforge/shared/services/outreach-engine';

const prisma = new PrismaClient();
const connection = { host: process.env.REDIS_HOST || 'localhost', port: 6379 };

export const leadQueue = new Queue('lead-processing', { connection });

// ─── Worker: Process Search & Enrichment ────────────────────

const searchWorker = new Worker('lead-processing', async (job) => {
  const { searchId, userId, niche, city, state, country, maxResults } = job.data;

  console.log(`🔍 Processing search: ${niche} in ${city} (${searchId})`);

  try {
    // Step 1: Search Google Places
    await job.updateProgress({ step: 'searching', message: 'Searching Google Maps...' });

    const places = await searchBusinesses({
      niche,
      city,
      state,
      country,
      maxResults: maxResults || 20,
    });

    console.log(`📍 Found ${places.length} businesses`);

    // Step 2: Analyze each website + score + detect signals
    const leads = [];
    let processed = 0;

    for (const place of places) {
      try {
        processed++;
        await job.updateProgress({
          step: 'analyzing',
          message: `Analyzing ${place.name} (${processed}/${places.length})`,
          progress: Math.round((processed / places.length) * 100),
        });

        // Analyze website
        let websiteAnalysis = null;
        if (place.website) {
          try {
            websiteAnalysis = await analyzeWebsite(place.website);
          } catch (e) {
            console.warn(`⚠️ Failed to analyze ${place.website}:`, (e as Error).message);
          }
        }

        // Detect signals
        const signals = await detectSignals(
          '', // leadId not yet created
          place.website,
          place.placeId,
          niche,
          city,
        );

        const aggregatedSignals = aggregateSignals(signals);

        // Score the lead
        const score = scoreLead({
          businessName: place.name,
          niche,
          website: place.website,
          googleRating: place.rating,
          googleReviewCount: place.reviewCount,
          phone: place.phone,
          email: null,
          websiteAnalysis,
          signals,
        });

        // Generate pitch
        const pitch = generateEmailPitch({
          businessName: place.name,
          niche,
          city,
          website: place.website || undefined,
          websiteAnalysis: websiteAnalysis || undefined,
          score,
          signals: signals.map(s => ({
            type: s.type,
            title: s.title,
            description: s.description,
          })),
          senderName: 'Your Name', // TODO: from user profile
          senderCompany: 'Your Company',
          senderServices: ['website design', 'SEO', 'digital marketing'],
        });

        // Save to database
        const lead = await prisma.lead.create({
          data: {
            userId,
            searchId,
            businessName: place.name,
            niche,
            website: place.website,
            phone: place.phone,
            address: place.address,
            city,
            state,
            country,
            googlePlaceId: place.placeId,
            googleRating: place.rating,
            googleReviewCount: place.reviewCount,
            overallScore: score.overall,
            websiteScore: score.website,
            seoScore: score.seo,
            socialScore: score.social,
            reviewScore: score.reviews,
            signalScore: score.signals,
            websiteIssues: websiteAnalysis?.issues || null,
            analysisData: websiteAnalysis || null,
            signalData: aggregatedSignals.topSignals || null,
            // Extract social links
            linkedinUrl: websiteAnalysis?.social.linkedinUrl,
            facebookUrl: websiteAnalysis?.social.facebookUrl,
            instagramUrl: websiteAnalysis?.social.instagramUrl,
            twitterUrl: websiteAnalysis?.social.twitterUrl,
            // Extract tech
            cms: websiteAnalysis?.techStack.cms,
            analytics: websiteAnalysis?.techStack.analytics,
            // Save pitch
            enrichedAt: new Date(),
            scoredAt: new Date(),
          },
        });

        // Save signals
        for (const signal of signals) {
          await prisma.signal.create({
            data: {
              leadId: lead.id,
              type: signal.type as any,
              severity: signal.severity,
              title: signal.title,
              description: signal.description,
              data: signal.data,
              detectedAt: signal.detectedAt,
              expiresAt: signal.expiresAt,
            },
          });
        }

        // Log activity
        await prisma.activity.create({
          data: {
            leadId: lead.id,
            type: 'SIGNAL_DETECTED',
            detail: `Lead scored ${score.overall}/100. ${aggregatedSignals.summary}`,
            metadata: { score, signals: signals.length },
          },
        });

        leads.push(lead);
      } catch (error) {
        console.error(`❌ Failed to process ${place.name}:`, (error as Error).message);
      }
    }

    // Update search record
    await prisma.search.update({
      where: { id: searchId },
      data: { resultCount: leads.length },
    });

    // Sort by score and return
    leads.sort((a, b) => b.overallScore - a.overallScore);

    console.log(`✅ Search complete: ${leads.length} leads scored`);

    return {
      searchId,
      leadCount: leads.length,
      topLeads: leads.slice(0, 5).map(l => ({
        id: l.id,
        name: l.businessName,
        score: l.overallScore,
      })),
      avgScore: Math.round(leads.reduce((sum, l) => sum + l.overallScore, 0) / leads.length),
      hotLeads: leads.filter(l => l.overallScore >= 70).length,
    };
  } catch (error) {
    console.error(`❌ Search failed:`, error);
    throw error;
  }
}, { connection, concurrency: 3 });

searchWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

searchWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

export { searchWorker };
