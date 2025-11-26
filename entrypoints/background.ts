import { db } from '../src/lib/db';
import { processScreenshot } from '../src/lib/capture/screenshot';
import { v4 as uuid } from 'uuid';

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
        browser.sidePanel.open({ tabId: sender.tab?.id });
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
    if (!tab.url?.startsWith('http://') && !tab.url?.startsWith('https://')) {
      throw new Error('Cannot capture this page. Only HTTP/HTTPS pages can be captured.');
    }

    // 2. Capture screenshot
    let screenshotDataUrl: string;
    try {
      screenshotDataUrl = await browser.tabs.captureVisibleTab(undefined, {
        format: 'jpeg',
        quality: 80
      });
    } catch (err) {
      throw new Error('Failed to capture screenshot. The page may be protected or hidden.');
    }

    // 3. Try to get metadata from content script, inject if needed
    let metadata: any;
    let selectedText: string = '';

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

    // 4. Process screenshot (compress, create thumbnail)
    const processedScreenshot = await processScreenshot(screenshotDataUrl);

    // 5. Get active session
    const session = await db.sessions.where('isActive').equals(1).first();

    // 6. Create source record (tab info already fetched at step 1)
    const source = {
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      sourceType: metadata.sourceType || 'webpage',
      platform: metadata.platform,
      metadata: {
        type: metadata.type || 'webpage',
        title: metadata.title,
        author: metadata.author,
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

    // 7. Save to IndexedDB
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
