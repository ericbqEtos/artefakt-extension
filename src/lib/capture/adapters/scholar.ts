export interface ScholarMetadata {
  title: string;
  author?: string[];
  type: string;
  academicMetadata: {
    citationCount?: string;
    venue?: string;
    year?: string;
    pdfUrl?: string;
    doi?: string;
  };
}

export function extractScholarMetadata(): ScholarMetadata | null {
  if (!window.location.hostname.includes('scholar.google.com')) {
    return null;
  }

  // Get the main result or current paper being viewed
  const resultEl = document.querySelector('.gs_ri') || document.querySelector('.gs_r');

  if (!resultEl) {
    return null;
  }

  // Get title
  const titleEl = resultEl.querySelector('.gs_rt a, h3.gs_rt');
  const title = titleEl?.textContent?.trim() || '';

  // Get authors
  const authorEl = resultEl.querySelector('.gs_a');
  const authorText = authorEl?.textContent?.trim() || '';
  const authorParts = authorText.split(' - ')[0];
  const authors = authorParts?.split(',').map(a => a.trim()).filter(Boolean) || [];

  // Get citation count
  const citationEl = resultEl.querySelector('a[href*="cites"]');
  const citationText = citationEl?.textContent?.trim();
  const citationCount = citationText?.match(/\d+/)?.[0];

  // Get venue/journal
  const venueMatch = authorText.split(' - ')[1];
  const venue = venueMatch?.split(',')[0]?.trim();

  // Get year
  const yearMatch = authorText.match(/\d{4}/);
  const year = yearMatch?.[0];

  // Get PDF link if available
  const pdfLink = resultEl.querySelector('a[href*=".pdf"]');
  const pdfUrl = pdfLink?.getAttribute('href') || undefined;

  return {
    title,
    author: authors,
    type: 'article-journal',
    academicMetadata: {
      citationCount,
      venue,
      year,
      pdfUrl
    }
  };
}
