export interface ExtractedMetadata {
  title: string;
  url: string;
  author?: string[];
  publishedDate?: string;
  description?: string;
  siteName?: string;
  type: string;
}

/**
 * Check if the current URL appears to be a landing/home page rather than specific content.
 * Landing pages typically have minimal path structure.
 */
function isLandingPage(): boolean {
  const path = window.location.pathname;

  // Empty path or just "/"
  if (!path || path === '/') return true;

  // Common language/locale prefixes only (e.g., /en, /sv, /de, /en-us)
  const localePattern = /^\/[a-z]{2}(-[a-z]{2})?\/?$/i;
  if (localePattern.test(path)) return true;

  // Common home page paths
  const homePatterns = ['/home', '/index', '/index.html', '/index.htm', '/default', '/main'];
  const normalizedPath = path.toLowerCase();
  if (homePatterns.some(p => normalizedPath === p || normalizedPath === p + '/')) return true;

  return false;
}

export function extractGenericMetadata(): ExtractedMetadata {
  const metadata: ExtractedMetadata = {
    title: '',
    url: window.location.href,
    type: 'webpage'
  };

  // Determine if this is a landing page - affects title source priority
  const landingPage = isLandingPage();

  // Store JSON-LD title separately so we can decide later
  let jsonLdTitle = '';

  // 1. Try JSON-LD (Schema.org) - extract all metadata
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const item = Array.isArray(data) ? data[0] : data;

      if (item.headline) jsonLdTitle = item.headline;
      if (item.name && !jsonLdTitle) jsonLdTitle = item.name;

      if (item.author) {
        const authors = Array.isArray(item.author) ? item.author : [item.author];
        metadata.author = authors.map((a: unknown) =>
          typeof a === 'string' ? a : ((a as { name?: string }).name || '')
        ).filter(Boolean);
      }

      if (item.datePublished) metadata.publishedDate = item.datePublished;
      if (item.description) metadata.description = item.description;

      if (item['@type']) {
        const typeMap: Record<string, string> = {
          'Article': 'article',
          'NewsArticle': 'article-newspaper',
          'ScholarlyArticle': 'article-journal',
          'BlogPosting': 'post-weblog',
          'WebPage': 'webpage'
        };
        metadata.type = typeMap[item['@type']] || 'webpage';
      }
    } catch {
      // Continue to next script or fallback
    }
  }

  // 2. Try OpenGraph meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogSiteName = document.querySelector('meta[property="og:site_name"]');
  const ogType = document.querySelector('meta[property="og:type"]');

  const ogTitleContent = ogTitle?.getAttribute('content') || '';

  if (!metadata.description && ogDescription) {
    metadata.description = ogDescription.getAttribute('content') || '';
  }
  if (ogSiteName) {
    metadata.siteName = ogSiteName.getAttribute('content') || '';
  }
  if (ogType?.getAttribute('content') === 'article') {
    metadata.type = 'article';
  }

  // 3. Try standard meta tags
  const metaAuthor = document.querySelector('meta[name="author"]');
  const metaDescription = document.querySelector('meta[name="description"]');
  const metaDate = document.querySelector('meta[name="date"], meta[property="article:published_time"]');

  if (!metadata.author?.length && metaAuthor) {
    const authorContent = metaAuthor.getAttribute('content');
    if (authorContent) {
      metadata.author = [authorContent];
    }
  }
  if (!metadata.description && metaDescription) {
    metadata.description = metaDescription.getAttribute('content') || '';
  }
  if (!metadata.publishedDate && metaDate) {
    metadata.publishedDate = metaDate.getAttribute('content') || '';
  }

  // 4. Determine title based on page type
  // For landing pages: prefer og:title or document.title (site-level names)
  // For content pages: prefer JSON-LD headline/name (specific article titles)
  if (landingPage) {
    // Landing page: prefer og:title > document.title > JSON-LD
    metadata.title = ogTitleContent || document.title || jsonLdTitle;
  } else {
    // Content page: prefer JSON-LD > og:title > document.title
    metadata.title = jsonLdTitle || ogTitleContent || document.title;
  }

  return metadata;
}
