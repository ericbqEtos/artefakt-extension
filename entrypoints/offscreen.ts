/**
 * Offscreen document for PDF metadata extraction
 * This runs in a DOM context where pdf.js can work properly
 */

import * as pdfjsLib from 'pdfjs-dist';

// WXT unlisted page definition
export default defineUnlistedScript(() => {
  // Set up the worker - use the bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  // Listen for messages from the background script
  // Use chrome API directly since this is an offscreen document
  const chromeRuntime = (globalThis as any).chrome?.runtime;
  if (chromeRuntime) {
    chromeRuntime.onMessage.addListener((
      message: ExtractMessage,
      _sender: any,
      sendResponse: (response: PDFMetadataResult) => void
    ) => {
      if (message.type === 'EXTRACT_PDF_METADATA') {
        extractPDFMetadata(message.url)
          .then(sendResponse)
          .catch((err: Error) => sendResponse({ error: err.message, pageCount: 0 }));
        return true; // Keep channel open for async response
      }
      return false;
    });
  }

  console.log('Offscreen document ready for PDF extraction');
});

interface ExtractMessage {
  type: string;
  url: string;
}

interface PDFMetadataResult {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: string;
  pageCount: number;
  firstPageText?: string;
  error?: string;
}

async function extractPDFMetadata(url: string): Promise<PDFMetadataResult> {
  try {
    console.log('Loading PDF from:', url);

    // Load the PDF
    const loadingTask = pdfjsLib.getDocument({
      url,
      // Disable range requests for local files
      disableRange: url.startsWith('file://'),
      disableStream: url.startsWith('file://')
    });

    const pdf = await loadingTask.promise;
    console.log('PDF loaded, pages:', pdf.numPages);

    // Get metadata
    const metadata = await pdf.getMetadata();
    const info = (metadata.info || {}) as Record<string, unknown>;

    console.log('PDF metadata:', info);

    // Extract title - try multiple sources
    let title = info.Title as string | undefined;

    // If no title in metadata, try to extract from first page
    let firstPageText = '';
    if (!title || title.trim() === '') {
      try {
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map(item => ('str' in item ? item.str : ''))
          .join(' ')
          .trim();

        firstPageText = pageText.slice(0, 1000);

        // Try to extract title from first line(s) - often the title is at the top
        // Look for text that looks like a title (before abstract, introduction, etc.)
        const lines = pageText.split(/\s{2,}|\n/).filter(l => l.trim().length > 0);
        if (lines.length > 0) {
          // Take first few lines that might be the title
          // Titles are usually short and at the beginning
          const potentialTitle = lines.slice(0, 3)
            .filter(line => {
              const lower = line.toLowerCase();
              // Skip common non-title text
              return !lower.startsWith('abstract') &&
                     !lower.startsWith('introduction') &&
                     !lower.startsWith('keywords') &&
                     !lower.includes('©') &&
                     !lower.includes('copyright') &&
                     line.length > 5 &&
                     line.length < 200;
            })
            .join(' ')
            .trim();

          if (potentialTitle.length > 10) {
            title = potentialTitle;
          }
        }
      } catch (textErr) {
        console.warn('Failed to extract text from first page:', textErr);
      }
    }

    // Parse dates
    let creationDate: string | undefined;
    if (info.CreationDate) {
      const dateStr = info.CreationDate as string;
      const parsed = parsePDFDate(dateStr);
      if (parsed) {
        creationDate = parsed.toISOString();
      }
    }

    // Parse keywords
    let keywords: string[] | undefined;
    if (info.Keywords) {
      const kw = info.Keywords as string;
      keywords = kw.split(/[,;]/).map(k => k.trim()).filter(k => k.length > 0);
    }

    return {
      title: title || undefined,
      author: info.Author as string | undefined,
      subject: info.Subject as string | undefined,
      keywords,
      creator: info.Creator as string | undefined,
      producer: info.Producer as string | undefined,
      creationDate,
      pageCount: pdf.numPages,
      firstPageText: firstPageText.slice(0, 500)
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Parse PDF date format (D:YYYYMMDDHHmmSSOHH'mm')
 */
function parsePDFDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  try {
    // Remove 'D:' prefix if present
    const cleaned = dateStr.replace(/^D:/, '');

    // Extract components: YYYYMMDDHHmmSS
    const year = parseInt(cleaned.slice(0, 4), 10);
    const month = parseInt(cleaned.slice(4, 6), 10) - 1;
    const day = parseInt(cleaned.slice(6, 8), 10);
    const hour = parseInt(cleaned.slice(8, 10), 10) || 0;
    const minute = parseInt(cleaned.slice(10, 12), 10) || 0;
    const second = parseInt(cleaned.slice(12, 14), 10) || 0;

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }

    return new Date(year, month, day, hour, minute, second);
  } catch {
    return null;
  }
}
