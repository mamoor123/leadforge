// AI-Powered Lead Scoring Engine
// This is what makes us better than FreelanceLeads.io

import type { WebsiteAnalysis, Issue } from './website-analyzer';

export interface ScoreBreakdown {
  overall: number;       // 0-100 composite
  website: number;       // 0-100
  seo: number;          // 0-100
  social: number;       // 0-100
  reviews: number;      // 0-100
  signals: number;      // 0-100 (our secret weapon)
  opportunity: number;  // 0-100 (how likely they need help)
  urgency: number;      // 0-100 (how soon they need help)
  budget: number;       // 0-100 (can they afford us)
  reasoning: string;    // AI explanation
}

export interface LeadData {
  businessName: string;
  niche: string;
  website: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  phone: string | null;
  email: string | null;
  websiteAnalysis: WebsiteAnalysis | null;
  signals: SignalData[];
  competitorData?: CompetitorData;
}

export interface SignalData {
  type: string;
  severity: number;
  detectedAt: Date;
  description: string;
}

export interface CompetitorData {
  avgRatingInNiche: number;
  avgReviewCountInNiche: number;
  topCompetitorScore: number;
  marketSaturation: 'low' | 'medium' | 'high';
}

// ─── Main Scoring Function ──────────────────────────────────

export function scoreLead(lead: LeadData): ScoreBreakdown {
  const website = scoreWebsite(lead.websiteAnalysis);
  const seo = scoreSEO(lead.websiteAnalysis);
  const social = scoreSocial(lead.websiteAnalysis);
  const reviews = scoreReviews(lead.googleRating, lead.googleReviewCount, lead.competitorData);
  const signals = scoreSignals(lead.signals);

  // Opportunity = how much room for improvement
  const opportunity = calculateOpportunity(website, seo, social, reviews, lead);

  // Urgency = how time-sensitive is the need
  const urgency = calculateUrgency(lead.signals, lead.websiteAnalysis);

  // Budget = can they likely afford our services
  const budget = calculateBudget(lead);

  // Weighted composite score
  // We weight signals and opportunity higher than raw scores
  const overall = Math.round(
    website * 0.15 +
    seo * 0.15 +
    social * 0.10 +
    reviews * 0.10 +
    signals * 0.20 +    // signals are important
    opportunity * 0.15 + // high opportunity = good lead
    urgency * 0.10 +     // urgent = contact now
    budget * 0.05        // budget is a tiebreaker
  );

  const reasoning = generateReasoning(lead, {
    overall, website, seo, social, reviews, signals, opportunity, urgency, budget,
    reasoning: '',
  });

  return {
    overall: Math.min(100, Math.max(0, overall)),
    website: Math.min(100, Math.max(0, website)),
    seo: Math.min(100, Math.max(0, seo)),
    social: Math.min(100, Math.max(0, social)),
    reviews: Math.min(100, Math.max(0, reviews)),
    signals: Math.min(100, Math.max(0, signals)),
    opportunity: Math.min(100, Math.max(0, opportunity)),
    urgency: Math.min(100, Math.max(0, urgency)),
    budget: Math.min(100, Math.max(0, budget)),
    reasoning,
  };
}

// ─── Website Score ──────────────────────────────────────────

function scoreWebsite(analysis: WebsiteAnalysis | null): number {
  if (!analysis) return 90; // No website = huge opportunity

  let score = 0;

  // Page speed (0-30 points)
  if (analysis.pageSpeed.score < 30) score += 30;
  else if (analysis.pageSpeed.score < 50) score += 25;
  else if (analysis.pageSpeed.score < 70) score += 15;
  else if (analysis.pageSpeed.score < 90) score += 5;
  else score += 0; // Great speed = less opportunity

  // SSL (0-15 points)
  if (!analysis.ssl.hasSSL) score += 15;
  else if (analysis.ssl.daysUntilExpiry && analysis.ssl.daysUntilExpiry < 30) score += 10;

  // Issues count (0-25 points)
  const criticalCount = analysis.issues.filter(i => i.severity === 'critical').length;
  const highCount = analysis.issues.filter(i => i.severity === 'high').length;
  score += Math.min(25, criticalCount * 10 + highCount * 5);

  // Content gaps (0-15 points)
  if (!analysis.content.hasContactForm) score += 5;
  if (!analysis.content.hasTestimonials) score += 5;
  if (analysis.content.isOutdated) score += 5;

  // Mobile (0-15 points)
  if (analysis.pageSpeed.mobileScore < 50) score += 15;
  else if (analysis.pageSpeed.mobileScore < 70) score += 10;

  return Math.min(100, score);
}

