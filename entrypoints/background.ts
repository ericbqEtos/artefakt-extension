import { db } from '../src/lib/db';
import { processScreenshot } from '../src/lib/capture/screenshot';
import { v4 as uuid } from 'uuid';
import { isPDFUrl, getFileExtension } from '../src/lib/capture/adapters/pdf';
import type { Author } from '../src/types/source';

/**
 * Convert author data (string, string[], or Author[]) to proper Author[] format
 * This handles various input formats from different extractors
 */
function normalizeAuthors(authorData: unknown): Author[] | undefined {
  if (!authorData) return undefined;

  // Already an array
  if (Array.isArray(authorData)) {
    return authorData
      .map(a => {
        // Already an Author object
        if (typeof a === 'object' && a !== null && ('family' in a || 'given' in a || 'literal' in a)) {
          return a as Author;
        }
        // String author name - parse into Author object
        if (typeof a === 'string' && a.trim()) {
          return parseAuthorString(a.trim());
        }
        return null;
      })
      .filter((a): a is Author => a !== null);
  }

  // Single string author
  if (typeof authorData === 'string' && authorData.trim()) {
    return [parseAuthorString(authorData.trim())];
  }

  return undefined;
}

/**
 * Parse an author string into an Author object
 * Handles formats like "Last, First", "First Last", "Organization Name"
 */
function parseAuthorString(authorStr: string): Author {
  const trimmed = authorStr.trim();
  if (!trimmed) return { literal: 'Unknown' };

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

export default defineBackground(() => {
  // Handle keyboard shortcut
  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'capture-source') {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await captureSource(tab.id);
      }
    }
  });

  // Handle messages from content scripts and popup
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'CAPTURE_SOURCE':
        // Use tabId from message (sent by popup) or sender.tab.id (sent by content script)
        const tabId = message.tabId || sender.tab?.id;
        if (!tabId) {
          sendResponse({ error: 'No tab ID provided' });
          return true;
        }
        captureSource(tabId, message.payload)
          .then(sendResponse)
          .catch(err => sendResponse({ error: err.message }));
        return true;

      case 'GET_SOURCES':
        db.sources.orderBy('createdAt').reverse().toArray()
          .then(sendResponse);
        return true;

      case 'OPEN_SIDE_PANEL':
        // Get current window since popup doesn't have sender.tab
        browser.windows.getCurrent().then(window => {
          if (window.id) {
            browser.sidePanel.open({ windowId: window.id });
          }
        });
        return false;
    }
  });

  // Ensure a session exists
  initSession();
});

async function initSession() {
  const activeSession = await db.sessions.where('isActive').equals(1).first();
  if (!activeSession) {
    await db.sessions.add({
      id: uuid(),
      createdAt: new Date(),
      isActive: true
    });
  }
}

async function captureSource(tabId: number, options?: { selectedText?: string }) {
  try {
    // 1. Verify the tab exists and is capturable
    const tab = await browser.tabs.get(tabId);
    const isHttpUrl = tab.url?.startsWith('http://') || tab.url?.startsWith('https://');
    const isFileUrl = tab.url?.startsWith('file://');

    if (!isHttpUrl && !isFileUrl) {
      throw new Error('Cannot capture this page. Only web pages and local files can be captured.');
    }

    // 2. Check if this URL has already been captured
    const existingSource = await db.sources.filter(s => s.metadata.URL === tab.url).first();
    if (existingSource) {
      throw new Error('This page has already been captured.');
    }

    // 3. Capture screenshot
    let screenshotDataUrl: string;
    try {
      screenshotDataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
        format: 'jpeg',
        quality: 80
      });
    } catch (err) {
      throw new Error('Failed to capture screenshot. The page may be protected or hidden.');
    }

    // 4. Extract metadata based on file type
    let metadata: any;
    let selectedText: string = '';
    const isPDF = tab.url ? isPDFUrl(tab.url) : false;
    const fileExtension = tab.url ? getFileExtension(tab.url) : '';

    if (isFileUrl || isPDF) {
      // Handle local files and PDFs
      metadata = await extractLocalFileMetadata(tabId, tab.url!, fileExtension, isPDF);
    } else {
      // Handle web pages - try content script first
      try {
        const response = await browser.tabs.sendMessage(tabId, {
          type: 'EXTRACT_METADATA'
        });
        metadata = response.metadata;
        selectedText = response.selectedText || '';
      } catch (err) {
        // Content script not loaded, inject it programmatically
        console.log('Content script not responding, injecting programmatically...');

        // Execute script to extract metadata directly
        const results = await browser.scripting.executeScript({
          target: { tabId },
          func: () => {
            // Basic metadata extraction inline
            const getMetaContent = (name: string): string | undefined => {
              const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
              return el?.getAttribute('content') || undefined;
            };

            return {
              metadata: {
                title: document.title,
                url: window.location.href,
                description: getMetaContent('description') || getMetaContent('og:description'),
                author: getMetaContent('author'),
                siteName: getMetaContent('og:site_name') || window.location.hostname,
                sourceType: 'webpage',
                type: 'webpage'
              },
              selectedText: window.getSelection()?.toString().trim() || ''
            };
          }
        });

        if (results && results[0]?.result) {
          metadata = results[0].result.metadata;
          selectedText = results[0].result.selectedText || '';
        } else {
          throw new Error('Failed to extract metadata');
        }
      }
    }

    // 5. Process screenshot (compress, create thumbnail)
    const processedScreenshot = await processScreenshot(screenshotDataUrl);

    // 6. Get active session
    const session = await db.sessions.where('isActive').equals(1).first();

    // 7. Create source record (tab info already fetched at step 1)
    const source = {
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceType: metadata.sourceType || 'webpage',
      platform: metadata.platform,
      metadata: {
        type: metadata.type || 'webpage',
        title: metadata.title,
        author: normalizeAuthors(metadata.author),
        URL: metadata.url,
        accessed: {
          'date-parts': [[
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            new Date().getDate()
          ]] as [[number, number, number]]
        },
        issued: metadata.publishedDate ? parseDateToCSL(metadata.publishedDate) : undefined,
        'container-title': metadata.siteName,
        abstract: metadata.description
      },
      aiMetadata: metadata.aiMetadata,
      screenshot: {
        ...processedScreenshot,
        captureTimestamp: new Date()
      },
      highlightedExcerpt: selectedText || options?.selectedText,
      provenance: {
        sessionId: session?.id || 'default',
        captureMethod: 'manual' as const,
        captureContext: {
          tabTitle: tab.title || '',
          tabUrl: tab.url || ''
        }
      }
    };

    // 8. Save to IndexedDB
    await db.sources.add(source);

    return { success: true, sourceId: source.id };
  } catch (error) {
    console.error('Capture failed:', error);
    throw error;
  }
}

