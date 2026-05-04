// AI SDR Agent — "Forge Agent"
// Autonomous sales development representative that runs 24/7

import { scoreLead, type LeadData, type ScoreBreakdown } from './lead-scorer';
import { detectSignals, aggregateSignals } from './signal-engine';
import { generateEmailPitch, generateLinkedInPitch, generateSMSPitch, type OutreachContext } from './outreach-engine';
import { enrichContact } from './contact-enrichment';
import { checkDeliverability, getOptimalSendTime, type SendingAccount } from './deliverability-engine';

// ─── Timezone Helper ────────────────────────────────────────

function getTimezoneForState(state: string | null | undefined): string | null {
  if (!state) return null;
  const stateTimezones: Record<string, string> = {
    'AL': 'America/Chicago', 'AK': 'America/Anchorage', 'AZ': 'America/Phoenix',
    'AR': 'America/Chicago', 'CA': 'America/Los_Angeles', 'CO': 'America/Denver',
    'CT': 'America/New_York', 'DE': 'America/New_York', 'FL': 'America/New_York',
    'GA': 'America/New_York', 'HI': 'Pacific/Honolulu', 'ID': 'America/Boise',
    'IL': 'America/Chicago', 'IN': 'America/Indiana/Indianapolis', 'IA': 'America/Chicago',
    'KS': 'America/Chicago', 'KY': 'America/New_York', 'LA': 'America/Chicago',
    'ME': 'America/New_York', 'MD': 'America/New_York', 'MA': 'America/New_York',
    'MI': 'America/Detroit', 'MN': 'America/Chicago', 'MS': 'America/Chicago',
    'MO': 'America/Chicago', 'MT': 'America/Denver', 'NE': 'America/Chicago',
    'NV': 'America/Los_Angeles', 'NH': 'America/New_York', 'NJ': 'America/New_York',
    'NM': 'America/Denver', 'NY': 'America/New_York', 'NC': 'America/New_York',
    'ND': 'America/Chicago', 'OH': 'America/New_York', 'OK': 'America/Chicago',
    'OR': 'America/Los_Angeles', 'PA': 'America/New_York', 'RI': 'America/New_York',
    'SC': 'America/New_York', 'SD': 'America/Chicago', 'TN': 'America/Chicago',
    'TX': 'America/Chicago', 'UT': 'America/Denver', 'VT': 'America/New_York',
    'VA': 'America/New_York', 'WA': 'America/Los_Angeles', 'WV': 'America/New_York',
    'WI': 'America/Chicago', 'WY': 'America/Denver',
    // Full names
    'Alabama': 'America/Chicago', 'Alaska': 'America/Anchorage', 'Arizona': 'America/Phoenix',
    'Arkansas': 'America/Chicago', 'California': 'America/Los_Angeles', 'Colorado': 'America/Denver',
    'Connecticut': 'America/New_York', 'Delaware': 'America/New_York', 'Florida': 'America/New_York',
    'Georgia': 'America/New_York', 'Hawaii': 'Pacific/Honolulu', 'Idaho': 'America/Boise',
    'Illinois': 'America/Chicago', 'Indiana': 'America/Indiana/Indianapolis', 'Iowa': 'America/Chicago',
    'Kansas': 'America/Chicago', 'Kentucky': 'America/New_York', 'Louisiana': 'America/Chicago',
    'Maine': 'America/New_York', 'Maryland': 'America/New_York', 'Massachusetts': 'America/New_York',
    'Michigan': 'America/Detroit', 'Minnesota': 'America/Chicago', 'Mississippi': 'America/Chicago',
    'Missouri': 'America/Chicago', 'Montana': 'America/Denver', 'Nebraska': 'America/Chicago',
    'Nevada': 'America/Los_Angeles', 'New Hampshire': 'America/New_York', 'New Jersey': 'America/New_York',
    'New Mexico': 'America/Denver', 'New York': 'America/New_York', 'North Carolina': 'America/New_York',
    'North Dakota': 'America/Chicago', 'Ohio': 'America/New_York', 'Oklahoma': 'America/Chicago',
    'Oregon': 'America/Los_Angeles', 'Pennsylvania': 'America/New_York', 'Rhode Island': 'America/New_York',
    'South Carolina': 'America/New_York', 'South Dakota': 'America/Chicago', 'Tennessee': 'America/Chicago',
    'Texas': 'America/Chicago', 'Utah': 'America/Denver', 'Vermont': 'America/New_York',
    'Virginia': 'America/New_York', 'Washington': 'America/Los_Angeles', 'West Virginia': 'America/New_York',
    'Wisconsin': 'America/Chicago', 'Wyoming': 'America/Denver',
  };
  return stateTimezones[state] || stateTimezones[state.toUpperCase()] || null;
}

