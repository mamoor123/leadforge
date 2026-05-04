// Multi-Channel Outreach Engine
// Generates personalized pitches and manages sequences

import type { WebsiteAnalysis, Issue } from './website-analyzer';
import type { ScoreBreakdown } from './lead-scorer';

export interface OutreachContext {
  businessName: string;
  niche: string;
  city: string;
  contactName?: string;
  website?: string;
  websiteAnalysis?: WebsiteAnalysis;
  score?: ScoreBreakdown;
  signals?: Array<{ type: string; title: string; description: string }>;
  senderName: string;
  senderCompany: string;
  senderServices: string[];
}

// ─── Email Pitch Generation ─────────────────────────────────

export function generateEmailPitch(context: OutreachContext): {
  subject: string;
  body: string;
  variants: Array<{ subject: string; body: string; variant: string }>;
} {
  const { businessName, niche, city, websiteAnalysis, score, signals } = context;

  // Find the top 3 most impactful issues
  const topIssues = (websiteAnalysis?.issues || [])
    .filter(i => i.severity === 'critical' || i.severity === 'high')
    .slice(0, 3);

  // Check for active signals
  const urgentSignal = signals?.find(s =>
    s.type === 'SITE_DOWN' || s.type === 'BAD_REVIEW_SPIKE' || s.type === 'SSL_EXPIRING'
  );

  // Generate multiple variants for A/B testing
  const variants = [
    generateProblemFocused(context, topIssues, urgentSignal),
    generateOpportunityFocused(context, topIssues),
    generateDirectApproach(context, topIssues),
  ];

  return {
    subject: variants[0].subject,
    body: variants[0].body,
    variants,
  };
}

function generateProblemFocused(
  ctx: OutreachContext,
  issues: Issue[],
  signal?: { type: string; title: string; description: string },
): { subject: string; body: string; variant: string } {
  const issueList = issues.map(i => `• ${i.title} — ${i.impact}`).join('\n');
  const signalLine = signal
    ? `\nI also noticed: ${signal.title}. ${signal.description}\n`
    : '';

  return {
    variant: 'problem-focused',
    subject: `Quick heads-up about ${ctx.businessName}'s website`,
    body: `Hi ${ctx.contactName || 'there'},

I was looking at local ${ctx.niche} businesses in ${ctx.city} and came across ${ctx.businessName}.

I ran a quick analysis of your website and found a few things that might be costing you customers:

${issueList}${signalLine}
These aren't just technical issues — they directly impact how many people find you online and trust you enough to reach out.

I help ${ctx.niche} businesses in ${ctx.city} fix exactly these problems. Would you be open to a quick 10-minute call where I show you what I found and how easy it is to fix?

No pressure, no sales pitch — just real data about your online presence.

Best,
${ctx.senderName}
${ctx.senderCompany}`,
  };
}

function generateOpportunityFocused(
  ctx: OutreachContext,
  issues: Issue[],
): { subject: string; body: string; variant: string } {
  const competitorMention = ctx.score?.reviews && ctx.score.reviews > 50
    ? `I noticed some of your competitors in ${ctx.city} are doing a better job online — and picking up customers that could be yours.`
    : `There's a real opportunity for ${ctx.businessName} to stand out online in ${ctx.city}.`;

  return {
    variant: 'opportunity-focused',
    subject: `${ctx.businessName} — missing out on local customers?`,
    body: `Hi ${ctx.contactName || 'there'},

${competitorMention}

I specialize in helping ${ctx.niche} businesses get more customers through their website and online presence. I took a quick look at ${ctx.businessName}'s digital footprint and saw some easy wins:

• Your website could be generating more leads with a few targeted improvements
• There are SEO gaps that mean people searching for "${ctx.niche} in ${ctx.city}" aren't finding you
• Your online reviews could be working harder for you

I've helped similar businesses see 30-50% more website inquiries within 60 days.

Would you be interested in a free audit report? I'll send over a detailed breakdown of exactly what to fix and why it matters.

${ctx.senderName}
${ctx.senderCompany}`,
  };
}