function parseDateToCSL(dateStr: string): { 'date-parts': [[number, number?, number?]] } | undefined {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return undefined;
    return {
      'date-parts': [[date.getFullYear(), date.getMonth() + 1, date.getDate()]]
    };
  } catch {
    return undefined;
  }
}

// Track if offscreen document exists
let creatingOffscreen: Promise<void> | null = null;

/**
 * Ensure offscreen document exists for PDF processing
 */
async function ensureOffscreenDocument(): Promise<void> {
  // Use chrome API directly for offscreen documents (not available in browser polyfill)
  const chromeGlobal = (globalThis as any).chrome;
  const chromeRuntime = chromeGlobal?.runtime;
  const chromeOffscreen = chromeGlobal?.offscreen;

  if (!chromeRuntime || !chromeOffscreen) {
    console.warn('Offscreen API not available');
    return;
  }

  const offscreenUrl = chromeRuntime.getURL('offscreen.html');

  // Check if already exists
  try {
    const existingContexts = await chromeRuntime.getContexts?.({
      contextTypes: ['OFFSCREEN_DOCUMENT' as any],
      documentUrls: [offscreenUrl]
    });

    if (existingContexts && existingContexts.length > 0) {
      return;
    }
  } catch {
    // getContexts not available, try to create anyway
  }

  // Create if needed
  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  try {
    creatingOffscreen = chromeOffscreen.createDocument({
      url: offscreenUrl,
      reasons: ['DOM_PARSER'],
      justification: 'Parse PDF documents to extract metadata'
    });

    await creatingOffscreen;
  } catch (err: any) {
    // May already exist
    if (!err.message?.includes('already exists')) {
      console.warn('Failed to create offscreen document:', err);
    }
  } finally {
    creatingOffscreen = null;
  }
}

/**
 * Extract metadata from local files (PDFs, documents)
 */
async function extractLocalFileMetadata(
  _tabId: number,
  url: string,
  extension: string,
  isPDF: boolean
): Promise<any> {
  // Extract filename from URL
  const urlPath = decodeURIComponent(url);
  const filename = urlPath.split('/').pop() || urlPath.split('\\').pop() || 'Unknown File';
  const titleWithoutExt = filename.replace(/\.[^.]+$/, '');

  // Determine source type based on extension
  let sourceType = 'document';
  if (isPDF || extension === 'pdf') {
    sourceType = 'pdf';
  } else if (['doc', 'docx', 'odt', 'rtf'].includes(extension)) {
    sourceType = 'document';
  } else if (['xls', 'xlsx', 'ods', 'csv'].includes(extension)) {
    sourceType = 'spreadsheet';
  } else if (['ppt', 'pptx', 'odp'].includes(extension)) {
    sourceType = 'presentation';
  } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
    sourceType = 'image';
  }

  // Try to extract PDF metadata using offscreen document
  if (isPDF || extension === 'pdf') {
    try {
      // Ensure offscreen document exists
      await ensureOffscreenDocument();

      // Send message to offscreen document to extract PDF metadata
      const pdfMetadata = await browser.runtime.sendMessage({
        type: 'EXTRACT_PDF_METADATA',
        url: url
      });

      if (pdfMetadata && !pdfMetadata.error) {
        console.log('Extracted PDF metadata:', pdfMetadata);

        // Use extracted title, falling back to filename
        const title = pdfMetadata.title || titleWithoutExt;

        // Build description from available metadata
        let description = '';
        if (pdfMetadata.subject) {
          description = pdfMetadata.subject;
        } else if (pdfMetadata.firstPageText) {
          description = pdfMetadata.firstPageText.slice(0, 300);
        }

        return {
          title,
          url: url,
          description: description || `PDF document: ${filename}`,
          author: pdfMetadata.author,
          publishedDate: pdfMetadata.creationDate,
          sourceType: 'pdf',
          type: 'document',
          platform: 'local',
          pdfMetadata: {
            pageCount: pdfMetadata.pageCount,
            keywords: pdfMetadata.keywords,
            creator: pdfMetadata.creator,
            producer: pdfMetadata.producer
          }
        };
      } else if (pdfMetadata?.error) {
        console.warn('PDF extraction error:', pdfMetadata.error);
      }
    } catch (err) {
      console.warn('Failed to extract PDF metadata via offscreen:', err);
    }
  }

  // Fallback: return basic file metadata
  return {
    title: titleWithoutExt,
    url: url,
    description: `${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)}: ${filename}`,
    sourceType,
    type: sourceType === 'pdf' ? 'document' : sourceType,
    platform: 'local'
  };
}
