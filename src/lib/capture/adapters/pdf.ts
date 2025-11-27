/**
 * PDF Adapter - Extracts metadata and text from PDF files
 * Uses pdf.js (pdfjs-dist) for parsing
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface PDFMetadata {
  title: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
  extractedText?: string;
  sourceType: 'pdf';
  type: 'document';
}

/**
 * Extract metadata and text from a PDF file URL
 */
export async function extractPDFMetadata(url: string): Promise<PDFMetadata> {
  try {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;

    // Get document metadata
    const metadata = await pdf.getMetadata();
    const info = metadata.info as Record<string, unknown>;

    // Extract title from metadata or filename
    let title = info?.Title as string;
    if (!title) {
      // Extract filename from URL
      const urlPath = decodeURIComponent(url);
      const filename = urlPath.split('/').pop() || urlPath.split('\\').pop() || 'Unknown PDF';
      title = filename.replace(/\.pdf$/i, '');
    }

    // Parse dates
    let creationDate: Date | undefined;
    let modificationDate: Date | undefined;

    if (info?.CreationDate) {
      creationDate = parsePDFDate(info.CreationDate as string);
    }
    if (info?.ModDate) {
      modificationDate = parsePDFDate(info.ModDate as string);
    }

    // Parse keywords
    let keywords: string[] | undefined;
    if (info?.Keywords) {
      const kw = info.Keywords as string;
      keywords = kw.split(/[,;]/).map(k => k.trim()).filter(k => k.length > 0);
    }

    // Extract text from first few pages (for description/summary)
    const extractedText = await extractTextFromPDF(pdf, 3); // First 3 pages

    return {
      title,
      author: info?.Author as string | undefined,
      subject: info?.Subject as string | undefined,
      keywords,
      creator: info?.Creator as string | undefined,
      producer: info?.Producer as string | undefined,
      creationDate,
      modificationDate,
      pageCount: pdf.numPages,
      extractedText,
      sourceType: 'pdf',
      type: 'document'
    };
  } catch (error) {
    console.error('Failed to extract PDF metadata:', error);
    // Return minimal metadata with filename
    const urlPath = decodeURIComponent(url);
    const filename = urlPath.split('/').pop() || urlPath.split('\\').pop() || 'Unknown PDF';

    return {
      title: filename.replace(/\.pdf$/i, ''),
      pageCount: 0,
      sourceType: 'pdf',
      type: 'document'
    };
  }
}

/**
 * Extract text content from PDF pages
 */
async function extractTextFromPDF(pdf: pdfjsLib.PDFDocumentProxy, maxPages: number = 3): Promise<string> {
  const textParts: string[] = [];
  const numPages = Math.min(pdf.numPages, maxPages);

  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ');
      textParts.push(pageText);
    } catch (err) {
      console.warn(`Failed to extract text from page ${i}:`, err);
    }
  }

  // Clean up and limit text
  const fullText = textParts.join('\n\n').trim();
  // Limit to ~2000 characters for description
  return fullText.slice(0, 2000) + (fullText.length > 2000 ? '...' : '');
}

/**
 * Parse PDF date format (D:YYYYMMDDHHmmSSOHH'mm')
 */
function parsePDFDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  try {
    // Remove 'D:' prefix if present
    const cleaned = dateStr.replace(/^D:/, '');

    // Extract components: YYYYMMDDHHmmSS
    const year = parseInt(cleaned.slice(0, 4), 10);
    const month = parseInt(cleaned.slice(4, 6), 10) - 1; // 0-indexed
    const day = parseInt(cleaned.slice(6, 8), 10);
    const hour = parseInt(cleaned.slice(8, 10), 10) || 0;
    const minute = parseInt(cleaned.slice(10, 12), 10) || 0;
    const second = parseInt(cleaned.slice(12, 14), 10) || 0;

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return undefined;
    }

    return new Date(year, month, day, hour, minute, second);
  } catch {
    return undefined;
  }
}

/**
 * Check if a URL points to a PDF file
 */
export function isPDFUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf?') || lowerUrl.includes('.pdf#');
}

/**
 * Check if a URL is a local file
 */
export function isLocalFile(url: string): boolean {
  return url.startsWith('file://');
}

/**
 * Get file extension from URL
 */
export function getFileExtension(url: string): string {
  const urlPath = decodeURIComponent(url);
  const filename = urlPath.split('/').pop() || urlPath.split('\\').pop() || '';
  const match = filename.match(/\.([^.?#]+)(?:[?#]|$)/);
  return match ? match[1].toLowerCase() : '';
}