export interface AgentConfig {
  userId: string;
  userName: string;
  userCompany: string;
  userServices: string[];
  userIndustry: string;

  // Targeting
  targetNiches: string[];
  targetCities: string[];
  minScore: number; // auto-contact leads above this score

  // Automation
  autoEnroll: boolean; // auto-enroll high-score leads in sequences
  autoSend: boolean; // auto-send emails (vs queue for review)
  autoFollowUp: boolean; // auto-send follow-ups
  maxDailyEmails: number;
  maxDailyLinkedIn: number;

  // Learning
  trackConversions: boolean;
  abTestingEnabled: boolean;

  // Safety
  requireApproval: boolean; // require human approval before sending
  safeDomains: string[]; // never email these domains
  stopWords: string[]; // stop if lead mentions these
}

export interface AgentAction {
  type: 'search' | 'enrich' | 'score' | 'enroll' | 'send_email' | 'send_linkedin' | 'follow_up' | 'pause' | 'alert';
  leadId?: string;
  description: string;
  priority: number; // 1-10
  scheduledFor: Date;
  data: Record<string, any>;
  requiresApproval: boolean;
}

export interface AgentState {
  status: 'running' | 'paused' | 'stopped';
  startedAt: Date;
  lastActionAt: Date;
  lastDiscoveryAt: Date | null;
  stats: {
    leadsDiscovered: number;
    contactsEnriched: number;
    emailsSent: number;
    linkedInSent: number;
    repliesReceived: number;
    meetingsBooked: number;
    dealsInfluenced: number;
  };
  queue: AgentAction[];
  learnings: AgentLearning;
}

export interface AgentLearning {
  bestPerformingNiches: Array<{ niche: string; conversionRate: number }>;
  bestPerformingSignals: Array<{ signal: string; conversionRate: number }>;
  bestPerformingTemplates: Array<{ template: string; replyRate: number }>;
  bestSendTimes: Array<{ day: number; hour: number; openRate: number }>;
  objectionPatterns: Array<{ objection: string; response: string; successRate: number }>;
  totalOutcomes: number;
  positiveOutcomes: number;
}

// ─── Main Agent Loop ────────────────────────────────────────

interface LeadRecord {
  id: string;
  businessName: string;
  website: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  niche: string;
  googlePlaceId: string;
  googleRating: number | null;
  googleReviewCount: number | null;
  contactName?: string;
  contactEmail: string | null;
  contactTitle?: string;
  contactLinkedin?: string;
  analysisData: any;
  signalData: any;
  pipelineStage: string;
  overallScore?: number;
  enrichedAt?: Date;
  scoredAt?: Date;
  lastContactedAt?: Date;
}

export class ForgeAgent {
  private config: AgentConfig;
  private state: AgentState;
  private sendingAccounts: SendingAccount[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
    this.state = {
      status: 'stopped',
      startedAt: new Date(),
      lastActionAt: new Date(),
      lastDiscoveryAt: null,
      stats: {
        leadsDiscovered: 0,
        contactsEnriched: 0,
        emailsSent: 0,
        linkedInSent: 0,
        repliesReceived: 0,
        meetingsBooked: 0,
        dealsInfluenced: 0,
      },
      queue: [],
      learnings: {
        bestPerformingNiches: [],
        bestPerformingSignals: [],
        bestPerformingTemplates: [],
        bestSendTimes: [],
        objectionPatterns: [],
        totalOutcomes: 0,
        positiveOutcomes: 0,
      },
    };
  }

  // ─── Start the agent ──────────────────────────────────────

  async start() {
    this.state.status = 'running';
    console.log('🤖 Forge Agent started');

    // Main loop
    while (this.state.status === 'running') {
      try {
        await this.executeCycle();
        await this.sleep(this.getCycleInterval());
      } catch (error) {
        console.error('Agent cycle error:', error);
        await this.sleep(60000); // Wait 1 min on error
      }
    }
  }

  // ─── Single execution cycle ───────────────────────────────

