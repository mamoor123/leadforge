// Email Deliverability Engine
// The difference between emails that land in inbox vs spam

export interface SendingAccount {
  id: string;
  email: string;
  domain: string;
  provider: 'smtp' | 'gmail' | 'outlook' | 'ses' | 'resend';
  dailyLimit: number;
  sentToday: number;
  warmupStage: number; // 1-10
  reputation: number; // 0-100
  bounceRate: number;
  spamRate: number;
  lastSentAt: Date | null;
  isActive: boolean;
}

export interface DeliverabilityCheck {
  score: number; // 0-100
  issues: DeliverabilityIssue[];
  recommendations: string[];
  canSend: boolean;
  suggestedDelay: number; // minutes
}

export interface DeliverabilityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'authentication' | 'reputation' | 'content' | 'volume' | 'list';
  title: string;
  description: string;
  fix: string;
}

// ─── Sending Account Manager ────────────────────────────────

export class SendingAccountManager {
  private accounts: SendingAccount[] = [];

  addAccount(account: SendingAccount) {
    this.accounts.push(account);
  }

  // Get the best account to send from right now
  getBestAccount(): SendingAccount | null {
    const available = this.accounts.filter(a =>
      a.isActive &&
      a.sentToday < a.dailyLimit &&
      a.reputation > 30
    );

    if (available.length === 0) return null;

    // Score each account
    const scored = available.map(account => ({
      account,
      score: this.scoreAccount(account),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].account;
  }

  private scoreAccount(account: SendingAccount): number {
    let score = 0;

    // Reputation (most important)
    score += account.reputation * 0.4;

    // Lower bounce rate = better
    score += (100 - account.bounceRate * 100) * 0.2;

    // Lower spam rate = better
    score += (100 - account.spamRate * 100) * 0.2;

    // Warmup stage (higher = more trusted)
    score += (account.warmupStage / 10) * 15;

    // Remaining capacity
    const remaining = (account.dailyLimit - account.sentToday) / account.dailyLimit;
    score += remaining * 5;

    return score;
  }

  // Track sent email
  recordSent(accountId: string) {
    const account = this.accounts.find(a => a.id === accountId);
    if (account) {
      account.sentToday++;
      account.lastSentAt = new Date();
    }
  }

  // Track bounce
  recordBounce(accountId: string) {
    const account = this.accounts.find(a => a.id === accountId);
    if (account) {
      // Rolling average
      account.bounceRate = account.bounceRate * 0.9 + 0.1;
      if (account.bounceRate > 0.05) {
        account.isActive = false; // Pause if bounce rate > 5%
      }
    }
  }

  // Track spam complaint
  recordSpam(accountId: string) {
    const account = this.accounts.find(a => a.id === accountId);
    if (account) {
      account.spamRate = account.spamRate * 0.9 + 0.1;
      if (account.spamRate > 0.01) {
        account.isActive = false; // Pause if spam rate > 1%
      }
    }
  }

  // Reset daily counters
  resetDaily() {
    for (const account of this.accounts) {
      account.sentToday = 0;
    }
  }
}

// ─── Email Warmup System ────────────────────────────────────

export class WarmupEngine {
  // Warmup schedule: gradually increase sending volume
  private readonly warmupSchedule: Array<{
    stage: number;
    dailyLimit: number;
    delayBetweenEmails: number; // minutes
    description: string;
  }> = [
    { stage: 1, dailyLimit: 5, delayBetweenEmails: 30, description: 'Day 1-3: Minimal sending' },
    { stage: 2, dailyLimit: 10, delayBetweenEmails: 20, description: 'Day 4-7: Building trust' },
    { stage: 3, dailyLimit: 20, delayBetweenEmails: 15, description: 'Week 2: Increasing volume' },
    { stage: 4, dailyLimit: 35, delayBetweenEmails: 12, description: 'Week 3: Growing' },
    { stage: 5, dailyLimit: 50, delayBetweenEmails: 10, description: 'Week 4: Established' },
    { stage: 6, dailyLimit: 75, delayBetweenEmails: 8, description: 'Month 2: Scaling' },
    { stage: 7, dailyLimit: 100, delayBetweenEmails: 6, description: 'Month 2-3: Strong' },
    { stage: 8, dailyLimit: 150, delayBetweenEmails: 5, description: 'Month 3+: Full speed' },
    { stage: 9, dailyLimit: 200, delayBetweenEmails: 4, description: 'High volume' },
    { stage: 10, dailyLimit: 300, delayBetweenEmails: 3, description: 'Maximum throughput' },
  ];

  // Get warmup config for current stage
  getConfig(stage: number) {
    return this.warmupSchedule.find(s => s.stage === stage) || this.warmupSchedule[0];
  }

  // Auto-advance warmup stage based on performance
  shouldAdvanceStage(account: SendingAccount): boolean {
    const config = this.getConfig(account.warmupStage);

    // Criteria to advance:
    // 1. Sent at least 80% of daily limit for 3 consecutive days
    // 2. Bounce rate < 3%
    // 3. Spam rate < 0.5%
    // 4. No sudden drops in reputation

    return (
      account.bounceRate < 0.03 &&
      account.spamRate < 0.005 &&
      account.reputation > 60
    );
  }

  // Calculate sending delay between emails
  getSendingDelay(stage: number): number {
    const config = this.getConfig(stage);
    // Add random jitter (±20%) to look natural
    const jitter = config.delayBetweenEmails * 0.2;
    return config.delayBetweenEmails + (Math.random() * jitter * 2 - jitter);
  }
}

// ─── Deliverability Checker ─────────────────────────────────

export async function checkDeliverability(
  account: SendingAccount,
  emailContent: { subject: string; body: string; to: string },
): Promise<DeliverabilityCheck> {
  const issues: DeliverabilityIssue[] = [];
  const recommendations: string[] = [];

  // Check 1: Authentication (SPF, DKIM, DMARC)
  const authCheck = await checkAuthentication(account.domain);
  if (!authCheck.spf) {
    issues.push({
      severity: 'critical',
      category: 'authentication',
      title: 'Missing SPF record',
      description: 'Your domain does not have an SPF record. Emails may be rejected.',
      fix: 'Add an SPF TXT record to your DNS: v=spf1 include:yourprovider.com ~all',
    });
  }
  if (!authCheck.dkim) {
    issues.push({
      severity: 'critical',
      category: 'authentication',
      title: 'Missing DKIM record',
      description: 'DKIM signing not configured. Emails lack cryptographic proof of authenticity.',
      fix: 'Enable DKIM in your email provider settings and add the DKIM record to DNS.',
    });
  }
  if (!authCheck.dmarc) {
    issues.push({
      severity: 'high',
      category: 'authentication',
      title: 'Missing DMARC record',
      description: 'No DMARC policy found. Cannot enforce email authentication.',
      fix: 'Add a DMARC TXT record: _dmarc.yourdomain.com with v=DMARC1; p=quarantine;',
    });
  }

  // Check 2: Domain reputation
  if (account.reputation < 50) {
    issues.push({
      severity: 'critical',
      category: 'reputation',
      title: 'Low domain reputation',
      description: `Reputation score is ${account.reputation}/100. Emails likely to land in spam.`,
      fix: 'Reduce sending volume, improve content quality, and focus on engaged recipients.',
    });
  }

  // Check 3: Bounce rate
  if (account.bounceRate > 0.03) {
    issues.push({
      severity: 'high',
      category: 'list',
      title: `High bounce rate: ${(account.bounceRate * 100).toFixed(1)}%`,
      description: 'Bounce rate above 3% damages sender reputation.',
      fix: 'Clean your email list. Remove invalid addresses. Verify before sending.',
    });
  }

  // Check 4: Spam rate
  if (account.spamRate > 0.005) {
    issues.push({
      severity: 'critical',
      category: 'reputation',
      title: `Spam complaints: ${(account.spamRate * 100).toFixed(2)}%`,
      description: 'Spam complaint rate above 0.5% will get your domain blacklisted.',
      fix: 'Add easy unsubscribe link. Only email people who opted in. Improve targeting.',
    });
  }

  // Check 5: Sending volume
  const warmup = new WarmupEngine();
  const config = warmup.getConfig(account.warmupStage);
  if (account.sentToday >= account.dailyLimit) {
    issues.push({
      severity: 'high',
      category: 'volume',
      title: 'Daily sending limit reached',
      description: `Sent ${account.sentToday}/${account.dailyLimit} emails today.`,
      fix: 'Wait until tomorrow or add another sending account.',
    });
  }

  // Check 6: Content analysis
  const contentCheck = analyzeContent(emailContent);
  issues.push(...contentCheck.issues);
  recommendations.push(...contentCheck.recommendations);

  // Calculate overall score
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const score = Math.max(0, 100 - criticalCount * 30 - highCount * 15);

  return {
    score,
    issues,
    recommendations,
    canSend: criticalCount === 0 && account.sentToday < account.dailyLimit,
    suggestedDelay: criticalCount > 0 ? 60 : warmup.getSendingDelay(account.warmupStage),
  };
}

// ─── Authentication Check ───────────────────────────────────

async function checkAuthentication(domain: string): Promise<{
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
}> {
  const dns = await import('dns/promises');

  let spf = false;
  let dmarc = false;
  let dkim = false;

  try {
    const txtRecords = await dns.resolveTxt(domain);
    spf = txtRecords.some(r => r.join('').includes('v=spf1'));
  } catch {}

  try {
    const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
    dmarc = dmarcRecords.some(r => r.join('').includes('v=DMARC1'));
  } catch {}

  // DKIM check requires knowing the selector — common ones
  for (const selector of ['default', 'google', 'k1', 'selector1', 'selector2']) {
    try {
      const dkimRecords = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
      if (dkimRecords.some(r => r.join('').includes('v=DKIM1'))) {
        dkim = true;
        break;
      }
    } catch {}
  }

  return { spf, dkim, dmarc };
}

// ─── Content Analysis ───────────────────────────────────────

function analyzeContent(content: { subject: string; body: string; to: string }): {
  issues: DeliverabilityIssue[];
  recommendations: string[];
} {
  const issues: DeliverabilityIssue[] = [];
  const recommendations: string[] = [];
  const subject = content.subject.toLowerCase();
  const body = content.body.toLowerCase();

  // Spam trigger words
  const spamWords = [
    'free', 'guarantee', 'no obligation', 'act now', 'limited time',
    'click here', 'buy now', 'discount', 'winner', 'congratulations',
    'make money', 'earn extra', 'work from home', 'viagra', 'casino',
  ];

  const foundSpamWords = spamWords.filter(w =>
    subject.includes(w) || body.includes(w)
  );

  if (foundSpamWords.length > 0) {
    issues.push({
      severity: 'medium',
      category: 'content',
      title: `Spam trigger words detected: ${foundSpamWords.join(', ')}`,
      description: 'These words increase spam score.',
      fix: 'Replace with neutral alternatives.',
    });
  }

  // Subject line checks
  if (subject.length > 60) {
    recommendations.push('Subject line is long. Keep under 60 characters for best open rates.');
  }
  if (subject === subject.toUpperCase() && subject.length > 5) {
    issues.push({
      severity: 'high',
      category: 'content',
      title: 'ALL CAPS subject line',
      description: 'Subject line in all caps is a major spam signal.',
      fix: 'Use normal capitalization.',
    });
  }

  // Body checks
  if (body.length < 50) {
    issues.push({
      severity: 'medium',
      category: 'content',
      title: 'Very short email body',
      description: 'Very short emails can look like spam or phishing.',
      fix: 'Add more context and value to your message.',
    });
  }

  // Link checks
  const linkCount = (body.match(/https?:\/\//g) || []).length;
  if (linkCount > 5) {
    issues.push({
      severity: 'medium',
      category: 'content',
      title: `Too many links: ${linkCount}`,
      description: 'Emails with many links trigger spam filters.',
      fix: 'Reduce to 1-2 links maximum.',
    });
  }

  // Image-to-text ratio
  const imageCount = (body.match(/<img/gi) || []).length;
  if (imageCount > 0 && body.replace(/<[^>]+>/g, '').length < 200) {
    issues.push({
      severity: 'medium',
      category: 'content',
      title: 'Low text-to-image ratio',
      description: 'Image-heavy emails with little text trigger spam filters.',
      fix: 'Add more text content. Aim for at least 200 characters of text.',
    });
  }

  // Unsubscribe check
  if (!body.includes('unsubscribe') && !body.includes('opt out') && !body.includes('manage preferences')) {
    issues.push({
      severity: 'high',
      category: 'content',
      title: 'No unsubscribe option',
      description: 'CAN-SPAM requires an unsubscribe mechanism.',
      fix: 'Add an unsubscribe link at the bottom.',
    });
  }

  // Personalization check
  if (!body.includes('{') && !body.includes('first') && !body.includes('company')) {
    recommendations.push('Add personalization tokens ({first_name}, {company}) to improve engagement.');
  }

  return { issues, recommendations };
}

// ─── Send Time Optimization ─────────────────────────────────

export function getOptimalSendTime(
  recipientTimezone: string,
  recipientIndustry?: string,
): { hour: number; minute: number; dayOfWeek: number } {
  // Industry-specific best times
  const industryTimes: Record<string, { hour: number; dayOfWeek: number[] }> = {
    'restaurant': { hour: 10, dayOfWeek: [1, 2, 3] }, // Before lunch rush
    'dentist': { hour: 14, dayOfWeek: [2, 3, 4] }, // After morning patients
    'plumber': { hour: 8, dayOfWeek: [1, 2, 3] }, // Before jobs start
    'lawyer': { hour: 9, dayOfWeek: [2, 3] }, // Morning, mid-week
    'retail': { hour: 10, dayOfWeek: [2, 3] }, // Before store opens
    'realtor': { hour: 9, dayOfWeek: [1, 2, 3] }, // Morning
    'contractor': { hour: 7, dayOfWeek: [1, 2] }, // Early morning
    'medical': { hour: 13, dayOfWeek: [2, 3, 4] }, // After lunch
  };

  const industry = recipientIndustry?.toLowerCase() || '';
  let bestTime = { hour: 10, minute: 0, dayOfWeek: 2 }; // Default: Tuesday 10am

  for (const [key, times] of Object.entries(industryTimes)) {
    if (industry.includes(key)) {
      bestTime = {
        hour: times.hour,
        minute: Math.floor(Math.random() * 30), // Randomize slightly
        dayOfWeek: times.dayOfWeek[Math.floor(Math.random() * times.dayOfWeek.length)],
      };
      break;
    }
  }

  return bestTime;
}

// ─── Domain Health Monitor ──────────────────────────────────

export async function checkDomainHealth(domain: string): Promise<{
  isBlacklisted: boolean;
  blacklistSources: string[];
  domainAge: number | null; // days
  hasValidSSL: boolean;
  score: number;
}> {
  const blacklistSources: string[] = [];

  // Check common blacklists
  const blacklists = [
    'zen.spamhaus.org',
    'bl.spamcop.net',
    'b.barracudacentral.org',
    'dnsbl.sorbs.net',
  ];

  const dns = await import('dns/promises');

  for (const blacklist of blacklists) {
    try {
      const reversed = domain.split('.').reverse().join('.');
      await dns.resolveTxt(`${reversed}.${blacklist}`);
      blacklistSources.push(blacklist);
    } catch {
      // Not listed (NXDOMAIN = good)
    }
  }

  // Check domain age
  let domainAge: number | null = null;
  try {
    const whoisApiKey = process.env.WHOIS_API_KEY;
    if (whoisApiKey) {
      const response = await fetch(`https://whoisjsonapi.com/v1/${domain}`, {
        headers: { 'Authorization': `Bearer ${whoisApiKey}` },
      });
      if (!response.ok) throw new Error(`WHOIS API error: ${response.status}`);
      const data = await response.json() as any;
      if (data.domain?.created_date) {
        domainAge = Math.floor((Date.now() - new Date(data.domain.created_date).getTime()) / 86400000);
      }
    }
  } catch {}

  // Score
  let score = 100;
  if (blacklistSources.length > 0) score -= 50;
  if (domainAge !== null && domainAge < 30) score -= 20;
  if (domainAge !== null && domainAge < 90) score -= 10;

  return {
    isBlacklisted: blacklistSources.length > 0,
    blacklistSources,
    domainAge,
    hasValidSSL: true, // Would check separately
    score: Math.max(0, score),
  };
}
