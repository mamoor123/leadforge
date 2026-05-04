// Proposal & Report Generator
// One-click proposals based on real audit findings

import type { WebsiteAnalysis, Issue } from './website-analyzer';
import type { ScoreBreakdown } from './lead-scorer';

export interface ProposalConfig {
  // Your business info
  senderName: string;
  senderCompany: string;
  senderEmail: string;
  senderPhone: string;
  senderWebsite: string;
  senderLogo?: string;

  // Services & pricing
  services: ServiceOffering[];

  // Branding
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
}

export interface ServiceOffering {
  name: string;
  description: string;
  price: number;
  priceType: 'one-time' | 'monthly' | 'hourly';
  deliverables: string[];
  timeline: string;
  category: 'website' | 'seo' | 'social' | 'reviews' | 'ads' | 'content' | 'other';
}

export interface Proposal {
  id: string;
  leadId: string;
  createdAt: Date;

  // Content
  executiveSummary: string;
  currentSituation: SituationAnalysis;
  proposedSolutions: ProposedSolution[];
  investment: InvestmentBreakdown;
  timeline: ProjectTimeline;
  caseStudies: CaseStudy[];
  nextSteps: string[];
  terms: string;

  // Meta
  estimatedROI: ROIEstimate;
  validUntil: Date;
}

export interface SituationAnalysis {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  competitorComparison: string;
  estimatedRevenueLoss: number;
}

export interface ProposedSolution {
  service: ServiceOffering;
  rationale: string;
  expectedOutcome: string;
  metrics: string[];
  priority: 'critical' | 'high' | 'medium';
}

export interface InvestmentBreakdown {
  items: Array<{
    service: string;
    description: string;
    amount: number;
    type: 'one-time' | 'monthly';
  }>;
  totalFirstMonth: number;
  totalMonthly: number;
  totalAnnual: number;
  paymentTerms: string;
}

export interface ProjectTimeline {
  phases: Array<{
    name: string;
    duration: string;
    startDate: string;
    deliverables: string[];
    milestones: string[];
  }>;
  totalDuration: string;
  kickoffDate: string;
}

export interface CaseStudy {
  client: string;
  industry: string;
  challenge: string;
  solution: string;
  results: Array<{
    metric: string;
    before: string;
    after: string;
    improvement: string;
  }>;
  testimonial?: string;
}

export interface ROIEstimate {
  monthlyRevenueIncrease: number;
  annualRevenueIncrease: number;
  breakEvenMonths: number;
  roiPercentage: number;
  assumptions: string[];
}

// ─── Main Proposal Generator ────────────────────────────────

export function generateProposal(
  lead: {
    businessName: string;
    niche: string;
    city: string;
    website: string | null;
    websiteAnalysis: WebsiteAnalysis | null;
    score: ScoreBreakdown;
    signals: Array<{ type: string; title: string; description: string }>;
    googleRating: number | null;
    googleReviewCount: number | null;
  },
  config: ProposalConfig,
): Proposal {
  const issues = lead.websiteAnalysis?.issues || [];

  // Situation analysis
  const situation = analyzeSituation(lead);

  // Propose solutions based on issues
  const solutions = proposeSolutions(lead, config.services);

  // Calculate investment
  const investment = calculateInvestment(solutions);

  // Generate timeline
  const timeline = generateTimeline(solutions);

  // Estimate ROI
  const roi = estimateROI(lead, solutions);

  // Executive summary
  const summary = generateExecutiveSummary(lead, situation, solutions, roi);

  // Case studies (would pull from your database)
  const caseStudies = generateRelevantCaseStudies(lead.niche);

  return {
    id: generateId(),
    leadId: '',
    createdAt: new Date(),
    executiveSummary: summary,
    currentSituation: situation,
    proposedSolutions: solutions,
    investment,
    timeline,
    caseStudies,
    nextSteps: [
      'Review this proposal and let me know if you have questions',
      'Schedule a 30-minute call to discuss the plan in detail',
      'Sign the agreement and submit deposit to begin',
      'Kickoff meeting within 48 hours of signing',
    ],
    terms: generateTerms(),
    estimatedROI: roi,
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
  };
}

// ─── Situation Analysis ─────────────────────────────────────

