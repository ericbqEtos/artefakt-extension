/**
 * CSL-JSON Format Converter
 * Converts SourceCapture objects to CSL-JSON format for citation processing
 *
 * References:
 * - CSL-JSON schema: https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html
 * - APA AI citation guidance: https://apastyle.apa.org/blog/how-to-cite-chatgpt
 * - MLA AI citation guidance: https://style.mla.org/citing-generative-ai/
 */

import type { SourceCapture, Author, CSLDate } from '../../types/source';
import type { NotebookLMToolContext } from '../capture/adapters/notebooklm';

/**
 * CSL-JSON item structure
 * See: https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html
 */
export interface CSLItem {
  id: string;
  type: string;
  title?: string;
  author?: Array<{ family?: string; given?: string; literal?: string }>;
  issued?: { 'date-parts': number[][] };
  accessed?: { 'date-parts': number[][] };
  URL?: string;
  DOI?: string;
  publisher?: string;
  'publisher-place'?: string;
  'container-title'?: string;
  volume?: string;
  issue?: string;
  page?: string;
  abstract?: string;
  note?: string;
  // AI-specific fields (using CSL's note field for annotations)
  genre?: string;
  medium?: string;
  version?: string;
  dimensions?: string;
}

/**
 * AI platform company names for citations
 */
const AI_PLATFORM_AUTHORS: Record<string, { family: string; literal?: string }> = {
  chatgpt: { family: 'OpenAI', literal: 'OpenAI' },
  claude: { family: 'Anthropic', literal: 'Anthropic' },
  gemini: { family: 'Google', literal: 'Google' },
  notebooklm: { family: 'Google', literal: 'Google' },
  grok: { family: 'xAI', literal: 'xAI' },
  copilot: { family: 'Microsoft', literal: 'Microsoft' },
  perplexity: { family: 'Perplexity AI', literal: 'Perplexity AI' }
};

/**
 * AI tool display names for citations
 */
const AI_TOOL_NAMES: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  notebooklm: 'NotebookLM',
  grok: 'Grok',
  copilot: 'Microsoft Copilot',
  perplexity: 'Perplexity'
};

/**
 * Parse an author string into CSL author format
 * Handles various formats: "Last, First", "First Last", "Organization Name"
 */
export function parseAuthor(authorStr: string): Author {
  if (!authorStr || authorStr.trim() === '') {
    return { literal: 'Unknown' };
  }

  const trimmed = authorStr.trim();

  // Check if it looks like an organization (no comma, multiple words with capitals)
  if (!trimmed.includes(',') && /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(trimmed) === false) {
    // Check for "Last, First" format
    if (trimmed.includes(',')) {
      const [family, given] = trimmed.split(',').map(s => s.trim());
      return { family, given };
    }

    // Check for "First Last" format (common names)
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) {
      return { given: parts[0], family: parts[1] };
    }

    if (parts.length > 2) {
      // Assume last part is family name
      return {
        given: parts.slice(0, -1).join(' '),
        family: parts[parts.length - 1]
      };
    }
  }

  // Default to literal for organizations or unrecognized formats
  return { literal: trimmed };
}

/**
 * Parse an author string into CSL format for citation processing
 * Internal helper used by getAuthors() for backward compatibility
 */
function parseAuthorToCSL(authorStr: string): { family?: string; given?: string; literal?: string } | null {
  if (!authorStr || authorStr.trim() === '') {
    return null;
  }

  const trimmed = authorStr.trim();

  // Check for "Last, First" format
  if (trimmed.includes(',')) {
    const [family, given] = trimmed.split(',').map(s => s.trim());
    if (family && given) {
      return { family, given };
    }
    return { literal: trimmed };
  }

  // Check for "First Last" format (2 words)
  const parts = trimmed.split(/\s+/);
  if (parts.length === 2) {
    return { given: parts[0], family: parts[1] };
  }

  // 3+ words: assume last word is family name
  if (parts.length > 2) {
    return {
      given: parts.slice(0, -1).join(' '),
      family: parts[parts.length - 1]
    };
  }

  // Single word or organization - use literal
  return { literal: trimmed };
}

/**
 * Convert CSLDate to citeproc format
 */
function formatCSLDate(date: CSLDate | undefined): { 'date-parts': number[][] } | undefined {
  if (!date || !date['date-parts'] || !date['date-parts'][0]) {
    return undefined;
  }

  // citeproc expects arrays of numbers
  const parts = date['date-parts'][0].filter((n): n is number => n !== undefined);
  if (parts.length === 0) {
    return undefined;
  }

  return {
    'date-parts': [parts]
  };
}

