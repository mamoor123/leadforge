// Deep website analysis — the core intelligence layer

export interface WebsiteAnalysis {
  url: string;
  analyzedAt: Date;

  // Performance
  pageSpeed: PageSpeedData;

  // Security
  ssl: SSLData;

  // SEO
  seo: SEOData;

  // Tech stack
  techStack: TechStackData;

  // Social presence
  social: SocialData;

  // Content quality
  content: ContentData;

  // Issues found
  issues: Issue[];
}

export interface PageSpeedData {
  loadTime: number | null;    // ms
  pageSize: number | null;    // bytes
  requests: number | null;
  score: number;              // 0-100
  mobileScore: number;        // 0-100
  coreWebVitals: {
    lcp: number | null;       // Largest Contentful Paint
    fid: number | null;       // First Input Delay
    cls: number | null;       // Cumulative Layout Shift
  };
}

export interface SSLData {
  hasSSL: boolean;
  issuer: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  daysUntilExpiry: number | null;
  grade: string; // A+, A, B, C, D, F
}

export interface SEOData {
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1Count: number;
  h1Text: string[];
  h2Count: number;
  hasCanonical: boolean;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  hasSchemaMarkup: boolean;
  schemaTypes: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  hasTwitterCard: boolean;
  imageCount: number;
  imagesWithoutAlt: number;
  internalLinks: number;
  externalLinks: number;
  brokenLinks: string[];
  wordCount: number;
  hasHreflang: boolean;
  hasViewport: boolean;
  isHttps: boolean;
  redirectChain: string[];
  score: number; // 0-100
}

export interface TechStackData {
  cms: string | null;
  framework: string | null;
  analytics: string[];
  advertising: string[];
  hosting: string | null;
  cdn: string | null;
  emailProvider: string | null;
  chatWidget: string | null;
  bookingSystem: string | null;
  paymentProcessor: string | null;
  ecommercePlatform: string | null;
  securityHeaders: string[];
}

export interface SocialData {
  linkedinUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  yelpUrl: string | null;
  gmbUrl: string | null;
  socialLinksFound: number;
  hasSocialFeed: boolean;
  lastSocialPost: Date | null; // approximate
  score: number; // 0-100
}

export interface ContentData {
  hasBlog: boolean;
  blogPostCount: number;
  lastBlogPost: Date | null;
  hasContactForm: boolean;
  hasPhoneNumber: boolean;
  hasEmailAddress: boolean;
  hasLiveChat: boolean;
  hasMap: boolean;
  hasTestimonials: boolean;
  hasPortfolio: boolean;
  hasPricing: boolean;
  hasFAQ: boolean;
  hasAboutPage: boolean;
  copyrightYear: number | null;
  isOutdated: boolean; // copyright year < current year - 1
}

export interface Issue {
  category: 'performance' | 'security' | 'seo' | 'content' | 'social' | 'tech';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string; // what this means for the business
  fix: string; // what you'd tell them to fix
  revenueImpact?: string; // estimated lost revenue
}

// ─── Main Analysis Function ─────────────────────────────────

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const normalizedUrl = normalizeUrl(url);

  // Run all analyses in parallel
  const [html, pageSpeed, ssl] = await Promise.allSettled([
    fetchHtml(normalizedUrl),
    analyzePageSpeed(normalizedUrl),
    analyzeSSL(normalizedUrl),
  ]);

  const htmlContent = html.status === 'fulfilled' ? html.value : '';
  const pageSpeedData = pageSpeed.status === 'fulfilled' ? pageSpeed.value : defaultPageSpeed();
  const sslData = ssl.status === 'fulfilled' ? ssl.value : defaultSSL();

  // Parse-based analyses (from HTML)
  const seo = analyzeSEO(htmlContent, normalizedUrl);
  const techStack = detectTechStack(htmlContent);
  const social = extractSocial(htmlContent);
  const content = analyzeContent(htmlContent);

  // Generate issues
  const issues = generateIssues(pageSpeedData, sslData, seo, techStack, social, content);

  return {
    url: normalizedUrl,
    analyzedAt: new Date(),
    pageSpeed: pageSpeedData,
    ssl: sslData,
    seo,
    techStack,
    social,
    content,
    issues,
  };
}