  private async executeCycle() {
    const now = new Date();

    // Step 1: Discover new leads (if due)
    if (this.shouldDiscover()) {
      await this.discoverLeads();
    }

    // Step 2: Enrich leads that need enrichment
    await this.enrichLeads();

    // Step 3: Process signals for existing leads
    await this.processSignals();

    // Step 4: Score and prioritize
    await this.scoreAndPrioritize();

    // Step 5: Execute outreach (if allowed)
    if (this.canSendNow()) {
      await this.executeOutreach();
    }

    // Step 6: Process replies
    await this.processReplies();

    // Step 7: Follow up on non-responders
    if (this.config.autoFollowUp) {
      await this.processFollowUps();
    }

    // Step 8: Update learnings
    await this.updateLearnings();

    // Step 9: Generate daily report
    if (this.isEndOfDay()) {
      await this.generateDailyReport();
    }

    this.state.lastActionAt = new Date();
  }

  // ─── Lead Discovery ───────────────────────────────────────

  private shouldDiscover(): boolean {
    // Discover once per day for each niche+city combo
    if (!this.state.lastDiscoveryAt) return true;
    const hoursSince = (Date.now() - this.state.lastDiscoveryAt.getTime()) / (1000 * 60 * 60);
    return hoursSince >= 24;
  }

  private async discoverLeads() {
    console.log('🔍 Discovering new leads...');

    for (const niche of this.config.targetNiches) {
      for (const city of this.config.targetCities) {
        try {
          // Search Google Places
          const { searchBusinesses } = await import('./google-places');
          const places = await searchBusinesses({ niche, city, maxResults: 50 });

          for (const place of places) {
            // Check if lead already exists
            const existing = await this.findExistingLead(place.placeId);
            if (existing) continue;

            // Create new lead
            const lead = await this.createLead(place, niche, city);
            this.state.stats.leadsDiscovered++;

            // Immediate enrichment
            await this.enrichLead(lead.id);
          }

          console.log(`📍 Found ${places.length} businesses for ${niche} in ${city}`);
        } catch (error) {
          console.error(`Discovery failed for ${niche} in ${city}:`, error);
        }
      }
    }
    this.state.lastDiscoveryAt = new Date();
  }

  // ─── Enrichment ───────────────────────────────────────────

  private async enrichLeads() {
    // Get leads that haven't been enriched yet
    const unenriched = await this.getUnenrichedLeads(10);

    for (const lead of unenriched) {
      await this.enrichLead(lead.id);
    }
  }

  private async enrichLead(leadId: string) {
    const lead = await this.getLead(leadId);
    if (!lead) return;

    try {
      // Contact enrichment
      const contacts = await enrichContact(
        lead.businessName,
        lead.website,
        lead.city || '',
        lead.state,
        lead.niche,
      );

      // Website analysis
      let websiteAnalysis = null;
      if (lead.website) {
        const { analyzeWebsite } = await import('./website-analyzer');
        websiteAnalysis = await analyzeWebsite(lead.website);
      }

      // Update lead
      await this.updateLead(leadId, {
        contactName: contacts.contacts[0]?.name,
        contactEmail: contacts.contacts[0]?.email,
        contactTitle: contacts.contacts[0]?.title,
        contactLinkedin: contacts.contacts[0]?.linkedinUrl,
        phone: contacts.contacts[0]?.phone || lead.phone,
        analysisData: websiteAnalysis,
        enrichedAt: new Date(),
      });

      this.state.stats.contactsEnriched++;
    } catch (error) {
      console.error(`Enrichment failed for ${leadId}:`, error);
    }
  }

  // ─── Signal Processing ────────────────────────────────────

  private async processSignals() {
    // Get leads that need signal checking
    const leads = await this.getLeadsForSignalCheck(50);

    for (const lead of leads) {
      try {
        const signals = await detectSignals(
          lead.id,
          lead.website,
          lead.googlePlaceId,
          lead.niche,
          lead.city || '',
        );

        if (signals.length > 0) {
          const aggregated = aggregateSignals(signals);

          // Update lead with new signals
          await this.updateLead(lead.id, {
            signalData: aggregated.topSignals,
            signalScore: this.calculateSignalScore(signals),
          });

          // If hot signal, add to priority queue
          if (aggregated.hotLead) {
            this.addToQueue({
              type: 'alert',
              leadId: lead.id,
              description: `🔥 Hot signal: ${aggregated.summary}`,
              priority: 9,
              scheduledFor: new Date(),
              data: { signals: aggregated.topSignals },
              requiresApproval: false,
            });
          }
        }
      } catch (error) {
        console.error(`Signal processing failed for ${lead.id}:`, error);
      }
    }
  }

