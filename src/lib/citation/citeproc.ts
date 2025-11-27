/**
 * Citeproc-js Engine Wrapper
 * Handles citation formatting using the citeproc-js library
 */

// @ts-expect-error - citeproc doesn't have TypeScript declarations
import CSL from 'citeproc';
import { loadStyle, EN_US_LOCALE, type CitationStyleId } from './styles';
import { sourceToCSL, type CSLItem } from './formats';
import type { SourceCapture } from '../../types/source';

/**
 * Citation result containing both in-text and bibliography formats
 */
export interface CitationResult {
  inText: string;           // In-text citation (e.g., "(Smith, 2024)")
  bibliography: string;     // Full bibliography entry
  bibliographyHtml: string; // HTML-formatted bibliography
}

/**
 * Deep clean an object to remove ALL undefined values recursively
 * This is critical because citeproc-js will stringify "undefined" literally
 */
function deepCleanForCiteproc(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  if (Array.isArray(obj)) {
    return obj
      .map(item => deepCleanForCiteproc(item))
      .filter(item => item !== undefined);
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = deepCleanForCiteproc(value);
      if (cleanedValue !== undefined && cleanedValue !== '') {
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  return obj;
}

/**
 * System object required by citeproc-js
 * Provides locale and item retrieval
 */
function createCiteprocSys(items: Record<string, CSLItem>) {
  return {
    retrieveLocale: (_lang: string) => EN_US_LOCALE,
    retrieveItem: (id: string) => {
      const item = items[id];
      // Deep clean the item before returning to citeproc to ensure no undefined values
      return item ? deepCleanForCiteproc(item) : undefined;
    }
  };
}

/**
 * Create a citeproc engine for a specific style
 */
async function createEngine(
  styleId: CitationStyleId,
  items: CSLItem[]
): Promise<typeof CSL.Engine> {
  // Load the CSL style XML
  const styleXml = await loadStyle(styleId);

  // Build items lookup
  const itemsById: Record<string, CSLItem> = {};
  items.forEach(item => {
    itemsById[item.id] = item;
  });

  // Create the citeproc system
  const sys = createCiteprocSys(itemsById);

  // Create and return the engine
  const engine = new CSL.Engine(sys, styleXml);
  engine.setOutputFormat('html');

  return engine;
}

/**
 * Generate citations for a single source
 */
export async function generateCitation(
  source: SourceCapture,
  styleId: CitationStyleId
): Promise<CitationResult> {
  const cslItem = sourceToCSL(source);
  const engine = await createEngine(styleId, [cslItem]);

  // Update items in engine
  engine.updateItems([cslItem.id]);

  // Generate in-text citation
  const inTextResult = engine.makeCitationCluster([{ id: cslItem.id }]);

  // Generate bibliography
  const bibResult = engine.makeBibliography();

  // Extract bibliography text
  let bibliography = '';
  let bibliographyHtml = '';
  if (bibResult && bibResult[1]) {
    bibliographyHtml = bibResult[1].join('');
    // Strip HTML for plain text version
    bibliography = bibliographyHtml
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    inText: inTextResult || '',
    bibliography,
    bibliographyHtml
  };
}

/**
 * Generate citations for multiple sources
 */
export async function generateCitations(
  sources: SourceCapture[],
  styleId: CitationStyleId
): Promise<{
  citations: Map<string, CitationResult>;
  fullBibliography: string;
  fullBibliographyHtml: string;
}> {
  if (sources.length === 0) {
    return {
      citations: new Map(),
      fullBibliography: '',
      fullBibliographyHtml: ''
    };
  }

  // Convert all sources to CSL
  const cslItems = sources.map(source => sourceToCSL(source));

  // Create engine with all items
  const engine = await createEngine(styleId, cslItems);

  // Update items in engine
  engine.updateItems(cslItems.map(item => item.id));

  // Generate individual citations
  const citations = new Map<string, CitationResult>();

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const item = cslItems[i];

    // Generate in-text citation for this item
    const inText = engine.makeCitationCluster([{ id: item.id }]);

    citations.set(source.id!, {
      inText: inText || '',
      bibliography: '', // Will be filled from full bibliography
      bibliographyHtml: ''
    });
  }

  // Generate full bibliography
  const bibResult = engine.makeBibliography();

  let fullBibliography = '';
  let fullBibliographyHtml = '';

  if (bibResult && bibResult[1]) {
    fullBibliographyHtml = bibResult[1].join('');
    fullBibliography = fullBibliographyHtml
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Try to match individual bibliography entries to sources
    // bibResult[0] contains metadata including entry_ids
    const entryIds = bibResult[0]?.entry_ids || [];
    const entries = bibResult[1] || [];

    for (let i = 0; i < entryIds.length && i < entries.length; i++) {
      const id = entryIds[i]?.[0];
      if (id) {
        const source = sources.find(s => s.id === id);
        if (source && citations.has(source.id!)) {
          const citation = citations.get(source.id!)!;
          citation.bibliographyHtml = entries[i];
          citation.bibliography = entries[i]
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        }
      }
    }
  }

  return {
    citations,
    fullBibliography,
    fullBibliographyHtml
  };
}

/**
 * Format a date for display in citations
 */
export function formatCitationDate(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}


/**
 * Generate a quick preview citation without full citeproc processing
 * Useful for showing immediate feedback while full citation loads
 */
export function generateQuickCitation(source: SourceCapture, style: CitationStyleId): string {
  const author = source.metadata.author?.[0];
  const authorName = author?.family || author?.literal || 'Unknown Author';
  const year = source.metadata.issued?.['date-parts']?.[0]?.[0] ||
               new Date(source.createdAt).getFullYear();
  const title = source.metadata.title || 'Untitled';
  const url = source.metadata.URL || '';

  // AI conversation special handling
  if (source.sourceType === 'ai-conversation' && source.platform) {
    const platform = source.platform.toLowerCase();
    const toolNames: Record<string, string> = {
      chatgpt: 'ChatGPT',
      claude: 'Claude',
      gemini: 'Gemini',
      notebooklm: 'NotebookLM',
      grok: 'Grok'
    };
    const toolName = toolNames[platform] || source.platform || 'AI Tool';
    const company: Record<string, string> = {
      chatgpt: 'OpenAI',
      claude: 'Anthropic',
      gemini: 'Google',
      notebooklm: 'Google',
      grok: 'xAI'
    };
    const companyName = company[platform] || 'AI Provider';
    const version = source.aiMetadata?.modelVersion;
    const accessDate = formatCitationDate(new Date(source.createdAt));

    switch (style) {
      case 'apa':
        return `${companyName}. (${year}). ${toolName}${version ? ` (${version})` : ''} [Large language model].${url ? ` ${url}` : ''}`;
      case 'mla':
        return `"${title}." ${toolName}, ${version || 'current version'}, ${companyName}, ${accessDate}${url ? `, ${url}` : ''}.`;
      case 'chicago':
        return `${companyName}. "${title}." ${toolName}. Accessed ${accessDate}.${url ? ` ${url}` : ''}`;
      default:
        return `${companyName}. ${toolName}${version ? ` (${version})` : ''}.${url ? ` ${url}` : ''}`;
    }
  }

  // Standard citation preview
  const containerTitle = source.metadata['container-title'];

  switch (style) {
    case 'apa':
      return `${authorName} (${year}). ${title}.${url ? ` ${url}` : ''}`;
    case 'mla':
      return `${authorName}. "${title}." ${containerTitle || 'Web'}, ${year}.`;
    case 'chicago':
      return `${authorName}. "${title}." Accessed ${formatCitationDate(new Date(source.createdAt))}.${url ? ` ${url}` : ''}`;
    default:
      return `${authorName} (${year}). ${title}.${url ? ` ${url}` : ''}`;
  }
}
