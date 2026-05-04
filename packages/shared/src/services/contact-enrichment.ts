// Contact Enrichment Pipeline
// Find decision-maker emails, phones, and social profiles

export interface EnrichedContact {
  name: string | null;
  title: string | null;
  email: string | null;
  emailConfidence: number; // 0-100
  phone: string | null;
  linkedinUrl: string | null;
  source: string;
}

export interface EnrichmentResult {
  contacts: EnrichedContact[];
  domain: string;
  catchAllEmail: string | null;
  verificationResults: EmailVerification[];
}

export interface EmailVerification {
  email: string;
  status: 'valid' | 'invalid' | 'risky' | 'unknown';
  isDisposable: boolean;
  isCatchAll: boolean;
  score: number;
}

// ─── Main Enrichment Function ───────────────────────────────

export async function enrichContact(
  businessName: string,
  website: string | null,
  city: string,
  state: string | null,
  niche: string,
): Promise<EnrichmentResult> {
  const domain = website ? extractDomain(website) : null;
  const contacts: EnrichedContact[] = [];
  let catchAllEmail: string | null = null;

  // Strategy 1: Extract from website
  if (website) {
    const websiteContacts = await extractFromWebsite(website);
    contacts.push(...websiteContacts);
  }

  // Strategy 2: Email pattern detection
  if (domain) {
    const patterns = await detectEmailPattern(domain);
    if (patterns.length > 0) {
      catchAllEmail = patterns[0].pattern;
    }
  }

  // Strategy 3: Google search for contact info
  const searchContacts = await searchForContacts(businessName, city, state);
  contacts.push(...searchContacts);

  // Strategy 4: LinkedIn search
  if (domain) {
    const linkedinContacts = await searchLinkedIn(businessName, city);
    contacts.push(...linkedinContacts);
  }

  // Deduplicate and verify
  const unique = deduplicateContacts(contacts);
  const verificationResults = domain ? await verifyEmails(unique, domain) : [];

  return {
    contacts: unique,
    domain: domain || '',
    catchAllEmail,
    verificationResults,
  };
}

// ─── Extract from Website ───────────────────────────────────