// ─── SEO Score ──────────────────────────────────────────────

function scoreSEO(analysis: WebsiteAnalysis | null): number {
  if (!analysis) return 80; // No site = SEO opportunity

  // Invert their SEO score — worse SEO = higher opportunity for us
  return Math.max(0, 100 - analysis.seo.score);
}

// ─── Social Score ───────────────────────────────────────────

function scoreSocial(analysis: WebsiteAnalysis | null): number {
  if (!analysis) return 70;

  // Fewer social links = more opportunity
  const found = analysis.social.socialLinksFound;
  if (found === 0) return 90;
  if (found <= 2) return 60;
  if (found <= 4) return 30;
  return 10;
}

// ─── Reviews Score ──────────────────────────────────────────

function scoreReviews(
  rating: number | null,
  reviewCount: number | null,
  competitors?: CompetitorData,
): number {
  let score = 0;

  if (rating === null) {
    score += 50; // No reviews = opportunity
  } else {
    // Lower rating = more opportunity (they need reputation management)
    if (rating < 3.0) score += 40;
    else if (rating < 3.5) score += 30;
    else if (rating < 4.0) score += 20;
    else if (rating < 4.5) score += 10;
    // 4.5+ = they're doing well, less opportunity
  }

  if (reviewCount === null || reviewCount < 10) {
    score += 30; // Need more reviews
  } else if (reviewCount < 50) {
    score += 15;
  }

  // Compare to competitors
  if (competitors && rating !== null) {
    if (rating < competitors.avgRatingInNiche - 0.5) {
      score += 20; // Below average = opportunity
    }
  }

  return Math.min(100, score);
}

// ─── Signal Score (THE DIFFERENTIATOR) ──────────────────────

function scoreSignals(signals: SignalData[]): number {
  if (signals.length === 0) return 0;

  let score = 0;
  const now = Date.now();

  for (const signal of signals) {
    // Base severity
    let points = signal.severity;

    // Time decay: recent signals matter more
    const ageMs = now - signal.detectedAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (ageDays < 1) points *= 1.5;       // Today: 1.5x
    else if (ageDays < 3) points *= 1.2;  // This week: 1.2x
    else if (ageDays < 7) points *= 1.0;  // This week: normal
    else if (ageDays < 30) points *= 0.7; // This month: 0.7x
    else points *= 0.3;                   // Older: 0.3x

    // Signal type multipliers (some signals are more actionable)
    const multipliers: Record<string, number> = {
      'BAD_REVIEW_SPIKE': 1.3,    // They're hurting right now
      'SITE_DOWN': 1.5,           // Emergency!
      'DOMAIN_EXPIRING': 1.2,     // Time-sensitive
      'NEW_JOB_POSTING': 1.1,     // Growing, might need services
      'COMPETITOR_CLOSED': 1.4,   // Opportunity to capture market
      'FUNDING_ROUND': 1.3,       // They have budget
      'TECH_STACK_CHANGE': 1.0,   // Switching providers
      'SSL_EXPIRING': 1.2,        // Security risk
      'PAGE_SPEED_DROP': 1.1,     // Performance degrading
      'SOCIAL_INACTIVE': 0.8,     // Less urgent
      'AD_SPEND_STOPPED': 1.2,    // Marketing gap
    };

    points *= (multipliers[signal.type] || 1.0);
    score += points;
  }

  // Normalize to 0-100 (cap at 100)
  return Math.min(100, Math.round(score));
}

// ─── Opportunity Score ──────────────────────────────────────

function calculateOpportunity(
  website: number,
  seo: number,
  social: number,
  reviews: number,
  lead: LeadData,
): number {
  // Average of weakness scores, weighted
  const avg = (website * 0.35 + seo * 0.30 + social * 0.15 + reviews * 0.20);

  // Bonus: no website = massive opportunity
  if (!lead.website) return Math.min(100, avg + 30);

  // Bonus: niche-specific checks
  const nicheBonus = getNicheBonus(lead);

  return Math.min(100, Math.round(avg + nicheBonus));
}