function analyzeSituation(lead: any): SituationAnalysis {
  const issues = (lead.websiteAnalysis?.issues || []) as Issue[];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  // Strengths
  if (lead.googleRating && lead.googleRating >= 4.0) {
    strengths.push(`Strong Google rating: ${lead.googleRating} stars (${lead.googleReviewCount} reviews)`);
  }
  if (lead.websiteAnalysis?.content.hasTestimonials) {
    strengths.push('Has customer testimonials on website');
  }
  if (lead.websiteAnalysis?.social.socialLinksFound && lead.websiteAnalysis.social.socialLinksFound > 2) {
    strengths.push(`Active social media presence (${lead.websiteAnalysis.social.socialLinksFound} platforms)`);
  }

  // Weaknesses
  for (const issue of issues.filter(i => i.severity === 'critical' || i.severity === 'high')) {
    weaknesses.push(issue.title);
  }

  // Opportunities
  if (!lead.websiteAnalysis?.seo.hasSchemaMarkup) {
    opportunities.push('Adding structured data could increase Google visibility by 30%');
  }
  if (!lead.websiteAnalysis?.content.hasBlog) {
    opportunities.push('Starting a blog could drive 2x more organic traffic');
  }
  if (!lead.websiteAnalysis?.techStack.bookingSystem) {
    opportunities.push('Online booking could capture 40% more appointments');
  }

  // Threats
  if (lead.score.reviews > 60) {
    threats.push('Competitors with better reviews are capturing your potential customers');
  }
  if (lead.websiteAnalysis?.pageSpeed.score && lead.websiteAnalysis.pageSpeed.score < 50) {
    threats.push('Slow website is causing visitors to leave before contacting you');
  }

  // Revenue loss estimation
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const estimatedLoss = criticalCount * 2000 + highCount * 800;

  return {
    overallScore: lead.score.overall,
    strengths,
    weaknesses,
    opportunities,
    threats,
    competitorComparison: `Your overall score of ${lead.score.overall}/100 places you below the average for ${lead.niche} businesses in ${lead.city}.`,
    estimatedRevenueLoss: estimatedLoss,
  };
}

// ─── Solution Proposal ──────────────────────────────────────