function generateDirectApproach(
  ctx: OutreachContext,
  issues: Issue[],
): { subject: string; body: string; variant: string } {
  const criticalCount = issues.filter(i => i.severity === 'critical').length;

  return {
    variant: 'direct',
    subject: criticalCount > 0
      ? `${criticalCount} critical issues on ${ctx.businessName}'s website`
      : `Quick question about ${ctx.businessName}`,
    body: `Hi ${ctx.contactName || 'there'},

I'm ${ctx.senderName} — I help ${ctx.niche} businesses get more customers online.

I noticed ${ctx.businessName} has ${issues.length} issues with your website that are likely costing you business${criticalCount > 0 ? ` (${criticalCount} of them are critical)` : ''}.

I put together a free audit report that shows exactly what's wrong and what it's costing you. Want me to send it over?

If it's not the right time, no worries — just let me know.

${ctx.senderName}
${ctx.senderCompany}`,
  };
}

// ─── LinkedIn Message Generation ────────────────────────────

export function generateLinkedInPitch(context: OutreachContext): {
  connectionRequest: string;
  followUp: string;
} {
  const { businessName, niche, city, contactName } = context;

  return {
    connectionRequest: `Hi ${contactName || ''}, I help ${niche} businesses in ${city} get more customers through their website. I noticed ${businessName} has some easy wins I'd love to share. Would love to connect!`,

    followUp: `Thanks for connecting! I took a look at ${businessName}'s online presence and found a few things that could help you get more customers:

1. Your website has some quick fixes that could significantly improve your Google rankings
2. There are some SEO gaps meaning people searching for "${niche} in ${city}" might not find you
3. Your online reputation could be leveraged better

Would you be open to a quick chat? I can share the specific findings — no strings attached.`,
  };
}

// ─── SMS Pitch Generation ───────────────────────────────────

export function generateSMSPitch(context: OutreachContext): string {
  const { businessName, niche, city, senderName } = context;

  return `Hi! I'm ${senderName}, I help ${niche} businesses in ${city} get more customers online. I ran a free audit on ${businessName}'s website and found some easy wins that could bring in more business. Interested in seeing the report? Reply YES and I'll send it over.`;
}

// ─── PDF Report Generation ──────────────────────────────────

export function generateReportData(context: OutreachContext): {
  title: string;
  sections: Array<{ heading: string; content: string; priority: number }>;
  summary: string;
  estimatedImpact: string;
} {
  const { businessName, niche, city, websiteAnalysis, score, signals } = context;
  const issues = websiteAnalysis?.issues || [];

  const sections = [
    {
      heading: 'Website Performance',
      content: formatPerformanceSection(websiteAnalysis),
      priority: 1,
    },
    {
      heading: 'SEO Analysis',
      content: formatSEOSection(websiteAnalysis),
      priority: 2,
    },
    {
      heading: 'Online Reputation',
      content: formatReputationSection(score, signals),
      priority: 3,
    },
    {
      heading: 'Social Media Presence',
      content: formatSocialSection(websiteAnalysis),
      priority: 4,
    },
    {
      heading: 'Technology & Security',
      content: formatTechSection(websiteAnalysis),
      priority: 5,
    },
    {
      heading: 'Recommendations',
      content: formatRecommendations(issues),
      priority: 6,
    },
  ];

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;

  return {
    title: `Website Audit Report: ${businessName}`,
    sections,
    summary: `Found ${issues.length} issues (${criticalCount} critical, ${highCount} high priority). Overall opportunity score: ${score?.overall || 'N/A'}/100.`,
    estimatedImpact: estimateRevenueImpact(issues, niche),
  };
}

function formatPerformanceSection(analysis?: WebsiteAnalysis | null): string {
  if (!analysis) return 'Website could not be analyzed.';

  const { pageSpeed } = analysis;
  return `Page Speed Score: ${pageSpeed.score}/100
Mobile Score: ${pageSpeed.mobileScore}/100
${pageSpeed.loadTime ? `Load Time: ${(pageSpeed.loadTime / 1000).toFixed(1)}s` : ''}
${pageSpeed.pageSize ? `Page Size: ${Math.round(pageSpeed.pageSize / 1024)}KB` : ''}

${pageSpeed.score < 50 ? '⚠️ Critical: Your site is very slow. 53% of mobile visitors leave after 3 seconds.' : ''}
${pageSpeed.score < 75 ? '⚠️ Your site speed could be improved significantly.' : ''}`;
}