// ─── Fetch HTML ─────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadForge/1.0; +https://leadforge.io)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Page Speed Analysis ────────────────────────────────────

async function analyzePageSpeed(url: string): Promise<PageSpeedData> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) return defaultPageSpeed();

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile&category=performance`;
    const response = await fetch(apiUrl);
    const data = await response.json() as any;

    const lighthouse = data.lighthouseResult || {};
    const audits = lighthouse.audits || {};

    return {
      loadTime: (audits['interactive']?.numericValue as number) || null,
      pageSize: (audits['total-byte-weight']?.numericValue as number) || null,
      requests: (audits['network-requests']?.details?.items?.length as number) || null,
      score: Math.round((lighthouse.categories?.performance?.score || 0) * 100),
      mobileScore: Math.round((lighthouse.categories?.performance?.score || 0) * 100),
      coreWebVitals: {
        lcp: audits['largest-contentful-paint']?.numericValue as number || null,
        fid: audits['max-potential-fid']?.numericValue as number || null,
        cls: audits['cumulative-layout-shift']?.numericValue as number || null,
      },
    };
  } catch {
    return defaultPageSpeed();
  }
}

// ─── SSL Analysis ───────────────────────────────────────────

async function analyzeSSL(url: string): Promise<SSLData> {
  try {
    const hostname = new URL(url).hostname;
    // Use SSL Labs API or a simple check
    const response = await fetch(`https://api.ssllabs.com/api/v3/analyze?host=${hostname}&publish=off&all=done`);
    const data = await response.json() as any;

    const endpoint = data.endpoints?.[0];
    const cert = endpoint?.details?.cert;

    return {
      hasSSL: true,
      issuer: cert?.issuerSubject || null,
      validFrom: cert?.notBefore ? new Date(cert.notBefore) : null,
      validTo: cert?.notAfter ? new Date(cert.notAfter) : null,
      daysUntilExpiry: cert?.notAfter ? Math.floor((cert.notAfter - Date.now()) / 86400000) : null,
      grade: endpoint?.grade || 'A',
    };
  } catch {
    // Fallback: just check if HTTPS works
    return {
      hasSSL: url.startsWith('https'),
      issuer: null,
      validFrom: null,
      validTo: null,
      daysUntilExpiry: null,
      grade: url.startsWith('https') ? 'A' : 'F',
    };
  }
}

// ─── SEO Analysis ───────────────────────────────────────────