function proposeSolutions(lead: any, availableServices: ServiceOffering[]): ProposedSolution[] {
  const solutions: ProposedSolution[] = [];
  const issues = (lead.websiteAnalysis?.issues || []) as Issue[];

  // Match issues to services
  for (const service of availableServices) {
    const relevantIssues = issues.filter(issue => {
      if (service.category === 'website' && (issue.category === 'performance' || issue.category === 'content')) return true;
      if (service.category === 'seo' && issue.category === 'seo') return true;
      if (service.category === 'social' && issue.category === 'social') return true;
      if (service.category === 'reviews' && issue.severity === 'critical' && issue.title.includes('review')) return true;
      return false;
    });

    if (relevantIssues.length > 0) {
      const severity = relevantIssues.some(i => i.severity === 'critical') ? 'critical' :
                       relevantIssues.some(i => i.severity === 'high') ? 'high' : 'medium';

      solutions.push({
        service,
        rationale: `We identified ${relevantIssues.length} issue(s) that ${service.name} would address: ${relevantIssues.map(i => i.title).join(', ')}.`,
        expectedOutcome: generateExpectedOutcome(service, relevantIssues),
        metrics: generateMetrics(service),
        priority: severity,
      });
    }
  }

  // Always include website if no website exists
  if (!lead.website && !solutions.find(s => s.service.category === 'website')) {
    const websiteService = availableServices.find(s => s.category === 'website');
    if (websiteService) {
      solutions.push({
        service: websiteService,
        rationale: 'Your business currently has no website, which means potential customers cannot find you online.',
        expectedOutcome: 'A professional website that converts visitors into customers.',
        metrics: ['Website visitors', 'Contact form submissions', 'Phone calls from website'],
        priority: 'critical',
      });
    }
  }

  return solutions.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function generateExpectedOutcome(service: ServiceOffering, issues: Issue[]): string {
  const outcomes: Record<string, string> = {
    'website': 'A fast, professional website that converts 2-3x more visitors into customers.',
    'seo': 'Top 10 Google rankings for your main keywords within 90 days.',
    'social': 'An active social media presence that builds trust and drives referrals.',
    'reviews': 'A 4.5+ star rating with automated review collection from happy customers.',
    'ads': 'Targeted Google Ads campaigns generating qualified leads within 30 days.',
    'content': 'Blog content that drives organic traffic and establishes you as an industry expert.',
  };

  return outcomes[service.category] || `Improved ${service.category} performance.`;
}

function generateMetrics(service: ServiceOffering): string[] {
  const metrics: Record<string, string[]> = {
    'website': ['Page speed score', 'Mobile responsiveness', 'Contact form conversions', 'Bounce rate'],
    'seo': ['Google ranking position', 'Organic traffic', 'Keyword visibility', 'Click-through rate'],
    'social': ['Follower growth', 'Engagement rate', 'Referral traffic', 'Brand mentions'],
    'reviews': ['Average rating', 'Review count', 'Response rate', 'Review velocity'],
    'ads': ['Click-through rate', 'Cost per lead', 'Conversion rate', 'Return on ad spend'],
    'content': ['Blog traffic', 'Time on page', 'Lead magnet downloads', 'Email subscribers'],
  };

  return metrics[service.category] || ['Improvement metrics'];
}

// ─── Investment Calculation ─────────────────────────────────

function calculateInvestment(solutions: ProposedSolution[]): InvestmentBreakdown {
  const items = solutions.map(s => ({
    service: s.service.name,
    description: s.service.description,
    amount: s.service.price,
    type: s.service.priceType as 'one-time' | 'monthly',
  }));

  const totalFirstMonth = items.reduce((sum, item) => {
    return sum + (item.type === 'one-time' ? item.amount : item.amount);
  }, 0);

  const totalMonthly = items.reduce((sum, item) => {
    return sum + (item.type === 'monthly' ? item.amount : 0);
  }, 0);

  const totalAnnual = items
    .filter(i => i.type === 'one-time')
    .reduce((sum, i) => sum + i.amount, 0) + totalMonthly * 12;

  return {
    items,
    totalFirstMonth,
    totalMonthly,
    totalAnnual,
    paymentTerms: '50% deposit to begin, 50% upon completion for one-time services. Monthly services billed at the beginning of each month.',
  };
}

// ─── Timeline Generation ────────────────────────────────────

function generateTimeline(solutions: ProposedSolution[]): ProjectTimeline {
  const phases: ProjectTimeline['phases'] = [];
  let weekOffset = 0;

  for (const solution of solutions) {
    const durationWeeks = solution.service.timeline.includes('week') ?
      parseInt(solution.service.timeline) || 2 : 4;

    phases.push({
      name: solution.service.name,
      duration: solution.service.timeline,
      startDate: `Week ${weekOffset + 1}`,
      deliverables: solution.service.deliverables,
      milestones: [
        `Kickoff meeting`,
        `Design/concept review`,
        `Implementation complete`,
        `Review & revisions`,
        `Launch & handoff`,
      ],
    });

    weekOffset += durationWeeks;
  }

  return {
    phases,
    totalDuration: `${weekOffset} weeks`,
    kickoffDate: 'Within 48 hours of agreement signing',
  };
}

// ─── ROI Estimation ─────────────────────────────────────────

function estimateROI(lead: any, solutions: ProposedSolution[]): ROIEstimate {
  // Base estimates by niche
  const nicheMultipliers: Record<string, number> = {
    'dentist': 350,
    'plumber': 280,
    'restaurant': 200,
    'lawyer': 450,
    'contractor': 300,
    'realtor': 500,
    'auto repair': 250,
    'salon': 180,
    'gym': 220,
  };

  const niche = lead.niche.toLowerCase();
  let revenuePerLead = 250; // default

  for (const [key, value] of Object.entries(nicheMultipliers)) {
    if (niche.includes(key)) {
      revenuePerLead = value;
      break;
    }
  }

  // Estimate monthly new customers from improvements
  const additionalLeadsPerMonth = Math.round(
    (lead.score.overall < 50 ? 15 : lead.score.overall < 70 ? 8 : 3) *
    (solutions.length * 0.4)
  );

  const monthlyRevenueIncrease = additionalLeadsPerMonth * revenuePerLead;
  const annualRevenueIncrease = monthlyRevenueIncrease * 12;

  const totalInvestment = solutions.reduce((sum, s) => {
    return sum + (s.service.priceType === 'one-time' ? s.service.price : s.service.price * 3);
  }, 0);

  const breakEvenMonths = monthlyRevenueIncrease > 0 ? totalInvestment / monthlyRevenueIncrease : Infinity;
  const investmentBase = totalInvestment * 2;
  const roiPercentage = investmentBase > 0 ? ((annualRevenueIncrease - investmentBase) / investmentBase) * 100 : 0;

  return {
    monthlyRevenueIncrease,
    annualRevenueIncrease,
    breakEvenMonths: Math.ceil(breakEvenMonths),
    roiPercentage: Math.round(roiPercentage),
    assumptions: [
      `Average customer value in ${lead.niche}: $${revenuePerLead}`,
      `Estimated ${additionalLeadsPerMonth} additional leads per month from improvements`,
      `Assumes 30% lead-to-customer conversion rate`,
      `Based on industry benchmarks for ${lead.niche} businesses`,
    ],
  };
}

// ─── Executive Summary ──────────────────────────────────────

function generateExecutiveSummary(
  lead: any,
  situation: SituationAnalysis,
  solutions: ProposedSolution[],
  roi: ROIEstimate,
): string {
  return `We conducted a comprehensive analysis of ${lead.businessName}'s online presence and identified ${situation.weaknesses.length} key areas for improvement.

Your current overall score is ${situation.overallScore}/100, which means your online presence is likely costing you an estimated $${situation.estimatedRevenueLoss.toLocaleString()}/month in lost customers.

Our proposed solution addresses the most critical issues first, with an investment of $${roi.breakEvenMonths > 0 ? roi.breakEvenMonths : 'N/A'} months to break even and an estimated $${roi.annualRevenueIncrease.toLocaleString()}/year in additional revenue.

We recommend starting with ${solutions[0]?.service.name || 'the highest-priority item'} to address the most urgent issues immediately.`;
}

// ─── Case Studies ───────────────────────────────────────────

function generateRelevantCaseStudies(niche: string): CaseStudy[] {
  // These would come from your actual case study database
  return [
    {
      client: 'Local Business (Similar Industry)',
      industry: niche,
      challenge: 'Poor online presence, no website traffic, few customer inquiries.',
      solution: 'Complete website redesign with SEO optimization and review management.',
      results: [
        { metric: 'Website Traffic', before: '200 visits/month', after: '1,800 visits/month', improvement: '+800%' },
        { metric: 'Customer Inquiries', before: '3/month', after: '28/month', improvement: '+833%' },
        { metric: 'Google Rating', before: '3.2 stars', after: '4.7 stars', improvement: '+47%' },
        { metric: 'Monthly Revenue', before: '$8,000', after: '$14,500', improvement: '+81%' },
      ],
      testimonial: 'The results exceeded our expectations. We went from struggling to find customers to having a waitlist.',
    },
  ];
}

// ─── Terms & Conditions ─────────────────────────────────────

function generateTerms(): string {
  return `TERMS & CONDITIONS

1. PAYMENT TERMS
   - 50% deposit required to begin work
   - 50% balance due upon project completion
   - Monthly services billed at the beginning of each month
   - Payment due within 7 days of invoice date

2. PROJECT SCOPE
   - Work will be performed as described in this proposal
   - Changes to scope may affect timeline and pricing
   - Client will provide necessary access and materials within 5 business days

3. TIMELINE
   - Project begins upon receipt of signed agreement and deposit
   - Delays in client feedback may extend timeline
   - We will communicate any delays promptly

4. REVISIONS
   - Two rounds of revisions included per deliverable
   - Additional revisions billed at hourly rate

5. OWNERSHIP
   - Client owns all work upon final payment
   - We may use anonymized case studies for marketing

6. CANCELLATION
   - 30 days written notice required for monthly services
   - One-time services: deposit is non-refundable once work begins`;
}

// ─── Helpers ────────────────────────────────────────────────

function generateId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─── HTML/PDF Rendering ─────────────────────────────────────

export function renderProposalHTML(proposal: Proposal, config: ProposalConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Proposal for ${proposal.currentSituation ? 'Your Business' : 'Client'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: '${config.fontFamily}', sans-serif; color: #1a1a1a; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid ${config.primaryColor}; }
    .header h1 { color: ${config.primaryColor}; font-size: 28px; }
    .header p { color: #666; margin-top: 8px; }
    .section { margin-bottom: 32px; }
    .section h2 { color: ${config.primaryColor}; font-size: 20px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
    .section h3 { font-size: 16px; margin-bottom: 12px; }
    .score-box { background: ${proposal.currentSituation.overallScore >= 70 ? '#fef2f2' : proposal.currentSituation.overallScore >= 50 ? '#fffbeb' : '#f0fdf4'}; 
                 border: 2px solid ${proposal.currentSituation.overallScore >= 70 ? '#ef4444' : proposal.currentSituation.overallScore >= 50 ? '#f59e0b' : '#22c55e'}; 
                 border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0; }
    .score-number { font-size: 48px; font-weight: bold; color: ${proposal.currentSituation.overallScore >= 70 ? '#ef4444' : proposal.currentSituation.overallScore >= 50 ? '#f59e0b' : '#22c55e'}; }
    .roi-box { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 24px; margin: 20px 0; }
    .roi-number { font-size: 36px; font-weight: bold; color: #22c55e; }
    .issue-list { list-style: none; }
    .issue-list li { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .issue-list li:before { content: "⚠️ "; }
    .strength-list li:before { content: "✅ "; }
    .pricing-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .pricing-table th, .pricing-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    .pricing-table th { background: #f9f9f9; font-weight: 600; }
    .pricing-table .amount { text-align: right; font-weight: 600; }
    .total-row { background: ${config.primaryColor}10; font-weight: bold; }
    .timeline-item { padding: 16px; margin: 12px 0; background: #f9f9f9; border-radius: 8px; border-left: 4px solid ${config.primaryColor}; }
    .cta-box { background: ${config.primaryColor}; color: white; padding: 32px; border-radius: 12px; text-align: center; margin: 32px 0; }
    .cta-box h2 { color: white; border: none; }
    .cta-button { display: inline-block; background: white; color: ${config.primaryColor}; padding: 14px 32px; border-radius: 8px; font-weight: bold; text-decoration: none; margin-top: 16px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${config.senderLogo ? `<img src="${config.senderLogo}" alt="${config.senderCompany}" height="60">` : ''}
      <h1>Website & Digital Marketing Proposal</h1>
      <p>Prepared for ${proposal.currentSituation ? 'Your Business' : 'Client'} by ${config.senderCompany}</p>
      <p>Date: ${proposal.createdAt.toLocaleDateString()} · Valid until: ${proposal.validUntil.toLocaleDateString()}</p>
    </div>

    <div class="section">
      <h2>Executive Summary</h2>
      <p>${proposal.executiveSummary}</p>
      
      <div class="score-box">
        <div class="score-number">${proposal.currentSituation.overallScore}/100</div>
        <p>Current Online Presence Score</p>
        <p style="color: #666; margin-top: 8px;">Estimated monthly revenue loss: <strong>$${proposal.currentSituation.estimatedRevenueLoss.toLocaleString()}</strong></p>
      </div>
    </div>

    <div class="section">
      <h2>Current Situation Analysis</h2>
      
      <h3>Strengths</h3>
      <ul class="issue-list strength-list">
        ${proposal.currentSituation.strengths.map(s => `<li>${s}</li>`).join('')}
      </ul>

      <h3>Areas for Improvement</h3>
      <ul class="issue-list">
        ${proposal.currentSituation.weaknesses.map(w => `<li>${w}</li>`).join('')}
      </ul>

      <h3>Opportunities</h3>
      <ul class="issue-list strength-list">
        ${proposal.currentSituation.opportunities.map(o => `<li>${o}</li>`).join('')}
      </ul>
    </div>

    <div class="section">
      <h2>Proposed Solutions</h2>
      ${proposal.proposedSolutions.map((solution, i) => `
        <div style="margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h3>${i + 1}. ${solution.service.name} <span style="color: ${solution.priority === 'critical' ? '#ef4444' : solution.priority === 'high' ? '#f59e0b' : '#666'}; font-size: 12px;">[${solution.priority.toUpperCase()}]</span></h3>
          <p>${solution.rationale}</p>
          <p style="margin-top: 8px;"><strong>Expected outcome:</strong> ${solution.expectedOutcome}</p>
          <p style="margin-top: 8px;"><strong>Timeline:</strong> ${solution.service.timeline}</p>
        </div>
      `).join('')}
    </div>

    <div class="section">
      <h2>Investment</h2>
      <table class="pricing-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Description</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${proposal.investment.items.map(item => `
            <tr>
              <td>${item.service}</td>
              <td>${item.description}</td>
              <td class="amount">$${item.amount.toLocaleString()}${item.type === 'monthly' ? '/mo' : ''}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="2">First Month Total</td>
            <td class="amount">$${proposal.investment.totalFirstMonth.toLocaleString()}</td>
          </tr>
          <tr>
            <td colspan="2">Ongoing Monthly</td>
            <td class="amount">$${proposal.investment.totalMonthly.toLocaleString()}/mo</td>
          </tr>
        </tbody>
      </table>
      <p style="color: #666; font-size: 14px;">${proposal.investment.paymentTerms}</p>
    </div>

    <div class="section">
      <h2>Expected Return on Investment</h2>
      <div class="roi-box">
        <div class="roi-number">$${proposal.estimatedROI.annualRevenueIncrease.toLocaleString()}/year</div>
        <p>Estimated additional revenue</p>
        <p style="margin-top: 12px;">
          Break even in <strong>${proposal.estimatedROI.breakEvenMonths} months</strong> · 
          ROI: <strong>${proposal.estimatedROI.roiPercentage}%</strong>
        </p>
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 8px;">
        ${proposal.estimatedROI.assumptions.join(' · ')}
      </p>
    </div>

    <div class="section">
      <h2>Timeline</h2>
      ${proposal.timeline.phases.map(phase => `
        <div class="timeline-item">
          <h3>${phase.name} — ${phase.duration}</h3>
          <p>Starting: ${phase.startDate}</p>
          <ul style="margin-top: 8px; padding-left: 20px;">
            ${phase.deliverables.map(d => `<li>${d}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
      <p style="margin-top: 16px;"><strong>Total project duration:</strong> ${proposal.timeline.totalDuration}</p>
    </div>

    ${proposal.caseStudies.length > 0 ? `
    <div class="section">
      <h2>Case Studies</h2>
      ${proposal.caseStudies.map(cs => `
        <div style="margin: 20px 0; padding: 20px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
          <h3>${cs.client} — ${cs.industry}</h3>
          <p style="margin: 8px 0;"><strong>Challenge:</strong> ${cs.challenge}</p>
          <p style="margin: 8px 0;"><strong>Solution:</strong> ${cs.solution}</p>
          <table style="width: 100%; margin-top: 12px;">
            ${cs.results.map(r => `
              <tr>
                <td style="padding: 4px 8px;">${r.metric}</td>
                <td style="padding: 4px 8px;">${r.before}</td>
                <td style="padding: 4px 8px;">→ ${r.after}</td>
                <td style="padding: 4px 8px; color: #22c55e; font-weight: bold;">${r.improvement}</td>
              </tr>
            `).join('')}
          </table>
          ${cs.testimonial ? `<p style="margin-top: 12px; font-style: italic; color: #666;">"${cs.testimonial}"</p>` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="section">
      <h2>Next Steps</h2>
      <ol style="padding-left: 20px;">
        ${proposal.nextSteps.map(step => `<li style="padding: 4px 0;">${step}</li>`).join('')}
      </ol>
    </div>

    <div class="cta-box">
      <h2>Ready to Get Started?</h2>
      <p>Let's discuss how we can help grow your business.</p>
      <a href="mailto:${config.senderEmail}" class="cta-button">Contact Us</a>
      <p style="margin-top: 12px; font-size: 14px;">
        ${config.senderName} · ${config.senderPhone} · ${config.senderEmail}
      </p>
    </div>

    <div class="section" style="font-size: 12px; color: #999;">
      <h2 style="font-size: 14px;">Terms & Conditions</h2>
      <pre style="white-space: pre-wrap; font-family: inherit;">${proposal.terms}</pre>
    </div>

    <div class="footer">
      <p>Proposal prepared by ${config.senderCompany} · ${config.senderWebsite}</p>
      <p>Valid until ${proposal.validUntil.toLocaleDateString()}</p>
    </div>
  </div>
</body>
</html>`;
}