  // ─── Scoring & Prioritization ─────────────────────────────

  private async scoreAndPrioritize() {
    const unscored = await this.getUnscoredLeads(50);

    for (const lead of unscored) {
      try {
        const signals = (lead.signalData as any[]) || [];

        const score = scoreLead({
          businessName: lead.businessName,
          niche: lead.niche,
          website: lead.website,
          googleRating: lead.googleRating,
          googleReviewCount: lead.googleReviewCount,
          phone: lead.phone,
          email: lead.contactEmail,
          websiteAnalysis: lead.analysisData as any,
          signals,
        });

        await this.updateLead(lead.id, {
          overallScore: score.overall,
          websiteScore: score.website,
          seoScore: score.seo,
          socialScore: score.social,
          reviewScore: score.reviews,
          signalScore: score.signals,
          scoredAt: new Date(),
        });

        // Auto-enroll high-score leads
        if (this.config.autoEnroll && score.overall >= this.config.minScore) {
          this.addToQueue({
            type: 'enroll',
            leadId: lead.id,
            description: `Auto-enroll lead scored ${score.overall}/100`,
            priority: 7,
            scheduledFor: new Date(),
            data: { score },
            requiresApproval: this.config.requireApproval,
          });
        }
      } catch (error) {
        console.error(`Scoring failed for ${lead.id}:`, error);
      }
    }
  }

  // ─── Outreach Execution ───────────────────────────────────

  private async executeOutreach() {
    // Process queue sorted by priority
    const pendingActions = this.state.queue
      .filter(a => a.type === 'send_email' || a.type === 'send_linkedin')
      .filter(a => a.scheduledFor <= new Date())
      .filter(a => !a.requiresApproval)
      .sort((a, b) => b.priority - a.priority);

    for (const action of pendingActions.slice(0, this.config.maxDailyEmails)) {
      try {
        if (action.type === 'send_email') {
          await this.sendEmail(action);
        } else if (action.type === 'send_linkedin') {
          await this.sendLinkedIn(action);
        }

        // Remove from queue
        this.removeFromQueue(action);
      } catch (error) {
        console.error(`Outreach failed:`, error);
      }
    }
  }

  private async sendEmail(action: AgentAction) {
    const lead = await this.getLead(action.leadId!);
    if (!lead?.contactEmail) return;

    // Check deliverability
    const account = this.getBestSendingAccount();
    if (!account) return;

    const deliverability = await checkDeliverability(account, {
      subject: action.data.subject,
      body: action.data.body,
      to: lead.contactEmail,
    });

    if (!deliverability.canSend) {
      console.log(`⚠️ Cannot send to ${lead.contactEmail}: ${deliverability.issues[0]?.title}`);
      return;
    }

    // Apply optimal send time
    const sendTime = getOptimalSendTime(
      getTimezoneForState(lead.state) || 'America/Chicago',
      lead.niche,
    );

    // Send email (via your email service)
    // await emailService.send({ ... });

    // Track
    this.state.stats.emailsSent++;
    account.sentToday++;

    // Log activity
    await this.logActivity(lead.id, 'EMAIL_SENT', `Sent: ${action.data.subject}`);

    // Schedule follow-up
    if (this.config.autoFollowUp) {
      this.addToQueue({
        type: 'follow_up',
        leadId: lead.id,
        description: 'Follow-up if no reply',
        priority: 5,
        scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        data: { step: 2, previousSubject: action.data.subject },
        requiresApproval: false,
      });
    }
  }

  private async sendLinkedIn(action: AgentAction) {
    // LinkedIn is manual — generate message and alert user
    this.addToQueue({
      type: 'alert',
      leadId: action.leadId,
      description: `📋 LinkedIn message ready: ${action.data.message.substring(0, 100)}...`,
      priority: 6,
      scheduledFor: new Date(),
      data: action.data,
      requiresApproval: true,
    });
  }

  // ─── Reply Processing ─────────────────────────────────────