/**
 * Get current date in CSL format
 */
function getCurrentDateCSL(): { 'date-parts': number[][] } {
  const now = new Date();
  return {
    'date-parts': [[now.getFullYear(), now.getMonth() + 1, now.getDate()]]
  };
}

/**
 * Get year from source for issued date
 * Falls back to creation date if no issued date available
 */
function getIssuedDate(source: SourceCapture): { 'date-parts': number[][] } {
  const issued = formatCSLDate(source.metadata.issued);
  if (issued) {
    return issued;
  }

  // For local files and sources without dates, use the capture date
  // This is better than showing "n.d." (no date)
  const createdAt = new Date(source.createdAt);
  return {
    'date-parts': [[createdAt.getFullYear(), createdAt.getMonth() + 1, createdAt.getDate()]]
  };
}

/**
 * Clean an author object by removing undefined/null properties
 * citeproc-js will output "undefined" literally if properties are explicitly undefined
 */
function cleanAuthor(author: { family?: string; given?: string; literal?: string }): { family?: string; given?: string; literal?: string } | null {
  const cleaned: { family?: string; given?: string; literal?: string } = {};

  if (author.family) cleaned.family = author.family;
  if (author.given) cleaned.given = author.given;
  if (author.literal) cleaned.literal = author.literal;

  // Return null if author has no valid properties
  if (Object.keys(cleaned).length === 0) {
    return null;
  }

  return cleaned;
}

/**
 * Get authors from source, with fallback handling
 * Some CSL styles (like Chicago) output "undefined" when author is completely missing,
 * so we ALWAYS provide a fallback to prevent citeproc from outputting "undefined"
 *
 * NOTE: This function handles both proper Author[] objects AND legacy string/string[] data
 * for backward compatibility with sources saved before the author normalization fix.
 */
