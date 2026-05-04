// Signal Engine — THE DIFFERENTIATOR
// Monitors businesses for changes that indicate they need help RIGHT NOW

export interface Signal {
  type: string;
  severity: number; // 0-100
  title: string;
  description: string;
  data: Record<string, any>;
  detectedAt: Date;
  expiresAt: Date;
}

// ─── Main Signal Detection ──────────────────────────────────

export async function detectSignals(
  leadId: string,
  website: string | null,
  googlePlaceId: string | null,
  niche: string,
  city: string,
  previousData?: any,
): Promise<Signal[]> {
  const signals: Signal[] = [];

  // Run all signal detectors in parallel
  const detectors = [
    website ? checkSiteDown(website) : null,
    website ? checkSSLExpiry(website) : null,
    website ? checkDomainExpiry(website) : null,
    website ? checkPageSpeedDrop(website, previousData?.pageSpeed) : null,
    googlePlaceId ? checkReviewSpike(googlePlaceId, previousData?.reviews) : null,
    googlePlaceId ? checkReviewVelocityDrop(googlePlaceId, previousData?.reviewHistory) : null,
    website ? checkTechStackChange(website, previousData?.techStack) : null,
    website ? checkSocialActivity(website, previousData?.social) : null,
    checkCompetitorChanges(niche, city, previousData?.competitors),
    checkNewJobPostings(niche, city),
    checkFundingRounds(niche, city),
  ].filter(Boolean);

  const results = await Promise.allSettled(detectors);

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      signals.push(...(Array.isArray(result.value) ? result.value : [result.value]));
    }
  }

  return signals.filter(s => s !== null);
}

// ─── Signal: Site Down ──────────────────────────────────────

async function checkSiteDown(url: string): Promise<Signal | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      method: 'HEAD',
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (response.status >= 500) {
      return {
        type: 'SITE_DOWN',
        severity: 90,
        title: 'Website is down',
        description: `Website returned HTTP ${response.status}. Potential customers can't access the site.`,
        data: { statusCode: response.status, url },
        detectedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      };
    }

    return null;
  } catch (error: any) {
    // Connection refused, timeout, DNS error = site is down
    return {
      type: 'SITE_DOWN',
      severity: 95,
      title: 'Website is unreachable',
      description: `Website could not be reached: ${error.message || 'Connection failed'}.`,
      data: { error: error.message, url },
      detectedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }
}

// ─── Signal: SSL Expiring ───────────────────────────────────