async function extractFromWebsite(url: string): Promise<EnrichedContact[]> {
  const contacts: EnrichedContact[] = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const html = await response.text();

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
    const emails = (html.match(emailRegex) || []).filter(e =>
      !e.includes('example.com') &&
      !e.includes('sentry.io') &&
      !e.includes('w3.org') &&
      !e.includes('schema.org')
    );

    // Extract phones
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = html.match(phoneRegex) || [];

    // Extract names from structured data
    const schemaMatch = html.match(/"@type"\s*:\s*"Person"[^}]*"name"\s*:\s*"([^"]+)"/i);
    const ownerName = schemaMatch ? schemaMatch[1] : null;

    // Extract from "about" or "team" sections
    const aboutMatch = html.match(/(?:owner|founder|manager|director|ceo)[^<]*?([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
    const teamName = aboutMatch ? aboutMatch[1] : null;

    // Build contact objects
    for (const email of [...new Set(emails)].slice(0, 3)) {
      const name = guessNameFromEmail(email);
      contacts.push({
        name: name || ownerName || teamName || null,
        title: guessTitleFromEmail(email),
        email,
        emailConfidence: 70,
        phone: phones[0] || null,
        linkedinUrl: null,
        source: 'website',
      });
    }

    // If no emails found, try mailto links
    if (contacts.length === 0) {
      const mailtoMatch = html.match(/mailto:([^"'>?\s]+)/gi);
      if (mailtoMatch) {
        for (const m of mailtoMatch.slice(0, 2)) {
          const email = m.replace('mailto:', '').split('?')[0];
          contacts.push({
            name: guessNameFromEmail(email),
            title: guessTitleFromEmail(email),
            email,
            emailConfidence: 80,
            phone: phones[0] || null,
            linkedinUrl: null,
            source: 'website-mailto',
          });
        }
      }
    }

    // Extract LinkedIn URLs
    const linkedinMatch = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/(?:in|company)\/[^\s"'<>]+/gi);
    if (linkedinMatch) {
      for (const linkedinUrl of linkedinMatch.slice(0, 2)) {
        // Try to get name from LinkedIn URL
        const slug = linkedinUrl.split('/').pop();
        if (contacts.length > 0 && !contacts[0].linkedinUrl) {
          contacts[0].linkedinUrl = linkedinUrl;
        }
      }
    }
  } catch (e) {
    // Website fetch failed
  }

  return contacts;
}

// ─── Email Pattern Detection ────────────────────────────────

async function detectEmailPattern(domain: string): Promise<Array<{
  pattern: string;
  confidence: number;
  sample: string;
}>> {
  const commonPatterns = [
    '{first}@{domain}',
    '{first}.{last}@{domain}',
    '{f}{last}@{domain}',
    '{first}{last}@{domain}',
    '{first}_{last}@{domain}',
    '{last}@{domain}',
    'info@{domain}',
    'contact@{domain}',
    'hello@{domain}',
    'support@{domain}',
  ];

  // Try to verify common patterns
  const results: Array<{ pattern: string; confidence: number; sample: string }> = [];

  // Check if domain has MX records (can receive email)
  const hasMX = await checkMXRecords(domain);
  if (!hasMX) return results;

  // Try generic catch-all patterns
  for (const generic of ['info@', 'contact@', 'hello@', 'support@']) {
    const email = `${generic}${domain}`;
    const verification = await verifySingleEmail(email);
    if (verification.status === 'valid' || verification.isCatchAll) {
      results.push({
        pattern: email,
        confidence: verification.isCatchAll ? 40 : 60,
        sample: email,
      });
    }
  }

  return results;
}

// ─── Google Search for Contacts ─────────────────────────────

async function searchForContacts(
  businessName: string,
  city: string,
  state: string | null,
): Promise<EnrichedContact[]> {
  const contacts: EnrichedContact[] = [];
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) return contacts;

  try {
    const queries = [
      `"${businessName}" ${city} owner email`,
      `"${businessName}" ${city} contact email`,
      `site:linkedin.com "${businessName}" ${city}`,
    ];

    for (const query of queries) {
      const response = await fetch(
        `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5`
      );
      const data = await response.json() as any;

      for (const result of (data.organic_results || [])) {
        // Extract emails from snippets
        const emailMatch = result.snippet?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          contacts.push({
            name: guessNameFromEmail(emailMatch[0]),
            title: null,
            email: emailMatch[0],
            emailConfidence: 50,
            phone: null,
            linkedinUrl: result.link?.includes('linkedin.com') ? result.link : null,
            source: 'google-search',
          });
        }

        // Extract LinkedIn profiles
        if (result.link?.includes('linkedin.com/in/')) {
          contacts.push({
            name: result.title?.split(' - ')[0]?.split(' | ')[0]?.trim() || null,
            title: extractTitleFromLinkedIn(result.snippet),
            email: null,
            emailConfidence: 0,
            phone: null,
            linkedinUrl: result.link,
            source: 'linkedin-search',
          });
        }
      }
    }
  } catch (e) {
    // Search failed
  }

  return contacts;
}

// ─── LinkedIn Search ────────────────────────────────────────

async function searchLinkedIn(
  businessName: string,
  city: string,
): Promise<EnrichedContact[]> {
  // Would use LinkedIn API or scraping
  // For now, return empty — this requires LinkedIn partnership or proxy
  return [];
}

// ─── Email Verification ─────────────────────────────────────

async function verifyEmails(
  contacts: EnrichedContact[],
  domain: string,
): Promise<EmailVerification[]> {
  const results: EmailVerification[] = [];

  for (const contact of contacts) {
    if (contact.email) {
      const verification = await verifySingleEmail(contact.email);
      results.push(verification);
      contact.emailConfidence = verification.score;
    }
  }

  return results;
}

async function verifySingleEmail(email: string): Promise<EmailVerification> {
  // Multi-layer verification
  const domain = email.split('@')[1];

  // Layer 1: Syntax check
  const syntaxValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Layer 2: Disposable email check
  const disposableDomains = ['tempmail.com', 'throwaway.com', 'guerrillamail.com', 'mailinator.com'];
  const isDisposable = disposableDomains.some(d => domain.includes(d));

  // Layer 3: MX record check
  const hasMX = await checkMXRecords(domain);

  // Layer 4: SMTP verification (if API available)
  const apiKey = process.env.EMAIL_VERIFY_API_KEY;
  let smtpResult: { valid: boolean; isCatchAll: boolean } | null = null;

  if (apiKey) {
    try {
      const response = await fetch(`https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${email}`);
      const data = await response.json() as any;
      smtpResult = {
        valid: data.deliverability === 'DELIVERABLE',
        isCatchAll: data.is_catchall_email?.value === true,
      };
    } catch {}
  }

  // Calculate confidence score
  let score = 0;
  if (syntaxValid) score += 20;
  if (!isDisposable) score += 20;
  if (hasMX) score += 20;
  if (smtpResult?.valid) score += 30;
  if (!smtpResult?.isCatchAll) score += 10;

  let status: 'valid' | 'invalid' | 'risky' | 'unknown';
  if (score >= 80) status = 'valid';
  else if (score >= 50) status = 'risky';
  else if (score < 30) status = 'invalid';
  else status = 'unknown';

  return {
    email,
    status,
    isDisposable,
    isCatchAll: smtpResult?.isCatchAll || false,
    score,
  };
}

// ─── Helpers ────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function guessNameFromEmail(email: string): string | null {
  const local = email.split('@')[0];
  // Skip generic emails
  if (['info', 'contact', 'hello', 'support', 'admin', 'sales', 'office', 'mail'].includes(local.toLowerCase())) {
    return null;
  }

  // Try to parse first.last format
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) {
    const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const last = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
    if (first.length > 1 && last.length > 1) {
      return `${first} ${last}`;
    }
  }

  return null;
}

function guessTitleFromEmail(email: string): string | null {
  const local = email.split('@')[0].toLowerCase();
  const titleMap: Record<string, string> = {
    'ceo': 'CEO',
    'founder': 'Founder',
    'owner': 'Owner',
    'manager': 'Manager',
    'director': 'Director',
    'president': 'President',
    'admin': 'Administrator',
    'sales': 'Sales',
    'marketing': 'Marketing',
    'support': 'Support',
    'hr': 'Human Resources',
  };

  for (const [key, title] of Object.entries(titleMap)) {
    if (local.includes(key)) return title;
  }

  return null;
}

function extractTitleFromLinkedIn(snippet: string | null): string | null {
  if (!snippet) return null;
  const titleMatch = snippet.match(/(?:at|@)\s+[^·|-]+/);
  return titleMatch ? titleMatch[0].trim() : null;
}

function deduplicateContacts(contacts: EnrichedContact[]): EnrichedContact[] {
  const seen = new Set<string>();
  return contacts.filter(c => {
    const key = (c.email || '') + (c.linkedinUrl || '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function checkMXRecords(domain: string): Promise<boolean> {
  try {
    const dns = await import('dns/promises');
    const mx = await dns.resolveMx(domain);
    return mx.length > 0;
  } catch {
    return false;
  }
}
