import { db } from '@/lib/db';
import { processScreenshot } from '@/lib/capture/screenshot';
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
        captureSource(sender.tab?.id!, message.payload)
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
    // 1. Capture screenshot
    const screenshotDataUrl = await browser.tabs.captureVisibleTab(undefined, {
      format: 'jpeg',
      quality: 80
    });

    // 2. Get metadata from content script
    const { metadata, selectedText } = await browser.tabs.sendMessage(tabId, {
      type: 'EXTRACT_METADATA'
    });

    // 3. Process screenshot (compress, create thumbnail)
    const processedScreenshot = await processScreenshot(screenshotDataUrl);

    // 4. Get active session
    const session = await db.sessions.where('isActive').equals(1).first();

    // 5. Get tab info for provenance
    const tab = await browser.tabs.get(tabId);

    // 6. Create source record
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