async function checkSSLExpiry(url: string): Promise<Signal | null> {
  try {
    const hostname = new URL(url).hostname;
    // Use a TLS check or SSL Labs
    const response = await fetch(`https://api.ssllabs.com/api/v3/analyze?host=${hostname}&publish=off`);
    const data = await response.json() as any;

    const cert = data.endpoints?.[0]?.details?.cert;
    if (!cert?.notAfter) return null;

    const daysUntilExpiry = Math.floor((cert.notAfter - Date.now()) / 86400000);

    if (daysUntilExpiry < 30) {
      return {
        type: 'SSL_EXPIRING',
        severity: daysUntilExpiry < 7 ? 90 : daysUntilExpiry < 14 ? 70 : 50,
        title: `SSL certificate expires in ${daysUntilExpiry} days`,
        description: `The SSL certificate for ${hostname} expires on ${new Date(cert.notAfter).toLocaleDateString()}. Site will show security warnings.`,
        data: { hostname, expiryDate: cert.notAfter, daysUntilExpiry },
        detectedAt: new Date(),
        expiresAt: new Date(cert.notAfter),
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Signal: Domain Expiring ────────────────────────────────

async function checkDomainExpiry(url: string): Promise<Signal | null> {
  try {
    const hostname = new URL(url).hostname;
    // Use WHOIS API (e.g., via whoisjsonapi.com or similar)
    const apiKey = process.env.WHOIS_API_KEY;
    if (!apiKey) return null;

    const response = await fetch(`https://whoisjsonapi.com/v1/${hostname}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const data = await response.json() as any;

    if (data.domain?.expires_date) {
      const expiryDate = new Date(data.domain.expires_date);
      const daysUntil = Math.floor((expiryDate.getTime() - Date.now()) / 86400000);

      if (daysUntil < 60) {
        return {
          type: 'DOMAIN_EXPIRING',
          severity: daysUntil < 14 ? 85 : daysUntil < 30 ? 65 : 40,
          title: `Domain expires in ${daysUntil} days`,
          description: `The domain ${hostname} expires on ${expiryDate.toLocaleDateString()}.`,
          data: { hostname, expiryDate: expiryDate.toISOString(), daysUntil },
          detectedAt: new Date(),
          expiresAt: expiryDate,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Signal: Page Speed Drop ────────────────────────────────

async function checkPageSpeedDrop(url: string, previousScore?: number): Promise<Signal | null> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey || previousScore === undefined) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile&category=performance`
    );
    const data = await response.json() as any;
    const currentScore = Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100);

    const drop = previousScore - currentScore;
    if (drop >= 20) {
      return {
        type: 'PAGE_SPEED_DROP',
        severity: Math.min(80, 40 + drop),
        title: `Page speed dropped ${drop} points`,
        description: `Score went from ${previousScore} to ${currentScore}. Site performance is degrading.`,
        data: { previousScore, currentScore, drop, url },
        detectedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Signal: Review Spike (Bad Reviews) ─────────────────────

async function checkReviewSpike(
  placeId: string,
  previousReviews?: { count: number; rating: number },
): Promise<Signal | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,user_ratings_total,rating&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json() as any;
    const result = data.result;

    if (!result || !previousReviews) return null;

    const newReviewCount = result.user_ratings_total - previousReviews.count;

    // Check for negative review spike
    if (result.reviews) {
      const recentNegative = result.reviews.filter(
        (r: any) => r.rating <= 2 && (Date.now() / 1000 - r.time) < 7 * 24 * 60 * 60
      );

      if (recentNegative.length >= 3) {
        return {
          type: 'BAD_REVIEW_SPIKE',
          severity: 85,
          title: `${recentNegative.length} negative reviews this week`,
          description: `Business received ${recentNegative.length} reviews with 1-2 stars in the past 7 days. Reputation is suffering.`,
          data: {
            negativeCount: recentNegative.length,
            reviews: recentNegative.map((r: any) => ({
              rating: r.rating,
              text: r.text?.substring(0, 200),
              time: r.time,
            })),
            currentRating: result.rating,
            totalReviews: result.user_ratings_total,
          },
          detectedAt: new Date(),
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        };
      }
    }

    // Rating drop
    if (previousReviews.rating > result.rating && previousReviews.rating - result.rating >= 0.3) {
      return {
        type: 'REVIEW_VELOCITY_DROP',
        severity: 60,
        title: `Rating dropped from ${previousReviews.rating} to ${result.rating}`,
        description: `Overall rating declined by ${(previousReviews.rating - result.rating).toFixed(1)} stars.`,
        data: {
          previousRating: previousReviews.rating,
          currentRating: result.rating,
          totalReviews: result.user_ratings_total,
        },
        detectedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Signal: Review Velocity Drop ───────────────────────────

async function checkReviewVelocityDrop(
  placeId: string,
  reviewHistory?: Array<{ date: Date; count: number }>,
): Promise<Signal | null> {
  if (!reviewHistory || reviewHistory.length < 2) return null;

  // Compare recent velocity to historical
  const recent = reviewHistory.slice(-4); // last 4 periods
  const older = reviewHistory.slice(0, -4);

  const recentAvg = recent.reduce((sum, r) => sum + r.count, 0) / recent.length;
  const olderAvg = older.reduce((sum, r) => sum + r.count, 0) / older.length;

  if (olderAvg > 0 && recentAvg / olderAvg < 0.3) {
    return {
      type: 'REVIEW_VELOCITY_DROP',
      severity: 50,
      title: 'Review collection has stalled',
      description: `Review rate dropped from ~${Math.round(olderAvg)}/month to ~${Math.round(recentAvg)}/month.`,
      data: { recentAvg, olderAvg },
      detectedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  return null;
}

// ─── Signal: Tech Stack Change ──────────────────────────────

async function checkTechStackChange(url: string, previousTech?: Record<string, any>): Promise<Signal | null> {
  if (!previousTech) return null;

  // This would require re-scanning and comparing — simplified here
  return null;
}

// ─── Signal: Social Inactivity ──────────────────────────────

async function checkSocialActivity(url: string, previousSocial?: Record<string, any>): Promise<Signal | null> {
  if (!previousSocial) return null;

  // Would check last post dates on social platforms
  // Simplified: if no social activity in 90 days
  return null;
}

// ─── Signal: Competitor Changes ─────────────────────────────

async function checkCompetitorChanges(
  niche: string,
  city: string,
  previousCompetitors?: any[],
): Promise<Signal[]> {
  const signals: Signal[] = [];

  // Would check if competitors in the area have:
  // - Closed down (opportunity!)
  // - Gotten much better (threat!)
  // - New competitors entered market

  return signals;
}

// ─── Signal: New Job Postings ───────────────────────────────

async function checkNewJobPostings(niche: string, city: string): Promise<Signal[]> {
  const signals: Signal[] = [];
  const apiKey = process.env.SERP_API_KEY; // For Google Jobs search
  if (!apiKey) return signals;

  try {
    // Search for recent job postings in the niche + city
    const query = `${niche} jobs hiring ${city}`;
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(query)}&api_key=${apiKey}`
    );
    const data = await response.json() as any;

    // If a business is hiring, they're growing and might need services
    // This is more useful at the individual business level
    return signals;
  } catch {
    return signals;
  }
}

// ─── Signal: Funding Rounds ─────────────────────────────────

async function checkFundingRounds(niche: string, city: string): Promise<Signal[]> {
  const signals: Signal[] = [];

  // Would check Crunchbase, PitchBook, or news APIs for recent funding
  // Funded companies have budget for marketing/web services

  return signals;
}

// ─── Signal: Review Response Check ──────────────────────────

export async function checkReviewResponses(placeId: string): Promise<Signal | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json() as any;

    const reviews = data.result?.reviews || [];
    const unanswered = reviews.filter((r: any) => !r.owner_reply);

    if (unanswered.length >= 3) {
      return {
        type: 'SOCIAL_INACTIVE',
        severity: 40,
        title: `${unanswered.length} unanswered Google reviews`,
        description: `Business has ${unanswered.length} reviews without owner responses. Shows lack of engagement.`,
        data: { unansweredCount: unanswered.length, totalReviews: reviews.length },
        detectedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Signal Aggregation ─────────────────────────────────────

export function aggregateSignals(signals: Signal[]): {
  hotLead: boolean;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low' | 'none';
  topSignals: Signal[];
  summary: string;
} {
  if (signals.length === 0) {
    return {
      hotLead: false,
      urgencyLevel: 'none',
      topSignals: [],
      summary: 'No active signals detected.',
    };
  }

  // Sort by severity
  const sorted = [...signals].sort((a, b) => b.severity - a.severity);
  const topSignals = sorted.slice(0, 5);

  const maxSeverity = sorted[0].severity;
  let urgencyLevel: 'critical' | 'high' | 'medium' | 'low' | 'none';

  if (maxSeverity >= 80) urgencyLevel = 'critical';
  else if (maxSeverity >= 60) urgencyLevel = 'high';
  else if (maxSeverity >= 40) urgencyLevel = 'medium';
  else urgencyLevel = 'low';

  const hotLead = urgencyLevel === 'critical' || urgencyLevel === 'high';

  const summary = hotLead
    ? `🔥 HOT LEAD — ${topSignals[0].title}. ${signals.length} active signals.`
    : `📋 ${signals.length} signals detected. ${topSignals[0].title}.`;

  return { hotLead, urgencyLevel, topSignals, summary };
}