function formatSEOSection(analysis?: WebsiteAnalysis | null): string {
  if (!analysis) return 'SEO data not available.';

  const { seo } = analysis;
  const issues: string[] = [];

  if (!seo.title) issues.push('❌ Missing page title');
  else if (seo.titleLength > 60) issues.push(`⚠️ Title too long (${seo.titleLength} chars)`);
  else issues.push('✅ Title looks good');

  if (!seo.metaDescription) issues.push('❌ Missing meta description');
  else if (seo.metaDescriptionLength < 120) issues.push('⚠️ Meta description too short');
  else issues.push('✅ Meta description present');

  if (seo.h1Count === 0) issues.push('❌ No H1 heading');
  else if (seo.h1Count > 1) issues.push(`⚠️ ${seo.h1Count} H1 tags (should be 1)`);
  else issues.push('✅ H1 heading present');

  if (!seo.hasSchemaMarkup) issues.push('❌ No structured data (missing rich snippets)');
  if (seo.imagesWithoutAlt > 0) issues.push(`⚠️ ${seo.imagesWithoutAlt} images missing alt text`);
  if (!seo.isHttps) issues.push('❌ Not using HTTPS');

  return `SEO Score: ${seo.score}/100

${issues.join('\n')}`;
}

function formatReputationSection(score?: ScoreBreakdown, signals?: any[]): string {
  const parts: string[] = [];

  if (score) {
    parts.push(`Review Score: ${score.reviews}/100`);
  }

  if (signals && signals.length > 0) {
    parts.push(`\nActive Signals:`);
    for (const signal of signals.slice(0, 5)) {
      parts.push(`• ${signal.title}`);
    }
  }

  return parts.join('\n') || 'Reputation data not available.';
}

function formatSocialSection(analysis?: WebsiteAnalysis | null): string {
  if (!analysis) return 'Social media data not available.';

  const { social } = analysis;
  const platforms: string[] = [];

  if (social.linkedinUrl) platforms.push('✅ LinkedIn');
  if (social.facebookUrl) platforms.push('✅ Facebook');
  if (social.instagramUrl) platforms.push('✅ Instagram');
  if (social.twitterUrl) platforms.push('✅ Twitter/X');
  if (social.youtubeUrl) platforms.push('✅ YouTube');

  if (platforms.length === 0) {
    return '❌ No social media presence found on website.\n\n71% of consumers who have a positive social media experience recommend the brand.';
  }

  return `Found ${platforms.length} social platform(s):\n${platforms.join('\n')}`;
}

function formatTechSection(analysis?: WebsiteAnalysis | null): string {
  if (!analysis) return 'Technology data not available.';

  const { techStack, ssl, content } = analysis;
  const parts: string[] = [];

  parts.push(`SSL: ${ssl.hasSSL ? `✅ ${ssl.grade}` : '❌ No SSL certificate'}`);
  if (ssl.daysUntilExpiry && ssl.daysUntilExpiry < 30) {
    parts.push(`⚠️ SSL expires in ${ssl.daysUntilExpiry} days`);
  }

  if (techStack.cms) parts.push(`CMS: ${techStack.cms}`);
  if (techStack.analytics.length) parts.push(`Analytics: ${techStack.analytics.join(', ')}`);
  if (techStack.chatWidget) parts.push(`Chat: ${techStack.chatWidget}`);
  if (techStack.bookingSystem) parts.push(`Booking: ${techStack.bookingSystem}`);

  return parts.join('\n');
}

function formatRecommendations(issues: Issue[]): string {
  if (issues.length === 0) return 'No major issues found.';

  return issues
    .slice(0, 10)
    .map((issue, i) => `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title}\n   ${issue.fix}`)
    .join('\n\n');
}

function estimateRevenueImpact(issues: Issue[], niche: string): string {
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;

  // Rough estimation
  const monthlyLoss = criticalCount * 2000 + highCount * 500;

  if (monthlyLoss > 5000) {
    return `Based on the issues found, ${niche} businesses typically lose an estimated $${monthlyLoss.toLocaleString()}/month in potential revenue from website problems alone.`;
  } else if (monthlyLoss > 1000) {
    return `These issues could be costing an estimated $${monthlyLoss.toLocaleString()}/month in missed opportunities.`;
  }

  return 'Fixing these issues will improve your online presence and help attract more customers.';
}