function analyzeSEO(html: string, url: string): SEOData {
  const $ = (selector: string) => extractElements(html, selector);

  const title = extractTagContent(html, 'title');
  const metaDesc = extractMetaContent(html, 'description');
  const h1s = extractHeadings(html, 'h1');
  const h2s = extractHeadings(html, 'h2');

  const hasCanonical = /rel=["']canonical["']/i.test(html);
  const hasRobotsTxt = true; // would need separate check
  const hasSitemap = /<sitemap>/i.test(html) || /sitemap\.xml/i.test(html);
  const hasSchema = /application\/ld\+json/i.test(html);
  const schemaTypes = extractSchemaTypes(html);
  const ogTitle = extractMetaProperty(html, 'og:title');
  const ogDesc = extractMetaProperty(html, 'og:description');
  const ogImage = extractMetaProperty(html, 'og:image');
  const hasTwitterCard = /twitter:card/i.test(html);
  const hasViewport = /viewport/i.test(html);
  const isHttps = url.startsWith('https');

  // Count images and missing alt
  const imgMatches = html.match(/<img[^>]*>/gi) || [];
  const imagesWithoutAlt = imgMatches.filter(img => !/alt\s*=\s*["'][^"']+["']/i.test(img)).length;

  // Word count (rough)
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = textContent.split(/\s+/).length;

  // Score calculation
  let score = 0;
  if (title && title.length >= 30 && title.length <= 60) score += 15;
  if (metaDesc && metaDesc.length >= 120 && metaDesc.length <= 160) score += 15;
  if (h1s.length === 1) score += 10;
  if (hasCanonical) score += 5;
  if (hasSitemap) score += 5;
  if (hasSchema) score += 10;
  if (ogTitle) score += 5;
  if (ogImage) score += 5;
  if (hasTwitterCard) score += 5;
  if (hasViewport) score += 5;
  if (isHttps) score += 10;
  if (imagesWithoutAlt === 0 && imgMatches.length > 0) score += 5;
  if (wordCount >= 300) score += 5;

  return {
    title,
    titleLength: title?.length || 0,
    metaDescription: metaDesc,
    metaDescriptionLength: metaDesc?.length || 0,
    h1Count: h1s.length,
    h1Text: h1s,
    h2Count: h2s.length,
    hasCanonical,
    hasRobotsTxt,
    hasSitemap,
    hasSchemaMarkup: hasSchema,
    schemaTypes,
    ogTitle,
    ogDescription: ogDesc,
    ogImage,
    hasTwitterCard,
    imageCount: imgMatches.length,
    imagesWithoutAlt,
    internalLinks: (html.match(/href=["'][^"']*["']/gi) || []).length,
    externalLinks: 0, // would need domain comparison
    brokenLinks: [],
    wordCount,
    hasHreflang: /hreflang/i.test(html),
    hasViewport,
    isHttps,
    redirectChain: [],
    score: Math.min(100, score),
  };
}

// ─── Tech Stack Detection ───────────────────────────────────

function detectTechStack(html: string): TechStackData {
  const lower = html.toLowerCase();

  // CMS detection
  let cms: string | null = null;
  if (/wp-content|wordpress/i.test(html)) cms = 'WordPress';
  else if (/shopify/i.test(html)) cms = 'Shopify';
  else if (/squarespace/i.test(html)) cms = 'Squarespace';
  else if (/wix\.com|wixstatic/i.test(html)) cms = 'Wix';
  else if (/webflow/i.test(html)) cms = 'Webflow';
  else if (/joomla/i.test(html)) cms = 'Joomla';
  else if (/drupal/i.test(html)) cms = 'Drupal';
  else if (/gatsby/i.test(html)) cms = 'Gatsby';
  else if (/next\.js|_next/i.test(html)) cms = 'Next.js';
  else if (/_nuxt|nuxt/i.test(html)) cms = 'Nuxt.js';
  else if (/hugo/i.test(html)) cms = 'Hugo';

  // Analytics
  const analytics: string[] = [];
  if (/google-analytics|gtag|ga\(/i.test(html)) analytics.push('Google Analytics');
  if (/hotjar/i.test(html)) analytics.push('Hotjar');
  if (/mixpanel/i.test(html)) analytics.push('Mixpanel');
  if (/segment/i.test(html)) analytics.push('Segment');
  if (/plausible/i.test(html)) analytics.push('Plausible');
  if (/fathom/i.test(html)) analytics.push('Fathom');
  if (/matomo/i.test(html)) analytics.push('Matomo');

  // Advertising
  const advertising: string[] = [];
  if (/googletagmanager|gtm/i.test(html)) advertising.push('Google Tag Manager');
  if (/fbq|facebook.*pixel/i.test(html)) advertising.push('Facebook Pixel');
  if (/linkedin.*pixel|linkedin_insight/i.test(html)) advertising.push('LinkedIn Pixel');
  if (/twitter.*pixel|twttr/i.test(html)) advertising.push('Twitter Pixel');
  if (/tiktok.*pixel/i.test(html)) advertising.push('TikTok Pixel');

  // Chat widgets
  let chatWidget: string | null = null;
  if (/intercom/i.test(html)) chatWidget = 'Intercom';
  else if (/drift/i.test(html)) chatWidget = 'Drift';
  else if (/tawk\.to/i.test(html)) chatWidget = 'Tawk.to';
  else if (/zendesk/i.test(html)) chatWidget = 'Zendesk';
  else if (/crisp/i.test(html)) chatWidget = 'Crisp';
  else if (/livechat/i.test(html)) chatWidget = 'LiveChat';
  else if (/hubspot.*messages/i.test(html)) chatWidget = 'HubSpot Chat';

  // Booking
  let bookingSystem: string | null = null;
  if (/calendly/i.test(html)) bookingSystem = 'Calendly';
  else if (/acuity/i.test(html)) bookingSystem = 'Acuity';
  else if (/square.*appointments/i.test(html)) bookingSystem = 'Square Appointments';
  else if (/vagaro/i.test(html)) bookingSystem = 'Vagaro';
  else if (/booksy/i.test(html)) bookingSystem = 'Booksy';

  // E-commerce
  let ecommercePlatform: string | null = null;
  if (/shopify/i.test(html)) ecommercePlatform = 'Shopify';
  else if (/woocommerce/i.test(html)) ecommercePlatform = 'WooCommerce';
  else if (/bigcommerce/i.test(html)) ecommercePlatform = 'BigCommerce';
  else if (/magento/i.test(html)) ecommercePlatform = 'Magento';

  // Payment
  let paymentProcessor: string | null = null;
  if (/stripe/i.test(html)) paymentProcessor = 'Stripe';
  else if (/paypal/i.test(html)) paymentProcessor = 'PayPal';
  else if (/square/i.test(html)) paymentProcessor = 'Square';

  return {
    cms,
    framework: null,
    analytics,
    advertising,
    hosting: null,
    cdn: null,
    emailProvider: null,
    chatWidget,
    bookingSystem,
    paymentProcessor,
    ecommercePlatform,
    securityHeaders: [],
  };
}

// ─── Social Extraction ──────────────────────────────────────

function extractSocial(html: string): SocialData {
  const extractUrl = (pattern: RegExp): string | null => {
    const match = html.match(pattern);
    return match ? match[0] : null;
  };

  const linkedin = extractUrl(/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^\s"'<>]+/i);
  const facebook = extractUrl(/https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i);
  const instagram = extractUrl(/https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i);
  const twitter = extractUrl(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>]+/i);
  const youtube = extractUrl(/https?:\/\/(?:www\.)?youtube\.com\/(?:c\/|channel\/|@)[^\s"'<>]+/i);
  const tiktok = extractUrl(/https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'<>]+/i);
  const yelp = extractUrl(/https?:\/\/(?:www\.)?yelp\.com\/biz\/[^\s"'<>]+/i);

  const linksFound = [linkedin, facebook, instagram, twitter, youtube, tiktok].filter(Boolean).length;

  let score = 0;
  if (linkedin) score += 20;
  if (facebook) score += 15;
  if (instagram) score += 20;
  if (twitter) score += 10;
  if (youtube) score += 15;
  if (tiktok) score += 10;
  if (yelp) score += 10;

  return {
    linkedinUrl: linkedin,
    facebookUrl: facebook,
    instagramUrl: instagram,
    twitterUrl: twitter,
    youtubeUrl: youtube,
    tiktokUrl: tiktok,
    yelpUrl: yelp,
    gmbUrl: null,
    socialLinksFound: linksFound,
    hasSocialFeed: false,
    lastSocialPost: null,
    score: Math.min(100, score),
  };
}

// ─── Content Analysis ───────────────────────────────────────

function analyzeContent(html: string): ContentData {
  const lower = html.toLowerCase();
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  const copyrightMatch = textContent.match(/©\s*(\d{4})/i);
  const copyrightYear = copyrightMatch ? parseInt(copyrightMatch[1]) : null;
  const currentYear = new Date().getFullYear();

  return {
    hasBlog: /\/blog/i.test(html) || /class=["'][^"']*blog[^"']*["']/i.test(html),
    blogPostCount: 0,
    lastBlogPost: null,
    hasContactForm: /<form/i.test(html) && (/contact/i.test(html) || /email/i.test(html)),
    hasPhoneNumber: /tel:|phone|call\s*us/i.test(html),
    hasEmailAddress: /mailto:|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(html),
    hasLiveChat: /intercom|drift|tawk|zendesk|crisp|livechat/i.test(html),
    hasMap: /google.*maps|mapbox|iframe.*map/i.test(html),
    hasTestimonials: /testimonial|review|feedback|what.*clients.*say/i.test(html),
    hasPortfolio: /portfolio|our.*work|case.*stud/i.test(html),
    hasPricing: /pricing|price|plans/i.test(html),
    hasFAQ: /faq|frequently.*asked/i.test(html),
    hasAboutPage: /about.*us|our.*story|our.*team/i.test(html),
    copyrightYear,
    isOutdated: copyrightYear !== null && copyrightYear < currentYear - 1,
  };
}

// ─── Issue Generation ───────────────────────────────────────

function generateIssues(
  pageSpeed: PageSpeedData,
  ssl: SSLData,
  seo: SEOData,
  tech: TechStackData,
  social: SocialData,
  content: ContentData,
): Issue[] {
  const issues: Issue[] = [];

  // Performance issues
  if (pageSpeed.score < 50) {
    issues.push({
      category: 'performance',
      severity: 'critical',
      title: 'Extremely slow website',
      description: `Page speed score is ${pageSpeed.score}/100. Pages take ${pageSpeed.loadTime ? Math.round(pageSpeed.loadTime / 1000) + 's' : 'very long'} to load.`,
      impact: '53% of mobile visitors leave after 3 seconds of loading.',
      fix: 'Optimize images, enable caching, minify CSS/JS, consider a CDN.',
      revenueImpact: 'Losing ~50% of potential customers before they see your site.',
    });
  } else if (pageSpeed.score < 75) {
    issues.push({
      category: 'performance',
      severity: 'high',
      title: 'Slow page speed',
      description: `Page speed score is ${pageSpeed.score}/100.`,
      impact: 'Slow sites rank lower on Google and lose visitors.',
      fix: 'Compress images, leverage browser caching, reduce render-blocking resources.',
    });
  }

  // SSL issues
  if (!ssl.hasSSL) {
    issues.push({
      category: 'security',
      severity: 'critical',
      title: 'No SSL certificate (not HTTPS)',
      description: 'Website does not use HTTPS encryption.',
      impact: 'Chrome shows "Not Secure" warning. Google penalizes non-HTTPS sites.',
      fix: 'Install an SSL certificate (free via Let\'s Encrypt).',
    });
  }
  if (ssl.daysUntilExpiry !== null && ssl.daysUntilExpiry < 30) {
    issues.push({
      category: 'security',
      severity: ssl.daysUntilExpiry < 7 ? 'critical' : 'high',
      title: 'SSL certificate expiring soon',
      description: `Certificate expires in ${ssl.daysUntilExpiry} days.`,
      impact: 'Site will show security warnings and become inaccessible.',
      fix: 'Renew SSL certificate or enable auto-renewal.',
    });
  }

  // SEO issues
  if (!seo.title) {
    issues.push({
      category: 'seo',
      severity: 'high',
      title: 'Missing page title',
      description: 'No <title> tag found on the homepage.',
      impact: 'Title is the #1 on-page SEO factor. Missing title = invisible to Google.',
      fix: 'Add a descriptive title with target keywords (30-60 characters).',
    });
  } else if (seo.titleLength > 60) {
    issues.push({
      category: 'seo',
      severity: 'medium',
      title: 'Title too long',
      description: `Title is ${seo.titleLength} characters (recommended: 30-60).`,
      impact: 'Google truncates long titles in search results.',
      fix: 'Shorten to 30-60 characters with main keyword first.',
    });
  }

  if (!seo.metaDescription) {
    issues.push({
      category: 'seo',
      severity: 'high',
      title: 'Missing meta description',
      description: 'No meta description found.',
      impact: 'Google will auto-generate a snippet, which may not attract clicks.',
      fix: 'Write a compelling 120-160 character description with a call to action.',
    });
  }

  if (seo.h1Count === 0) {
    issues.push({
      category: 'seo',
      severity: 'high',
      title: 'No H1 heading',
      description: 'Page has no H1 tag.',
      impact: 'H1 tells Google what the page is about. Missing H1 = confused rankings.',
      fix: 'Add one H1 tag with your primary keyword.',
    });
  } else if (seo.h1Count > 1) {
    issues.push({
      category: 'seo',
      severity: 'medium',
      title: 'Multiple H1 headings',
      description: `Found ${seo.h1Count} H1 tags. Should be exactly 1.`,
      impact: 'Multiple H1s dilute keyword relevance.',
      fix: 'Keep one H1, convert others to H2.',
    });
  }

  if (!seo.hasSchemaMarkup) {
    issues.push({
      category: 'seo',
      severity: 'medium',
      title: 'No structured data (Schema markup)',
      description: 'No JSON-LD schema found.',
      impact: 'Missing rich snippets in Google search results (stars, prices, FAQs).',
      fix: 'Add LocalBusiness schema with your business details.',
    });
  }

  if (seo.imagesWithoutAlt > 0) {
    issues.push({
      category: 'seo',
      severity: 'medium',
      title: `${seo.imagesWithoutAlt} images missing alt text`,
      description: `${seo.imagesWithoutAlt} out of ${seo.imageCount} images have no alt attribute.`,
      impact: 'Images without alt text are invisible to Google Image Search and hurt accessibility.',
      fix: 'Add descriptive alt text to all images.',
    });
  }

  // Social issues
  if (social.socialLinksFound === 0) {
    issues.push({
      category: 'social',
      severity: 'medium',
      title: 'No social media presence',
      description: 'No social media links found on website.',
      impact: '71% of consumers who have a positive social media experience recommend the brand.',
      fix: 'Add links to your active social profiles.',
    });
  }

  // Content issues
  if (!content.hasContactForm && !content.hasPhoneNumber) {
    issues.push({
      category: 'content',
      severity: 'high',
      title: 'No clear contact method',
      description: 'No contact form or phone number found on homepage.',
      impact: 'Visitors can\'t easily reach you — lost leads.',
      fix: 'Add a contact form and phone number above the fold.',
    });
  }

  if (content.isOutdated) {
    issues.push({
      category: 'content',
      severity: 'low',
      title: 'Outdated website content',
      description: `Copyright year shows ${content.copyrightYear}.`,
      impact: 'Looks abandoned. Visitors may think the business is closed.',
      fix: 'Update copyright year and refresh content.',
    });
  }

  if (!content.hasTestimonials) {
    issues.push({
      category: 'content',
      severity: 'medium',
      title: 'No testimonials or reviews',
      description: 'No testimonials section found on website.',
      impact: '92% of consumers read testimonials before buying.',
      fix: 'Add customer testimonials with names and photos.',
    });
  }

  return issues.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// ─── Helpers ────────────────────────────────────────────────

function extractTagContent(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'));
  return match ? match[1].trim() : null;
}

function extractMetaContent(html: string, name: string): string | null {
  const match = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, 'i'));
  return match ? match[1].trim() : null;
}

function extractMetaProperty(html: string, property: string): string | null {
  const match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'));
  return match ? match[1].trim() : null;
}

function extractElements(html: string, selector: string): string[] {
  // Simplified — real impl would use cheerio
  return [];
}

function extractHeadings(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'gi');
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

function extractSchemaTypes(html: string): string[] {
  const types: string[] = [];
  const regex = /"@type"\s*:\s*"([^"]+)"/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    types.push(match[1]);
  }
  return types;
}

function normalizeUrl(url: string): string {
  if (!url.startsWith('http')) url = 'https://' + url;
  return url.replace(/\/$/, '');
}

function defaultPageSpeed(): PageSpeedData {
  return { loadTime: null, pageSize: null, requests: null, score: 0, mobileScore: 0, coreWebVitals: { lcp: null, fid: null, cls: null } };
}

function defaultSSL(): SSLData {
  return { hasSSL: false, issuer: null, validFrom: null, validTo: null, daysUntilExpiry: null, grade: 'F' };
}