function getAuthors(
  source: SourceCapture
): Array<{ family?: string; given?: string; literal?: string }> {
  // Check if source has valid authors
  const rawAuthors = source.metadata.author;

  // Handle various author data formats (for backward compatibility)
  let authors: Array<{ family?: string; given?: string; literal?: string }> | undefined;

  if (Array.isArray(rawAuthors)) {
    authors = rawAuthors
      .map(a => {
        // Already an Author object with proper properties
        if (typeof a === 'object' && a !== null) {
          return cleanAuthor({ family: a.family, given: a.given, literal: a.literal });
        }
        // Legacy: string author name - parse into Author object
        if (typeof a === 'string' && a.trim()) {
          return parseAuthorToCSL(a.trim());
        }
        return null;
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);
  } else if (typeof rawAuthors === 'string' && rawAuthors.trim()) {
    // Legacy: single string author
    authors = [parseAuthorToCSL(rawAuthors.trim())].filter((a): a is NonNullable<typeof a> => a !== null);
  }

  // If we have valid authors, return them
  if (authors && authors.length > 0) {
    return authors;
  }

  // No authors - provide a fallback to prevent citeproc from outputting "undefined"
  // This is standard bibliographic practice for anonymous/corporate authors

  // Try to derive author from container-title (site name) or publisher
  const siteName = source.metadata['container-title'] || source.metadata.publisher;
  if (siteName) {
    return [{ literal: siteName }];
  }

  // Try to get domain name from URL
  if (source.metadata.URL) {
    try {
      const url = new URL(source.metadata.URL);
      const domain = url.hostname.replace(/^www\./, '');
      // Capitalize first letter of each part
      const formattedDomain = domain.split('.')[0]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      if (formattedDomain) {
        return [{ literal: formattedDomain }];
      }
    } catch {
      // Invalid URL, skip
    }
  }

  // Try to use the title as a last resort (common for anonymous works)
  if (source.metadata.title) {
    // For anonymous works, use empty author array - citeproc handles this better
    // than no author field at all for most styles
    return [];
  }

  // Absolute last resort - return empty array
  // An empty author array is handled better by citeproc than undefined/missing field
  return [];
}

/**
 * Recursively remove all undefined values from an object
 * This is critical because citeproc-js will stringify "undefined" values literally
 */
function deepCleanObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  if (Array.isArray(obj)) {
    const cleaned = obj
      .map(item => deepCleanObject(item))
      .filter(item => item !== undefined);
    return cleaned.length > 0 ? cleaned : undefined;
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = deepCleanObject(value);
      if (cleanedValue !== undefined && cleanedValue !== '' && cleanedValue !== null) {
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  return obj;
}

/**
 * Clean CSL item by removing undefined values
 * citeproc can have issues with explicit undefined values
 */
function cleanCSLItem(item: CSLItem): CSLItem {
  const cleaned: CSLItem = { id: item.id, type: item.type };

  for (const [key, value] of Object.entries(item)) {
    if (value !== undefined && value !== null && value !== '') {
      // Also filter out empty arrays
      if (Array.isArray(value) && value.length === 0) {
        continue;
      }
      // Clean author arrays - remove undefined properties from each author
      if (key === 'author' && Array.isArray(value)) {
        const cleanedAuthors = value
          .map(a => cleanAuthor(a))
          .filter((a): a is NonNullable<typeof a> => a !== null);
        if (cleanedAuthors.length > 0) {
          (cleaned as any)[key] = cleanedAuthors;
        }
        continue;
      }
      (cleaned as any)[key] = value;
    }
  }

  return cleaned;
}

/**
 * Build NotebookLM-specific citation title
 * Includes the tool output type (podcast, quiz, etc.) and source references
 */
function buildNotebookLMTitle(
  source: SourceCapture,
  toolContext?: NotebookLMToolContext
): string {
  const baseTitle = source.aiMetadata?.conversationTitle ||
                    (source.aiMetadata as any)?.notebookTitle ||
                    'NotebookLM session';

  if (!toolContext || toolContext.outputType === 'chat') {
    return baseTitle;
  }

  // Add output type context
  let title = `${toolContext.outputLabel}`;

  // Add "based on X sources" if available
  if (toolContext.generatedFromSources && toolContext.sourceCount && toolContext.sourceCount > 0) {
    if (toolContext.sourceNames && toolContext.sourceNames.length > 0) {
      const sourceList = toolContext.sourceNames.slice(0, 3).join(', ');
      const moreCount = toolContext.sourceNames.length - 3;
      title += ` based on ${sourceList}`;
      if (moreCount > 0) {
        title += ` and ${moreCount} more`;
      }
    } else {
      title += ` based on ${toolContext.sourceCount} source${toolContext.sourceCount > 1 ? 's' : ''}`;
    }
  }

  // Add notebook title as subtitle
  if (baseTitle && baseTitle !== 'NotebookLM session') {
    title += ` [${baseTitle}]`;
  }

  return title;
}

/**
 * Convert a SourceCapture to CSL-JSON format
 */
export function sourceToCSL(source: SourceCapture): CSLItem {
  const id = source.id || `source-${Date.now()}`;

  // Handle AI conversations specially
  if (source.sourceType === 'ai-conversation' && source.platform) {
    return aiConversationToCSL(source, id);
  }

  // Handle videos
  if (source.sourceType === 'video') {
    return videoToCSL(source, id);
  }

  // Handle PDFs and documents
  if (source.sourceType === 'pdf' || source.sourceType === 'academic') {
    return documentToCSL(source, id);
  }

  // Default webpage handling
  return webpageToCSL(source, id);
}

/**
 * Convert AI conversation to CSL-JSON
 * Follows APA 7th edition and MLA 9th edition guidance for AI citations
 */
function aiConversationToCSL(source: SourceCapture, id: string): CSLItem {
  const platform = source.platform?.toLowerCase() || 'unknown';
  const platformAuthor = AI_PLATFORM_AUTHORS[platform];
  const toolName = AI_TOOL_NAMES[platform] || source.platform || 'AI Assistant';

  // Get model version info
  const modelVersion = source.aiMetadata?.modelVersion || '';

  // Build title based on platform
  let title: string;
  let genre = 'Large language model';

  if (platform === 'notebooklm') {
    // NotebookLM special handling
    const toolContext = (source.aiMetadata as any)?.toolContext as NotebookLMToolContext | undefined;
    title = buildNotebookLMTitle(source, toolContext);

    // Adjust genre based on output type
    if (toolContext) {
      switch (toolContext.outputType) {
        case 'audio-overview':
          genre = 'AI-generated audio summary';
          break;
        case 'video-overview':
          genre = 'AI-generated video summary';
          break;
        case 'quiz':
          genre = 'AI-generated quiz';
          break;
        case 'flashcards':
          genre = 'AI-generated flashcards';
          break;
        case 'mind-map':
          genre = 'AI-generated mind map';
          break;
        case 'report':
          genre = 'AI-generated report';
          break;
        default:
          genre = 'AI research tool';
      }
    } else {
      genre = 'AI research tool';
    }
  } else {
    // Standard AI conversation title
    title = source.aiMetadata?.conversationTitle ||
            source.metadata.title ||
            `Response to "${(source.aiMetadata?.promptText || '').slice(0, 50)}..."`;
  }

  // Format: "ChatGPT (GPT-4 version)" or just "ChatGPT"
  const versionSuffix = modelVersion ? ` (${modelVersion})` : '';
  const fullTitle = `${toolName}${versionSuffix}`;

  const cslItem: CSLItem = {
    id,
    type: 'software', // CSL type for software/AI tools
    title: fullTitle,
    author: platformAuthor ? [platformAuthor] : undefined,
    accessed: formatCSLDate(source.metadata.accessed) || getCurrentDateCSL(),
    URL: source.aiMetadata?.shareableUrl || source.metadata.URL,
    genre, // "Large language model" or specific tool type
    version: modelVersion || undefined
  };

  // Add issued date (use capture date for AI conversations)
  cslItem.issued = getIssuedDate(source);

  // Add note with conversation context if available
  const notes: string[] = [];
  if (source.aiMetadata?.promptText) {
    notes.push(`Prompt: "${source.aiMetadata.promptText.slice(0, 200)}..."`);
  }
  if (title !== fullTitle) {
    notes.push(`Topic: ${title}`);
  }
  if (notes.length > 0) {
    cslItem.note = notes.join('. ');
  }

  return cleanCSLItem(cslItem);
}

/**
 * Convert video source to CSL-JSON
 */
function videoToCSL(source: SourceCapture, id: string): CSLItem {
  const cslItem: CSLItem = {
    id,
    type: 'motion_picture', // or 'webpage' depending on context
    title: source.metadata.title,
    author: getAuthors(source),
    accessed: formatCSLDate(source.metadata.accessed) || getCurrentDateCSL(),
    issued: getIssuedDate(source),
    URL: source.metadata.URL,
    'container-title': source.metadata['container-title'] || 'YouTube',
    publisher: source.metadata.publisher
  };

  // Add timestamp note if available
  if (source.metadata.URL?.includes('t=')) {
    const match = source.metadata.URL.match(/[?&]t=(\d+)/);
    if (match) {
      const seconds = parseInt(match[1], 10);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      cslItem.note = `Timestamp: ${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  return cleanCSLItem(cslItem);
}

/**
 * Convert document/PDF to CSL-JSON
 */
function documentToCSL(source: SourceCapture, id: string): CSLItem {
  // Determine CSL type based on metadata
  let type = 'document';
  if (source.metadata.DOI || source.metadata.volume) {
    type = 'article-journal';
  } else if (source.metadata.publisher) {
    type = 'book';
  }

  const cslItem: CSLItem = {
    id,
    type,
    title: source.metadata.title,
    author: getAuthors(source),
    accessed: formatCSLDate(source.metadata.accessed) || getCurrentDateCSL(),
    issued: getIssuedDate(source),
    URL: source.metadata.URL,
    DOI: source.metadata.DOI,
    publisher: source.metadata.publisher,
    'container-title': source.metadata['container-title'],
    volume: source.metadata.volume,
    issue: source.metadata.issue,
    page: source.metadata.page,
    abstract: source.metadata.abstract
  };

  return cleanCSLItem(cslItem);
}

/**
 * Convert webpage to CSL-JSON
 */
function webpageToCSL(source: SourceCapture, id: string): CSLItem {
  const cslItem: CSLItem = {
    id,
    type: 'webpage',
    title: source.metadata.title,
    author: getAuthors(source),
    accessed: formatCSLDate(source.metadata.accessed) || getCurrentDateCSL(),
    issued: getIssuedDate(source),
    URL: source.metadata.URL,
    'container-title': source.metadata['container-title'],
    publisher: source.metadata.publisher,
    abstract: source.metadata.abstract
  };

  return cleanCSLItem(cslItem);
}

/**
 * Convert multiple sources to CSL-JSON items
 */
export function sourcesToCSL(sources: SourceCapture[]): CSLItem[] {
  return sources.map(source => sourceToCSL(source));
}