  private async processReplies() {
    // Check for new replies (via IMAP polling or webhook)
    const newReplies = await this.checkForReplies();

    for (const reply of newReplies) {
      const sentiment = await this.classifyReply(reply.content);

      // Update lead
      await this.updateLead(reply.leadId, {
        pipelineStage: sentiment === 'positive' ? 'REPLIED' : 'CONTACTED',
        lastContactedAt: new Date(),
      });

      // Log activity
      await this.logActivity(reply.leadId, 'EMAIL_REPLIED', `Reply: ${sentiment}`);

      // Take action based on sentiment
      switch (sentiment) {
        case 'positive':
          // Auto-book meeting
          if (!this.config.requireApproval) {
            await this.bookMeeting(reply.leadId);
          } else {
            this.addToQueue({
              type: 'alert',
              leadId: reply.leadId,
              description: `🎉 Positive reply! "${reply.content.substring(0, 100)}"`,
              priority: 10,
              scheduledFor: new Date(),
              data: { reply, sentiment },
              requiresApproval: true,
            });
          }
          break;

        case 'interested':
          // Send more info
          this.addToQueue({
            type: 'send_email',
            leadId: reply.leadId,
            description: 'Send detailed info (reply showed interest)',
            priority: 8,
            scheduledFor: new Date(),
            data: { template: 'detailed_info' },
            requiresApproval: this.config.requireApproval,
          });
          break;

        case 'question':
          // Alert human to answer
          this.addToQueue({
            type: 'alert',
            leadId: reply.leadId,
            description: `❓ Question from lead: "${reply.content.substring(0, 150)}"`,
            priority: 9,
            scheduledFor: new Date(),
            data: { reply },
            requiresApproval: true,
          });
          break;

        case 'negative':
          // Stop sequence, mark as lost
          await this.updateLead(reply.leadId, { pipelineStage: 'LOST' });
          await this.removeFromSequence(reply.leadId);
          break;

        case 'ooo':
          // Reschedule follow-up
          const returnDate = this.parseOOOReturnDate(reply.content);
          this.addToQueue({
            type: 'follow_up',
            leadId: reply.leadId,
            description: `Lead is OOO until ${returnDate?.toLocaleDateString()}`,
            priority: 4,
            scheduledFor: returnDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            data: { step: 'resume' },
            requiresApproval: false,
          });
          break;
      }

      this.state.stats.repliesReceived++;
    }
  }

  // ─── Follow-up Processing ─────────────────────────────────

  private async processFollowUps() {
    const dueFollowUps = this.state.queue
      .filter(a => a.type === 'follow_up' && a.scheduledFor <= new Date());

    for (const action of dueFollowUps) {
      const lead = await this.getLead(action.leadId!);
      if (!lead) continue;

      // Check if they replied since scheduling
      if (lead.pipelineStage === 'REPLIED' || lead.pipelineStage === 'MEETING') {
        this.removeFromQueue(action);
        continue;
      }

      // Generate follow-up based on previous step
      const followUp = await this.generateFollowUp(lead, action.data.step);

      this.addToQueue({
        type: 'send_email',
        leadId: lead.id,
        description: `Follow-up #${action.data.step}`,
        priority: 5,
        scheduledFor: new Date(),
        data: followUp,
        requiresApproval: this.config.requireApproval,
      });

      this.removeFromQueue(action);
    }
  }

  // ─── AI Reply Classification ──────────────────────────────

  private async classifyReply(content: string): Promise<
    'positive' | 'interested' | 'question' | 'negative' | 'ooo' | 'neutral'
  > {
    const lower = content.toLowerCase();

    // OOO detection
    if (
      lower.includes('out of office') ||
      lower.includes('away from') ||
      lower.includes('on vacation') ||
      lower.includes('returning on') ||
      lower.includes('back on')
    ) {
      return 'ooo';
    }

    // Negative
    if (
      lower.includes('stop') ||
      lower.includes('unsubscribe') ||
      lower.includes('remove me') ||
      lower.includes('not interested') ||
      lower.includes('don\'t contact') ||
      lower.includes('spam')
    ) {
      return 'negative';
    }

    // Positive
    if (
      lower.includes('interested') ||
      lower.includes('tell me more') ||
      lower.includes('let\'s talk') ||
      lower.includes('schedule') ||
      lower.includes('book') ||
      lower.includes('meeting') ||
      lower.includes('call') ||
      lower.includes('yes') ||
      lower.includes('sounds good')
    ) {
      return 'positive';
    }

    // Question
    if (
      content.includes('?') ||
      lower.includes('how much') ||
      lower.includes('what does') ||
      lower.includes('can you') ||
      lower.includes('pricing') ||
      lower.includes('cost')
    ) {
      return 'question';
    }

    // Interested but not clear
    if (
      lower.includes('maybe') ||
      lower.includes('later') ||
      lower.includes('send more') ||
      lower.includes('details')
    ) {
      return 'interested';
    }

    return 'neutral';
  }

