export interface ExtractedMetadata {
  title: string;
  url: string;
  author?: string[];
  publishedDate?: string;
  description?: string;
  siteName?: string;
  type: string;
}

export function extractGenericMetadata(): ExtractedMetadata {
  const metadata: ExtractedMetadata = {
    title: '',
    url: window.location.href,
    type: 'webpage'
  };

  // 1. Try JSON-LD (Schema.org) - highest quality
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const item = Array.isArray(data) ? data[0] : data;

      if (item.headline) metadata.title = item.headline;
      if (item.name && !metadata.title) metadata.title = item.name;

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

  if (!metadata.title && ogTitle) {
    metadata.title = ogTitle.getAttribute('content') || '';
  }
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

  // 4. Fallback to document title
  if (!metadata.title) {
    metadata.title = document.title;
  }

  return metadata;
}