function getNicheBonus(lead: LeadData): number {
  const analysis = lead.websiteAnalysis;
  if (!analysis) return 0;

  let bonus = 0;
  const niche = lead.niche.toLowerCase();

  // Restaurant-specific
  if (niche.includes('restaurant') || niche.includes('food')) {
    if (!analysis.techStack.bookingSystem) bonus += 10; // No reservation system
    if (!analysis.content.hasMenu) bonus += 10; // No menu visible
  }

  // Healthcare-specific
  if (niche.includes('dentist') || niche.includes('doctor') || niche.includes('medical')) {
    if (!analysis.techStack.bookingSystem) bonus += 15; // No online booking
    if (!analysis.seo.hasSchemaMarkup) bonus += 10; // Missing medical schema
  }

  // Contractor-specific
  if (niche.includes('plumb') || niche.includes('electric') || niche.includes('hvac') || niche.includes('roof')) {
    if (!analysis.content.hasTestimonials) bonus += 10; // Trust signals critical
    if (!analysis.seo.hasSchemaMarkup) bonus += 10; // LocalBusiness schema
  }

  // E-commerce
  if (niche.includes('shop') || niche.includes('store') || niche.includes('ecommerce')) {
    if (analysis.pageSpeed.score < 50) bonus += 15; // Speed = revenue
  }

  return bonus;
}

// ─── Urgency Score ──────────────────────────────────────────

function calculateUrgency(signals: SignalData[], analysis: WebsiteAnalysis | null): number {
  let urgency = 0;

  // Critical signals = high urgency
  const criticalSignals = signals.filter(s => s.severity >= 80);
  urgency += criticalSignals.length * 25;

  // Recent bad reviews = urgent
  const badReviews = signals.filter(s => s.type === 'BAD_REVIEW_SPIKE');
  urgency += badReviews.length * 20;

  // Site down = emergency
  const siteDown = signals.filter(s => s.type === 'SITE_DOWN');
  urgency += siteDown.length * 30;

  // SSL/domain expiring soon = urgent
  if (analysis?.ssl.daysUntilExpiry && analysis.ssl.daysUntilExpiry < 14) {
    urgency += 20;
  }

  return Math.min(100, urgency);
}

// ─── Budget Score ───────────────────────────────────────────

function calculateBudget(lead: LeadData): number {
  let score = 50; // baseline

  // More reviews = established business = more budget
  if (lead.googleReviewCount && lead.googleReviewCount > 100) score += 20;
  else if (lead.googleReviewCount && lead.googleReviewCount > 50) score += 10;

  // Has a website = already spending on digital
  if (lead.website) score += 15;

  // Has analytics/advertising = marketing budget exists
  const analysis = lead.websiteAnalysis;
  if (analysis) {
    if (analysis.techStack.analytics.length > 0) score += 10;
    if (analysis.techStack.advertising.length > 0) score += 15;
    if (analysis.techStack.paymentProcessor) score += 10;
  }

  // Funding signal = definitely has budget
  const hasFunding = lead.signals.some(s => s.type === 'FUNDING_ROUND');
  if (hasFunding) score += 30;

  return Math.min(100, score);
}

// ─── AI Reasoning ───────────────────────────────────────────

function generateReasoning(lead: LeadData, scores: Omit<ScoreBreakdown, 'reasoning'>): string {
  const parts: string[] = [];

  parts.push(`${lead.businessName} scores ${scores.overall}/100 overall.`);

  // Top strengths
  const strengths: string[] = [];
  if (scores.website >= 70) strengths.push('poor website');
  if (scores.seo >= 70) strengths.push('weak SEO');
  if (scores.signals >= 50) strengths.push('active signals detected');
  if (scores.urgency >= 50) strengths.push('urgent need');

  if (strengths.length > 0) {
    parts.push(`Key opportunities: ${strengths.join(', ')}.`);
  }

  // Top issues from website analysis
  if (lead.websiteAnalysis) {
    const critical = lead.websiteAnalysis.issues.filter(i => i.severity === 'critical');
    if (critical.length > 0) {
      parts.push(`Critical issues: ${critical.map(i => i.title).join(', ')}.`);
    }
  }

  // Signal highlights
  if (lead.signals.length > 0) {
    const recent = lead.signals
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
      .slice(0, 3);
    parts.push(`Recent signals: ${recent.map(s => s.description).join('; ')}.`);
  }

  // Recommendation
  if (scores.overall >= 80) {
    parts.push('🔥 HIGH PRIORITY — Contact immediately.');
  } else if (scores.overall >= 60) {
    parts.push('⚡ GOOD LEAD — Add to outreach sequence.');
  } else if (scores.overall >= 40) {
    parts.push('📋 WORTH FOLLOWING — Monitor for changes.');
  } else {
    parts.push('💤 LOW PRIORITY — Check back later.');
  }

  return parts.join(' ');
}