  // ─── Meeting Booking ──────────────────────────────────────

  private async bookMeeting(leadId: string) {
    const lead = await this.getLead(leadId);
    if (!lead) return;

    // Generate meeting booking email
    const bookingEmail = {
      subject: `Quick chat about ${lead.businessName}?`,
      body: `Hi ${lead.contactName || 'there'},

Great to hear you're interested! I'd love to show you exactly what I found and how we can help.

I have availability this week:
- Tuesday 2pm or 4pm
- Wednesday 10am or 3pm
- Thursday 11am or 2pm

Which works best? Or if none of these work, just let me know your availability.

Looking forward to it!

${this.config.userName}
${this.config.userCompany}`,
    };

    this.addToQueue({
      type: 'send_email',
      leadId,
      description: 'Meeting booking email',
      priority: 10,
      scheduledFor: new Date(),
      data: bookingEmail,
      requiresApproval: false,
    });

    await this.updateLead(leadId, { pipelineStage: 'MEETING' });
    this.state.stats.meetingsBooked++;
  }

  // ─── Follow-up Generation ─────────────────────────────────

  private async generateFollowUp(lead: any, step: number): Promise<{
    subject: string;
    body: string;
  }> {
    const templates = [
      // Follow-up 1 (3 days)
      {
        subject: `Quick follow-up: ${lead.businessName}`,
        body: `Hi ${lead.contactName || 'there'},

Just wanted to make sure my last email didn't get lost. I know things get busy.

I found some specific issues with ${lead.businessName}'s website that I think are worth looking at. Happy to share the details if you're interested.

Quick 5 minutes this week?

${this.config.userName}`,
      },
      // Follow-up 2 (7 days)
      {
        subject: `Last thought on ${lead.businessName}`,
        body: `Hi ${lead.contactName || 'there'},

I'll keep this short — I ran a full audit on ${lead.businessName}'s online presence and found some things that could be costing you customers.

If now's not the right time, no worries. But if you'd like to see what I found, I'm happy to send over the report.

Either way, wishing you the best!

${this.config.userName}`,
      },
      // Follow-up 3 (14 days)
      {
        subject: `Closing the loop`,
        body: `Hi ${lead.contactName || 'there'},

I've reached out a couple times and haven't heard back — totally understand if you're busy or this isn't a priority right now.

I'll stop reaching out, but wanted to leave you with one thing: ${lead.businessName}'s website loads in ${lead.analysisData?.pageSpeed?.loadTime ? Math.round(lead.analysisData.pageSpeed.loadTime / 1000) + ' seconds' : 'over 3 seconds'}, which means you're likely losing half your visitors before they even see your page.

If you ever want to chat about it, my door is always open.

Best,
${this.config.userName}`,
      },
    ];

    return templates[Math.min(step - 1, templates.length - 1)];
  }

  // ─── Learning & Adaptation ────────────────────────────────

  private async updateLearnings() {
    // This would analyze conversion data and update the learnings
    // For now, just log the stats
    const conversionRate = this.state.learnings.totalOutcomes > 0
      ? this.state.learnings.positiveOutcomes / this.state.learnings.totalOutcomes
      : 0;

    console.log(`📊 Agent Stats: ${JSON.stringify(this.state.stats)}`);
  }

  // ─── Daily Report ─────────────────────────────────────────

  private async generateDailyReport() {
    const report = {
      date: new Date().toISOString().split('T')[0],
      stats: { ...this.state.stats },
      hotLeads: this.state.queue.filter(a => a.type === 'alert' && a.priority >= 8).length,
      pendingApprovals: this.state.queue.filter(a => a.requiresApproval).length,
      topLead: this.state.queue
        .filter(a => a.leadId)
        .sort((a, b) => b.priority - a.priority)[0]?.description || 'None',
      conversionRate: this.state.learnings.totalOutcomes > 0
        ? `${((this.state.learnings.positiveOutcomes / this.state.learnings.totalOutcomes) * 100).toFixed(1)}%`
        : 'N/A',
    };

    console.log('\n📋 FORGE AGENT DAILY REPORT');
    console.log('═══════════════════════════════════');
    console.log(`Date: ${report.date}`);
    console.log(`Leads discovered: ${report.stats.leadsDiscovered}`);
    console.log(`Emails sent: ${report.stats.emailsSent}`);
    console.log(`Replies: ${report.stats.repliesReceived}`);
    console.log(`Meetings booked: ${report.stats.meetingsBooked}`);
    console.log(`Hot leads: ${report.hotLeads}`);
    console.log(`Pending approvals: ${report.pendingApprovals}`);
    console.log(`Conversion rate: ${report.conversionRate}`);
    console.log('═══════════════════════════════════\n');

    return report;
  }

  // ─── Control Methods ──────────────────────────────────────

  pause() { this.state.status = 'paused'; }
  resume() { this.state.status = 'running'; }
  stop() { this.state.status = 'stopped'; }
  getState() { return { ...this.state }; }
  getConfig() { return { ...this.config }; }

  updateConfig(updates: Partial<AgentConfig>) {
    Object.assign(this.config, updates);
  }

  approveAction(actionIndex: number) {
    const action = this.state.queue[actionIndex];
    if (action) {
      action.requiresApproval = false;
    }
  }

  rejectAction(actionIndex: number) {
    this.state.queue.splice(actionIndex, 1);
  }

  // ─── Helpers ──────────────────────────────────────────────

  private getCycleInterval(): number {
    // Run every 15 minutes during business hours, every hour otherwise
    const hour = new Date().getHours();
    if (hour >= 8 && hour <= 18) return 15 * 60 * 1000; // 15 min
    return 60 * 60 * 1000; // 1 hour
  }

  private canSendNow(): boolean {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    // Send Mon-Fri, 8am-6pm
    return day >= 1 && day <= 5 && hour >= 8 && hour <= 18;
  }

  private isEndOfDay(): boolean {
    const hour = new Date().getHours();
    return hour === 17; // 5pm
  }

  private addToQueue(action: AgentAction) {
    this.state.queue.push(action);
    this.state.queue.sort((a, b) => b.priority - a.priority);
  }

  private removeFromQueue(action: AgentAction) {
    const index = this.state.queue.indexOf(action);
    if (index > -1) this.state.queue.splice(index, 1);
  }

  private calculateSignalScore(signals: any[]): number {
    return Math.min(100, signals.reduce((sum, s) => sum + s.severity, 0));
  }

  private parseOOOReturnDate(content: string): Date | null {
    const dateMatch = content.match(/(?:return|back|until)\s+(?:on\s+)?(\w+\s+\d{1,2}(?:,?\s+\d{4})?)/i);
    if (dateMatch) {
      const date = new Date(dateMatch[1]);
      if (!isNaN(date.getTime())) return date;
    }
    return null;
  }

  private getBestSendingAccount(): SendingAccount | null {
    return this.sendingAccounts
      .filter(a => a.isActive && a.sentToday < a.dailyLimit)
      .sort((a, b) => b.reputation - a.reputation)[0] || null;
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Database stubs (implement with your ORM)
  private async findExistingLead(googlePlaceId: string): Promise<LeadRecord | null> { return null; }
  private async createLead(place: any, niche: string, city: string): Promise<LeadRecord> { return { id: '', businessName: '', website: '', phone: '', city: '', state: '', niche: '', googlePlaceId: '', googleRating: null, googleReviewCount: null, contactEmail: null, analysisData: null, signalData: null, pipelineStage: 'NEW' }; }
  private async getLead(id: string): Promise<LeadRecord | null> { return null; }
  private async updateLead(id: string, data: any) {}
  private async getUnenrichedLeads(limit: number): Promise<LeadRecord[]> { return []; }
  private async getUnscoredLeads(limit: number): Promise<LeadRecord[]> { return []; }
  private async getLeadsForSignalCheck(limit: number): Promise<LeadRecord[]> { return []; }
  private async logActivity(leadId: string, type: string, detail: string) {}
  private async checkForReplies(): Promise<Array<{ leadId: string; content: string }>> { return []; }
  private async removeFromSequence(leadId: string) {}
}
