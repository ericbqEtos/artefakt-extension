# Artefakt Extension — Implementation Plan

**Version 1.0 — November 2025**

> This document provides step-by-step implementation instructions for building the Artefakt Extension. Read this document fully before beginning implementation.

---

## Table of Contents

1. [Overview & Context](#1-overview--context)
2. [Phase 1: Project Setup & Core Infrastructure](#2-phase-1-project-setup--core-infrastructure)
3. [Phase 2: Source Capture System](#3-phase-2-source-capture-system)
4. [Phase 3: Platform Adapters](#4-phase-3-platform-adapters)
5. [Phase 4: UI Components](#5-phase-4-ui-components)
6. [Phase 5: Citation System](#6-phase-5-citation-system)
7. [Phase 6: Origin Trail Visualization](#7-phase-6-origin-trail-visualization)
8. [Phase 7: Backend & Sharing](#8-phase-7-backend--sharing)
9. [Phase 8: Testing & Polish](#9-phase-8-testing--polish)
10. [MVP Deliverables Summary](#10-mvp-deliverables-summary)

---

## 1. Overview & Context

### 1.1 What You're Building

A browser extension that allows students and educators to:

1. Save sources from any webpage, academic paper, AI conversation, or video
2. Automatically capture screenshots as visual documentation
3. Generate properly formatted citations (APA, MLA, Chicago, etc.)
4. Create an "origin trail" showing the research journey
5. Share the process with examiners or collaborators

### 1.2 Key Technical Decisions

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | WXT (wxt.dev) | Cross-browser builds, Vite-based, Manifest V3 |
| UI | React + Tailwind CSS | Component reusability, accessibility support |
| Language | TypeScript | Type safety, maintainability |
| Local Storage | IndexedDB via Dexie.js | Large capacity, blob support |
| Backend (MVP) | Supabase | Free tier, PostgreSQL, built-in auth |
| Citation Engine | citeproc-js + CSL | 10,000+ styles, industry standard |
| Image Processing | browser-image-compression | Web worker support, configurable |
| Visualization | vis-timeline | Timeline view for origin trail |

### 1.3 Requirements to Keep in Mind

- **Accessibility**: WCAG 2.1 AA compliant. All interactive elements keyboard accessible. ARIA labels. 4.5:1 color contrast.
- **Privacy**: Local-first storage. Cloud sync opt-in. PII detection before sharing. Domain exclusion for sensitive sites.
- **Cross-browser**: Target Chrome (primary), Firefox, Edge, Safari. Use Manifest V3.

---

## 2. Phase 1: Project Setup & Core Infrastructure

**Duration: 2-3 days**

### 2.1 Initialize WXT Project

```bash
# Create new WXT project with React and TypeScript
npx wxt@latest init artefakt-extension --template react

cd artefakt-extension

# Install core dependencies
npm install dexie dexie-react-hooks
npm install @supabase/supabase-js
npm install browser-image-compression
npm install citeproc
npm install vis-timeline vis-data
npm install uuid nanoid date-fns

# Install dev dependencies
npm install -D tailwindcss postcss autoprefixer
npm install -D @types/uuid

# Initialize Tailwind
npx tailwindcss init -p
```

### 2.2 Project Structure

Create the following directory structure:

```
artefakt-extension/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts           # Service worker
│   │   ├── popup/                  # Quick capture popup
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.html
│   │   ├── sidepanel/              # Full reference clipboard
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.html
│   │   ├── options/                # Settings page
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.html
│   │   └── content.ts              # Content script
│   ├── components/
│   │   ├── ui/                     # Shared UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Modal.tsx
│   │   ├── SourceCard.tsx          # Display a captured source
│   │   ├── CitationFormatter.tsx   # Format selection & output
│   │   ├── OriginTrail.tsx         # Timeline visualization
│   │   └── ScreenshotViewer.tsx    # Full screenshot modal
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts            # Dexie database setup
│   │   │   └── types.ts            # Database schema types
│   │   ├── capture/
│   │   │   ├── screenshot.ts       # Screenshot capture logic
│   │   │   ├── metadata.ts         # Page metadata extraction
│   │   │   └── adapters/           # Platform-specific extractors
│   │   │       ├── generic.ts
│   │   │       ├── chatgpt.ts
│   │   │       ├── claude.ts
│   │   │       ├── gemini.ts
│   │   │       ├── youtube.ts
│   │   │       └── scholar.ts
│   │   ├── citation/
│   │   │   ├── citeproc.ts         # Citation processing
│   │   │   ├── styles.ts           # CSL style loading
│   │   │   └── formats.ts          # AI citation templates
│   │   ├── storage/
│   │   │   ├── local.ts            # IndexedDB operations
│   │   │   └── sync.ts             # Supabase sync
│   │   └── utils/
│   │       ├── compression.ts      # Image compression
│   │       ├── pii.ts              # PII detection
│   │       └── accessibility.ts    # A11y helpers
│   ├── hooks/
│   │   ├── useSources.ts           # Source CRUD operations
│   │   ├── useSession.ts           # Research session management
│   │   └── useCitation.ts          # Citation generation
│   ├── types/
│   │   ├── source.ts               # SourceCapture type
│   │   ├── session.ts              # ResearchSession type
│   │   └── csl.ts                  # CSL-JSON types
│   └── styles/
│       └── globals.css             # Tailwind imports
├── public/
│   └── icons/                      # Extension icons (16, 32, 48, 128px)
├── wxt.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### 2.3 Configure WXT

Update `wxt.config.ts`:

```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Artefakt Extension',
    description: 'Capture, cite, and document your research process',
    version: '0.1.0',
    permissions: [
      'activeTab',
      'storage',
      'sidePanel',
      'clipboardWrite'
    ],
    host_permissions: [
      'https://chat.openai.com/*',
      'https://chatgpt.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
      'https://www.youtube.com/*',
      'https://scholar.google.com/*'
    ],
    side_panel: {
      default_path: 'sidepanel/index.html'
    },
    action: {
      default_popup: 'popup/index.html',
      default_icon: {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
        '48': 'icons/icon-48.png',
        '128': 'icons/icon-128.png'
      }
    },
    commands: {
      'capture-source': {
        suggested_key: {
          default: 'Alt+Shift+S'
        },
        description: 'Capture current page as source'
      }
    }
  }
});
```

### 2.4 Database Schema

Create `src/lib/db/index.ts`:

```typescript
import Dexie, { Table } from 'dexie';
import { SourceCapture, ResearchSession } from './types';

export class ArtefaktDatabase extends Dexie {
  sources!: Table<SourceCapture>;
  sessions!: Table<ResearchSession>;

  constructor() {
    super('ArtefaktDB');
    
    this.version(1).stores({
      sources: '++id, createdAt, sourceType, platform, sessionId, [sessionId+createdAt]',
      sessions: '++id, createdAt, userId, isActive'
    });
  }
}

export const db = new ArtefaktDatabase();
```

Create `src/lib/db/types.ts`:

```typescript
export interface SourceCapture {
  id?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Source identification
  sourceType: 'webpage' | 'academic' | 'ai-conversation' | 'video' | 'podcast' | 'pdf';
  platform?: string;
  
  // Bibliographic metadata (CSL-JSON compatible)
  metadata: {
    type: string;
    title: string;
    author?: Author[];
    issued?: CSLDate;
    accessed: CSLDate;
    URL: string;
    DOI?: string;
    publisher?: string;
    'container-title'?: string;
    volume?: string;
    issue?: string;
    page?: string;
    abstract?: string;
  };
  
  // AI-specific fields
  aiMetadata?: {
    modelName: string;
    modelVersion?: string;
    promptText?: string;
    shareableUrl?: string;
    conversationExcerpt?: string;
  };
  
  // Visual capture
  screenshot?: {
    thumbnail: Blob;
    fullImage: Blob;
    captureTimestamp: Date;
    redactedAreas?: { x: number; y: number; width: number; height: number }[];
  };
  
  // User additions
  userNotes?: string;
  highlightedExcerpt?: string;
  tags?: string[];
  
  // Provenance tracking
  provenance: {
    sessionId: string;
    previousSourceId?: string;
    captureMethod: 'manual' | 'auto-ai' | 'workflow-recording';
    captureContext: {
      tabTitle: string;
      tabUrl: string;
      selectionText?: string;
      clickedElement?: string;
    };
  };
  
  // Sync status
  syncedAt?: Date;
}

export interface Author {
  family?: string;
  given?: string;
  literal?: string;
}

export interface CSLDate {
  'date-parts': [[number, number?, number?]];
}

export interface ResearchSession {
  id?: string;
  userId?: string;
  title?: string;
  createdAt: Date;
  endedAt?: Date;
  isActive: boolean;
}
```

### 2.5 Tailwind Configuration

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // High-contrast accessible palette
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',  // 4.5:1 contrast on white
          700: '#1d4ed8',
          800: '#1e40af',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          500: '#737373',
          600: '#525252',  // 7:1 contrast on white
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      }
    },
  },
  plugins: [],
}
```

Create `src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Focus styles for accessibility */
@layer base {
  *:focus-visible {
    @apply outline-2 outline-offset-2 outline-primary-600;
  }
}

/* Screen reader only utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## 3. Phase 2: Source Capture System

**Duration: 4-5 days**

### 3.1 Background Service Worker

Create `src/entrypoints/background.ts`:

```typescript
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
    const screenshotDataUrl = await browser.tabs.captureVisibleTab(null, {
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
        accessed: { 'date-parts': [[
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          new Date().getDate()
        ]] },
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
```

### 3.2 Screenshot Processing

Create `src/lib/capture/screenshot.ts`:

```typescript
import imageCompression from 'browser-image-compression';

export interface ProcessedScreenshot {
  thumbnail: Blob;
  fullImage: Blob;
}

export async function processScreenshot(dataUrl: string): Promise<ProcessedScreenshot> {
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const originalBlob = await response.blob();

  // Create File object (required by browser-image-compression)
  const file = new File([originalBlob], 'screenshot.jpg', { type: 'image/jpeg' });

  // Create full-size compressed version (max 1280px width)
  const fullImage = await imageCompression(file, {
    maxWidthOrHeight: 1280,
    initialQuality: 0.75,
    useWebWorker: true,
    fileType: 'image/jpeg'
  });

  // Create thumbnail (200px width)
  const thumbnail = await imageCompression(file, {
    maxWidthOrHeight: 200,
    initialQuality: 0.7,
    useWebWorker: true,
    fileType: 'image/jpeg'
  });

  return { thumbnail, fullImage };
}

export function createObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url);
}
```

### 3.3 Content Script

Create `src/entrypoints/content.ts`:

```typescript
import { extractGenericMetadata } from '@/lib/capture/adapters/generic';
import { extractChatGPTMetadata } from '@/lib/capture/adapters/chatgpt';
import { extractClaudeMetadata } from '@/lib/capture/adapters/claude';
import { extractYouTubeMetadata } from '@/lib/capture/adapters/youtube';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Listen for extraction requests from background
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'EXTRACT_METADATA') {
        const metadata = extractMetadata();
        const selectedText = window.getSelection()?.toString().trim() || '';
        sendResponse({ metadata, selectedText });
      }
      return true;
    });
  }
});

function extractMetadata() {
  const hostname = window.location.hostname;
  
  // Try platform-specific extractors first
  if (hostname.includes('chat.openai.com') || hostname.includes('chatgpt.com')) {
    const aiMeta = extractChatGPTMetadata();
    if (aiMeta) {
      return { 
        ...extractGenericMetadata(), 
        ...aiMeta, 
        sourceType: 'ai-conversation',
        platform: 'chatgpt'
      };
    }
  }
  
  if (hostname.includes('claude.ai')) {
    const aiMeta = extractClaudeMetadata();
    if (aiMeta) {
      return { 
        ...extractGenericMetadata(), 
        ...aiMeta, 
        sourceType: 'ai-conversation',
        platform: 'claude'
      };
    }
  }
  
  if (hostname.includes('youtube.com')) {
    const videoMeta = extractYouTubeMetadata();
    if (videoMeta) {
      return { 
        ...extractGenericMetadata(), 
        ...videoMeta, 
        sourceType: 'video',
        platform: 'youtube'
      };
    }
  }

  // Fall back to generic extraction
  return { 
    ...extractGenericMetadata(), 
    sourceType: 'webpage' 
  };
}
```

---

## 4. Phase 3: Platform Adapters

**Duration: 2-3 days**

### 4.1 Generic Metadata Extractor

Create `src/lib/capture/adapters/generic.ts`:

```typescript
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
        metadata.author = authors.map((a: any) => 
          typeof a === 'string' ? a : (a.name || '')
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
    } catch (e) {
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
```

### 4.2 ChatGPT Adapter

Create `src/lib/capture/adapters/chatgpt.ts`:

```typescript
export interface ChatGPTMetadata {
  aiMetadata: {
    modelName: string;
    modelVersion?: string;
    shareableUrl?: string;
    conversationTitle?: string;
    promptText?: string;
    responseExcerpt?: string;
  };
}

export function extractChatGPTMetadata(): ChatGPTMetadata | null {
  // Verify we're on ChatGPT
  const hostname = window.location.hostname;
  if (!hostname.includes('chat.openai.com') && !hostname.includes('chatgpt.com')) {
    return null;
  }

  const aiMetadata: ChatGPTMetadata['aiMetadata'] = {
    modelName: 'ChatGPT'
  };

  // Extract model version from UI
  // Look for model selector button or indicator
  const modelSelector = document.querySelector('[data-testid="model-switcher"]');
  if (modelSelector) {
    aiMetadata.modelVersion = modelSelector.textContent?.trim();
  }
  
  // Alternative: look for model name in other UI elements
  if (!aiMetadata.modelVersion) {
    const modelIndicators = document.querySelectorAll('[class*="model"]');
    for (const el of modelIndicators) {
      const text = el.textContent?.trim();
      if (text && (text.includes('GPT-4') || text.includes('GPT-3.5'))) {
        aiMetadata.modelVersion = text;
        break;
      }
    }
  }

  // Get conversation title
  const titleElement = document.querySelector('h1');
  if (titleElement) {
    aiMetadata.conversationTitle = titleElement.textContent?.trim();
  }

  // Get last prompt and response
  const messages = document.querySelectorAll('[data-message-author-role]');
  const messageArray = Array.from(messages);
  
  for (let i = messageArray.length - 1; i >= 0; i--) {
    const role = messageArray[i].getAttribute('data-message-author-role');
    const content = messageArray[i].textContent?.trim();
    
    if (role === 'assistant' && !aiMetadata.responseExcerpt) {
      aiMetadata.responseExcerpt = content?.slice(0, 500);
    }
    if (role === 'user' && !aiMetadata.promptText) {
      aiMetadata.promptText = content?.slice(0, 500);
    }
    
    if (aiMetadata.promptText && aiMetadata.responseExcerpt) break;
  }

  // Check for shareable URL
  if (window.location.pathname.includes('/share/')) {
    aiMetadata.shareableUrl = window.location.href;
  }

  return { aiMetadata };
}
```

### 4.3 Claude Adapter

Create `src/lib/capture/adapters/claude.ts`:

```typescript
export interface ClaudeMetadata {
  aiMetadata: {
    modelName: string;
    modelVersion?: string;
    conversationTitle?: string;
    promptText?: string;
    responseExcerpt?: string;
  };
}

export function extractClaudeMetadata(): ClaudeMetadata | null {
  if (!window.location.hostname.includes('claude.ai')) {
    return null;
  }

  const aiMetadata: ClaudeMetadata['aiMetadata'] = {
    modelName: 'Claude'
  };

  // Extract model version - Claude shows this in the UI
  const modelIndicators = document.querySelectorAll('button, span, div');
  for (const el of modelIndicators) {
    const text = el.textContent?.trim();
    if (text && (
      text.includes('Claude 3') || 
      text.includes('Opus') || 
      text.includes('Sonnet') || 
      text.includes('Haiku')
    )) {
      aiMetadata.modelVersion = text;
      break;
    }
  }

  // Get conversation title from page or first message
  const titleEl = document.querySelector('h1, [class*="title"]');
  if (titleEl) {
    aiMetadata.conversationTitle = titleEl.textContent?.trim();
  }

  // Extract messages - Claude uses different selectors
  // Look for human and assistant message containers
  const humanMessages = document.querySelectorAll('[class*="human"], [data-role="user"]');
  const assistantMessages = document.querySelectorAll('[class*="assistant"], [data-role="assistant"]');

  if (humanMessages.length > 0) {
    const lastHuman = humanMessages[humanMessages.length - 1];
    aiMetadata.promptText = lastHuman.textContent?.trim().slice(0, 500);
  }

  if (assistantMessages.length > 0) {
    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    aiMetadata.responseExcerpt = lastAssistant.textContent?.trim().slice(0, 500);
  }

  // Note: Claude does not have shareable URLs like ChatGPT
  // The screenshot serves as proof of the conversation

  return { aiMetadata };
}
```

### 4.4 YouTube Adapter

Create `src/lib/capture/adapters/youtube.ts`:

```typescript
export interface YouTubeMetadata {
  title: string;
  author: string[];
  type: string;
  videoMetadata: {
    channelName: string;
    channelUrl?: string;
    duration?: string;
    currentTimestamp?: number;
    publishedDate?: string;
    viewCount?: string;
  };
}

export function extractYouTubeMetadata(): YouTubeMetadata | null {
  if (!window.location.hostname.includes('youtube.com')) {
    return null;
  }

  // Get video title
  const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata');
  const title = titleEl?.textContent?.trim() || document.title.replace(' - YouTube', '');

  // Get channel info
  const channelEl = document.querySelector('#channel-name a, ytd-channel-name a');
  const channelName = channelEl?.textContent?.trim() || '';
  const channelUrl = channelEl?.getAttribute('href') 
    ? `https://youtube.com${channelEl.getAttribute('href')}`
    : undefined;

  // Get video duration from player
  const durationEl = document.querySelector('.ytp-time-duration');
  const duration = durationEl?.textContent?.trim();

  // Get current timestamp
  const video = document.querySelector('video');
  const currentTimestamp = video ? Math.floor(video.currentTime) : undefined;

  // Get publish date
  const dateEl = document.querySelector('#info-strings yt-formatted-string, #info span:nth-child(3)');
  const publishedDate = dateEl?.textContent?.trim();

  // Get view count
  const viewsEl = document.querySelector('#info span.view-count, ytd-video-view-count-renderer span');
  const viewCount = viewsEl?.textContent?.trim();

  return {
    title,
    author: channelName ? [channelName] : [],
    type: 'video',
    videoMetadata: {
      channelName,
      channelUrl,
      duration,
      currentTimestamp,
      publishedDate,
      viewCount
    }
  };
}
```

---

## 5. Phase 4: UI Components

**Duration: 4-5 days**

### 5.1 Accessible Button Component

Create `src/components/ui/Button.tsx`:

```typescript
import { forwardRef, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
      secondary: 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-300',
      ghost: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled}
        aria-disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### 5.2 Select Component

Create `src/components/ui/Select.tsx`:

```typescript
import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectOption {
  id: string;
  name: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, value, onChange, className = '', ...props }, ref) => {
    const id = props.id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
    
    return (
      <div className={className}>
        <label 
          htmlFor={id}
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          {label}
        </label>
        <select
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base py-2 px-3 border"
          {...props}
        >
          {options.map(option => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';
```

### 5.3 Source Card Component

Create `src/components/SourceCard.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { SourceCapture } from '@/types/source';
import { formatDistanceToNow } from 'date-fns';
import { createObjectURL, revokeObjectURL } from '@/lib/capture/screenshot';

interface SourceCardProps {
  source: SourceCapture;
  compact?: boolean;
  onSelect?: (id: string) => void;
  selected?: boolean;
}

const sourceTypeLabels: Record<string, string> = {
  'webpage': 'Web',
  'ai-conversation': 'AI',
  'video': 'Video',
  'academic': 'Academic',
  'podcast': 'Podcast',
  'pdf': 'PDF'
};

const sourceTypeColors: Record<string, string> = {
  'webpage': 'bg-blue-100 text-blue-800',
  'ai-conversation': 'bg-purple-100 text-purple-800',
  'video': 'bg-red-100 text-red-800',
  'academic': 'bg-green-100 text-green-800',
  'podcast': 'bg-orange-100 text-orange-800',
  'pdf': 'bg-gray-100 text-gray-800'
};

export function SourceCard({ source, compact, onSelect, selected }: SourceCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    if (source.screenshot?.thumbnail) {
      const url = createObjectURL(source.screenshot.thumbnail);
      setThumbnailUrl(url);
      return () => revokeObjectURL(url);
    }
  }, [source.screenshot?.thumbnail]);

  const handleClick = () => {
    onSelect?.(source.id!);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(source.id!);
    }
  };

  return (
    <article
      className={`
        border rounded-lg p-3 cursor-pointer transition-all
        hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2
        ${selected ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600' : 'border-neutral-200'}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      aria-label={`Source: ${source.metadata.title}. ${selected ? 'Selected.' : 'Click to select.'}`}
    >
      <div className="flex gap-3">
        {thumbnailUrl && !imageError && (
          <img
            src={thumbnailUrl}
            alt="" // Decorative - title provides context
            className="w-16 h-12 object-cover rounded flex-shrink-0"
            onError={() => setImageError(true)}
          />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-neutral-900 truncate text-sm">
              {source.metadata.title}
            </h3>
            <span 
              className={`
                text-xs px-2 py-0.5 rounded-full flex-shrink-0
                ${sourceTypeColors[source.sourceType] || 'bg-neutral-100 text-neutral-800'}
              `}
            >
              {sourceTypeLabels[source.sourceType] || source.sourceType}
            </span>
          </div>
          
          {!compact && (
            <>
              <p className="text-xs text-neutral-500 truncate mt-1">
                {source.metadata.URL}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                {formatDistanceToNow(new Date(source.createdAt), { addSuffix: true })}
              </p>
            </>
          )}
          
          {source.highlightedExcerpt && !compact && (
            <p className="text-xs text-neutral-600 mt-2 line-clamp-2 italic">
              "{source.highlightedExcerpt}"
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
```

### 5.4 Popup App

Create `src/entrypoints/popup/App.tsx`:

```typescript
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/Button';
import { SourceCard } from '@/components/SourceCard';
import '@/styles/globals.css';

export function App() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get 5 most recent sources
  const recentSources = useLiveQuery(
    () => db.sources.orderBy('createdAt').reverse().limit(5).toArray()
  );

  const handleCapture = async () => {
    setIsCapturing(true);
    setError(null);
    
    try {
      const response = await browser.runtime.sendMessage({ type: 'CAPTURE_SOURCE' });
      if (response?.error) {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to capture source. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const openSidePanel = async () => {
    await browser.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    window.close();
  };

  return (
    <div className="w-80 p-4 bg-white" role="main">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-neutral-900">
          Artefakt
        </h1>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={openSidePanel}
          aria-label="Open full reference clipboard in side panel"
        >
          Full View →
        </Button>
      </header>

      <Button
        onClick={handleCapture}
        disabled={isCapturing}
        className="w-full mb-4"
        aria-busy={isCapturing}
        aria-describedby={error ? 'capture-error' : undefined}
      >
        {isCapturing ? 'Capturing...' : 'Save This Page'}
      </Button>

      {error && (
        <p id="capture-error" className="text-sm text-red-600 mb-4" role="alert">
          {error}
        </p>
      )}

      <section aria-labelledby="recent-sources-heading">
        <h2 
          id="recent-sources-heading" 
          className="text-sm font-medium text-neutral-600 mb-2"
        >
          Recent Sources ({recentSources?.length || 0})
        </h2>
        
        {recentSources?.length === 0 ? (
          <p className="text-sm text-neutral-500 italic">
            No sources captured yet. Click "Save This Page" to get started.
          </p>
        ) : (
          <ul className="space-y-2" role="list">
            {recentSources?.map(source => (
              <li key={source.id}>
                <SourceCard source={source} compact />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
```

### 5.5 Side Panel App

Create `src/entrypoints/sidepanel/App.tsx`:

```typescript
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/Button';
import { SourceCard } from '@/components/SourceCard';
import { CitationFormatter } from '@/components/CitationFormatter';
import { OriginTrail } from '@/components/OriginTrail';
import '@/styles/globals.css';

type Tab = 'sources' | 'timeline' | 'share';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('sources');
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  
  const sources = useLiveQuery(
    () => db.sources.orderBy('createdAt').reverse().toArray()
  );

  const selectedSources = sources?.filter(s => selectedSourceIds.has(s.id!)) || [];

  const toggleSourceSelection = (id: string) => {
    setSelectedSourceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (sources) {
      setSelectedSourceIds(new Set(sources.map(s => s.id!)));
    }
  };

  const clearSelection = () => {
    setSelectedSourceIds(new Set());
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b p-4">
        <h1 className="text-xl font-semibold text-neutral-900">
          Artefakt
        </h1>
        
        {/* Tab Navigation */}
        <nav className="flex gap-2 mt-3" role="tablist" aria-label="Main sections">
          {[
            { id: 'sources', label: 'Sources' },
            { id: 'timeline', label: 'Origin Trail' },
            { id: 'share', label: 'Share' }
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${activeTab === tab.id 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-neutral-600 hover:bg-neutral-100'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden flex">
        {/* Sources Panel */}
        <div
          id="sources-panel"
          role="tabpanel"
          aria-labelledby="sources-tab"
          hidden={activeTab !== 'sources'}
          className="flex-1 flex"
        >
          {/* Source List */}
          <div className="w-1/2 border-r overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-medium text-neutral-800">
                All Sources ({sources?.length || 0})
              </h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                {selectedSourceIds.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear ({selectedSourceIds.size})
                  </Button>
                )}
              </div>
            </div>
            
            <ul className="space-y-2" role="listbox" aria-multiselectable="true">
              {sources?.map(source => (
                <li key={source.id} role="option" aria-selected={selectedSourceIds.has(source.id!)}>
                  <SourceCard
                    source={source}
                    selected={selectedSourceIds.has(source.id!)}
                    onSelect={toggleSourceSelection}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* Citation Panel */}
          <div className="w-1/2 overflow-y-auto p-4">
            <h2 className="font-medium text-neutral-800 mb-4">
              Generate Citations
            </h2>
            
            {selectedSources.length === 0 ? (
              <p className="text-neutral-500 italic">
                Select one or more sources to generate citations.
              </p>
            ) : (
              <CitationFormatter 
                selectedSources={selectedSources}
                onCopied={() => {/* Could show toast */}}
              />
            )}
          </div>
        </div>

        {/* Timeline Panel */}
        <div
          id="timeline-panel"
          role="tabpanel"
          aria-labelledby="timeline-tab"
          hidden={activeTab !== 'timeline'}
          className="flex-1 p-4 overflow-y-auto"
        >
          <h2 className="font-medium text-neutral-800 mb-4">
            Research Journey
          </h2>
          {sources && sources.length > 0 ? (
            <OriginTrail
              sources={sources}
              onSourceSelect={toggleSourceSelection}
            />
          ) : (
            <p className="text-neutral-500 italic">
              Capture some sources to see your research timeline.
            </p>
          )}
        </div>

        {/* Share Panel */}
        <div
          id="share-panel"
          role="tabpanel"
          aria-labelledby="share-tab"
          hidden={activeTab !== 'share'}
          className="flex-1 p-4 overflow-y-auto"
        >
          <h2 className="font-medium text-neutral-800 mb-4">
            Share Origin Trail
          </h2>
          {/* Share functionality - implement in Phase 7 */}
          <p className="text-neutral-500 italic">
            Coming soon: Generate shareable links to your research process.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
```

---

## 6. Phase 5: Citation System

**Duration: 3-4 days**

### 6.1 CSL Style Loader

Create `src/lib/citation/styles.ts`:

```typescript
// Embed commonly used styles or fetch from CDN
const STYLE_URLS: Record<string, string> = {
  'apa': 'https://raw.githubusercontent.com/citation-style-language/styles/master/apa.csl',
  'mla': 'https://raw.githubusercontent.com/citation-style-language/styles/master/modern-language-association.csl',
  'chicago-note': 'https://raw.githubusercontent.com/citation-style-language/styles/master/chicago-note-bibliography.csl',
  'chicago-author': 'https://raw.githubusercontent.com/citation-style-language/styles/master/chicago-author-date.csl',
  'ieee': 'https://raw.githubusercontent.com/citation-style-language/styles/master/ieee.csl',
  'harvard': 'https://raw.githubusercontent.com/citation-style-language/styles/master/harvard-cite-them-right.csl'
};

const styleCache = new Map<string, string>();

export async function loadStyle(styleId: string): Promise<string> {
  // Check cache first
  if (styleCache.has(styleId)) {
    return styleCache.get(styleId)!;
  }

  const url = STYLE_URLS[styleId];
  if (!url) {
    throw new Error(`Unknown citation style: ${styleId}`);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch style: ${response.statusText}`);
    }
    const styleXml = await response.text();
    styleCache.set(styleId, styleXml);
    return styleXml;
  } catch (error) {
    console.error(`Error loading style ${styleId}:`, error);
    throw error;
  }
}

// Pre-load common styles on startup
export async function preloadCommonStyles(): Promise<void> {
  const commonStyles = ['apa', 'mla', 'chicago-note'];
  await Promise.all(commonStyles.map(loadStyle));
}
```

### 6.2 CSL-JSON Converter

Create `src/lib/citation/formats.ts`:

```typescript
import { SourceCapture, CSLDate, Author } from '@/types/source';

interface CSLItem {
  id: string;
  type: string;
  title: string;
  URL?: string;
  accessed?: CSLDate;
  issued?: CSLDate;
  author?: Author[];
  'container-title'?: string;
  publisher?: string;
  DOI?: string;
  volume?: string;
  issue?: string;
  page?: string;
  note?: string;
  genre?: string;
}

export function convertToCSLJSON(source: SourceCapture): CSLItem {
  // Handle AI conversations specially
  if (source.sourceType === 'ai-conversation') {
    return convertAISourceToCSL(source);
  }

  // Handle videos
  if (source.sourceType === 'video') {
    return convertVideoToCSL(source);
  }

  // Standard sources
  return {
    id: source.id!,
    type: mapSourceTypeToCSL(source.metadata.type),
    title: source.metadata.title,
    URL: source.metadata.URL,
    accessed: source.metadata.accessed,
    issued: source.metadata.issued,
    author: source.metadata.author?.map(parseAuthorName),
    'container-title': source.metadata['container-title'],
    publisher: source.metadata.publisher,
    DOI: source.metadata.DOI,
    volume: source.metadata.volume,
    issue: source.metadata.issue,
    page: source.metadata.page
  };
}

function convertAISourceToCSL(source: SourceCapture): CSLItem {
  const aiMeta = source.aiMetadata;
  const company = getAICompany(aiMeta?.modelName);
  
  // Format model version for display
  const modelVersion = aiMeta?.modelVersion || 'Unknown version';
  const dateStr = new Date(source.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return {
    id: source.id!,
    type: 'software',
    title: `${aiMeta?.modelName || 'AI Assistant'} (${modelVersion}) [Large language model]`,
    author: [{ literal: company }],
    issued: dateToCSL(source.createdAt),
    accessed: dateToCSL(source.createdAt),
    URL: aiMeta?.shareableUrl || source.metadata.URL,
    note: aiMeta?.promptText 
      ? `Response to prompt: "${truncate(aiMeta.promptText, 100)}"` 
      : undefined,
    genre: 'Large language model'
  };
}

function convertVideoToCSL(source: SourceCapture): CSLItem {
  return {
    id: source.id!,
    type: 'video',
    title: source.metadata.title,
    URL: source.metadata.URL,
    accessed: source.metadata.accessed,
    author: source.metadata.author?.map(parseAuthorName),
    'container-title': source.platform === 'youtube' ? 'YouTube' : undefined,
    issued: source.metadata.issued
  };
}

function mapSourceTypeToCSL(type: string): string {
  const typeMap: Record<string, string> = {
    'webpage': 'webpage',
    'article': 'article',
    'article-journal': 'article-journal',
    'article-newspaper': 'article-newspaper',
    'book': 'book',
    'chapter': 'chapter',
    'post-weblog': 'post-weblog',
    'video': 'video'
  };
  return typeMap[type] || 'webpage';
}

function getAICompany(modelName?: string): string {
  const companies: Record<string, string> = {
    'ChatGPT': 'OpenAI',
    'GPT-4': 'OpenAI',
    'GPT-4o': 'OpenAI',
    'GPT-3.5': 'OpenAI',
    'Claude': 'Anthropic',
    'Claude 3': 'Anthropic',
    'Gemini': 'Google',
    'Copilot': 'Microsoft'
  };
  
  for (const [key, value] of Object.entries(companies)) {
    if (modelName?.includes(key)) return value;
  }
  return 'AI Provider';
}

function parseAuthorName(name: string): Author {
  // Handle "Family, Given" format
  if (name.includes(',')) {
    const [family, given] = name.split(',').map(s => s.trim());
    return { family, given };
  }
  
  // Handle "Given Family" format
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { literal: parts[0] };
  }
  
  const family = parts.pop()!;
  const given = parts.join(' ');
  return { family, given };
}

function dateToCSL(date: Date | string): CSLDate {
  const d = new Date(date);
  return {
    'date-parts': [[d.getFullYear(), d.getMonth() + 1, d.getDate()]]
  };
}

function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}
```

### 6.3 Citation Processor

Create `src/lib/citation/citeproc.ts`:

```typescript
import CSL from 'citeproc';
import { loadStyle } from './styles';
import { convertToCSLJSON } from './formats';
import { SourceCapture } from '@/types/source';

// English US locale (embed or fetch)
const EN_US_LOCALE = `<?xml version="1.0" encoding="utf-8"?>
<locale xmlns="http://purl.org/net/xbiblio/csl" version="1.0" xml:lang="en-US">
  <info><rights license="http://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</rights></info>
  <terms>
    <term name="accessed">accessed</term>
    <term name="and">and</term>
    <term name="et-al">et al.</term>
    <term name="retrieved">retrieved</term>
  </terms>
</locale>`;

export interface CitationResult {
  citation: string;
  bibliography: string;
}

export async function formatCitation(
  sources: SourceCapture[],
  styleId: string = 'apa'
): Promise<CitationResult> {
  // Load CSL style XML
  const styleXml = await loadStyle(styleId);

  // Convert sources to CSL-JSON format
  const items: Record<string, any> = {};
  sources.forEach(source => {
    const cslItem = convertToCSLJSON(source);
    items[cslItem.id] = cslItem;
  });

  // Create citeproc system object
  const sys = {
    retrieveLocale: (lang: string) => EN_US_LOCALE,
    retrieveItem: (id: string) => items[id]
  };

  // Create citeproc engine
  const citeproc = new CSL.Engine(sys, styleXml);
  citeproc.updateItems(Object.keys(items));

  // Generate bibliography
  const bibResult = citeproc.makeBibliography();
  const bibliography = bibResult ? bibResult[1].join('\n') : '';

  // Generate inline citation
  const citationCluster = {
    citationItems: Object.keys(items).map(id => ({ id })),
    properties: { noteIndex: 0 }
  };
  
  const citationResult = citeproc.processCitationCluster(
    citationCluster, [], []
  );
  const citation = citationResult[1]?.[0]?.[1] || '';

  return { citation, bibliography };
}
```

### 6.4 Citation Formatter Component

Create `src/components/CitationFormatter.tsx`:

```typescript
import { useState, useCallback } from 'react';
import { formatCitation, CitationResult } from '@/lib/citation/citeproc';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { SourceCapture } from '@/types/source';

const CITATION_STYLES = [
  { id: 'apa', name: 'APA 7th Edition' },
  { id: 'mla', name: 'MLA 9th Edition' },
  { id: 'chicago-note', name: 'Chicago (Notes-Bibliography)' },
  { id: 'chicago-author', name: 'Chicago (Author-Date)' },
  { id: 'ieee', name: 'IEEE' },
  { id: 'harvard', name: 'Harvard' }
];

interface CitationFormatterProps {
  selectedSources: SourceCapture[];
  onCopied?: (type: 'citation' | 'bibliography') => void;
}

export function CitationFormatter({ selectedSources, onCopied }: CitationFormatterProps) {
  const [style, setStyle] = useState('apa');
  const [output, setOutput] = useState<CitationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'citation' | 'bibliography' | null>(null);

  const generateCitations = useCallback(async () => {
    if (selectedSources.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await formatCitation(selectedSources, style);
      setOutput(result);
    } catch (err) {
      setError('Failed to generate citations. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedSources, style]);

  const copyToClipboard = async (type: 'citation' | 'bibliography') => {
    if (!output) return;
    
    const text = type === 'citation' ? output.citation : output.bibliography;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      onCopied?.(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-4" role="region" aria-label="Citation formatter">
      <div className="flex gap-3 items-end">
        <Select
          label="Citation Style"
          value={style}
          onChange={setStyle}
          options={CITATION_STYLES}
          className="flex-1"
        />
        <Button 
          onClick={generateCitations}
          disabled={loading || selectedSources.length === 0}
          aria-busy={loading}
        >
          {loading ? 'Generating...' : 'Format'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {output && (
        <div className="space-y-4">
          {/* In-text Citation */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-neutral-700">
                In-text Citation
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard('citation')}
                aria-label="Copy in-text citation to clipboard"
              >
                {copied === 'citation' ? '✓ Copied!' : 'Copy'}
              </Button>
            </div>
            <output 
              className="block p-3 bg-neutral-50 rounded-md border border-neutral-200 text-sm font-mono"
              aria-label="Generated in-text citation"
            >
              {output.citation}
            </output>
          </div>

          {/* Bibliography Entry */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-neutral-700">
                Bibliography / Reference List
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard('bibliography')}
                aria-label="Copy bibliography entry to clipboard"
              >
                {copied === 'bibliography' ? '✓ Copied!' : 'Copy'}
              </Button>
            </div>
            <output 
              className="block p-3 bg-neutral-50 rounded-md border border-neutral-200 text-sm whitespace-pre-wrap"
              aria-label="Generated bibliography entry"
            >
              {output.bibliography}
            </output>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 7. Phase 6: Origin Trail Visualization

**Duration: 3-4 days**

### 7.1 Timeline Component

Create `src/components/OriginTrail.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { SourceCapture } from '@/types/source';
import { createObjectURL } from '@/lib/capture/screenshot';

interface OriginTrailProps {
  sources: SourceCapture[];
  onSourceSelect: (id: string) => void;
}

export function OriginTrail({ sources, onSourceSelect }: OriginTrailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || sources.length === 0) return;

    // Convert sources to timeline items
    const items = new DataSet(
      sources.map(source => ({
        id: source.id,
        content: createItemContent(source),
        start: new Date(source.createdAt),
        type: 'box' as const,
        className: `source-${source.sourceType}`
      }))
    );

    // Timeline options
    const options = {
      height: '300px',
      zoomMin: 1000 * 60 * 5,           // 5 minutes
      zoomMax: 1000 * 60 * 60 * 24 * 7, // 1 week
      orientation: 'top' as const,
      showCurrentTime: false,
      selectable: true,
      keyboard: {
        enabled: true,
        speed: 100
      },
      margin: {
        item: 10
      }
    };

    // Create timeline
    if (!timelineRef.current) {
      timelineRef.current = new Timeline(containerRef.current, items, options);
      
      // Handle selection
      timelineRef.current.on('select', (props: { items: string[] }) => {
        const id = props.items[0];
        if (id) {
          setSelectedId(id);
          onSourceSelect(id);
        }
      });
    } else {
      timelineRef.current.setItems(items);
    }

    // Fit timeline to show all items
    timelineRef.current.fit();

    return () => {
      // Cleanup on unmount
    };
  }, [sources, onSourceSelect]);

  // Cleanup timeline on unmount
  useEffect(() => {
    return () => {
      timelineRef.current?.destroy();
      timelineRef.current = null;
    };
  }, []);

  if (sources.length === 0) {
    return (
      <p className="text-neutral-500 italic text-center py-8">
        No sources to display. Start capturing sources to build your origin trail.
      </p>
    );
  }

  return (
    <div className="origin-trail">
      <div 
        ref={containerRef}
        className="timeline-container rounded-lg border border-neutral-200"
        role="application"
        aria-label="Research timeline showing captured sources chronologically"
        tabIndex={0}
      />
      <p className="text-xs text-neutral-500 mt-2">
        Use arrow keys to navigate. Click or press Enter to select a source.
      </p>
    </div>
  );
}

function createItemContent(source: SourceCapture): string {
  let thumbnailHtml = '';
  
  if (source.screenshot?.thumbnail) {
    try {
      const url = createObjectURL(source.screenshot.thumbnail);
      thumbnailHtml = `<img src="${url}" alt="" class="timeline-thumb" />`;
    } catch (e) {
      // Skip thumbnail if it fails
    }
  }
  
  const title = escapeHtml(truncate(source.metadata.title, 25));
  const platform = source.platform ? `<span class="timeline-platform">${source.platform}</span>` : '';
  
  return `
    <div class="timeline-item">
      ${thumbnailHtml}
      <div class="timeline-content">
        <span class="timeline-title">${title}</span>
        ${platform}
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}
```

### 7.2 Timeline Styles

Add to `src/styles/globals.css`:

```css
/* Origin Trail Timeline Styles */
.origin-trail {
  width: 100%;
}

.timeline-container {
  background: #fafafa;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
}

.timeline-thumb {
  width: 40px;
  height: 30px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.timeline-title {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.timeline-platform {
  font-size: 10px;
  color: #666;
  text-transform: uppercase;
}

/* Source type colors */
.vis-item.source-ai-conversation {
  background-color: #ede9fe;
  border-color: #8b5cf6;
}

.vis-item.source-webpage {
  background-color: #dbeafe;
  border-color: #3b82f6;
}

.vis-item.source-academic {
  background-color: #dcfce7;
  border-color: #22c55e;
}

.vis-item.source-video {
  background-color: #fee2e2;
  border-color: #ef4444;
}

.vis-item.source-podcast {
  background-color: #ffedd5;
  border-color: #f97316;
}

/* Selected state */
.vis-item.vis-selected {
  box-shadow: 0 0 0 2px #2563eb;
}

/* Focus styles for accessibility */
.vis-item:focus,
.vis-item:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* Reduce motion for users who prefer it */
@media (prefers-reduced-motion: reduce) {
  .vis-timeline {
    transition: none !important;
  }
}
```

---

## 8. Phase 7: Backend & Sharing

**Duration: 3-4 days**

### 8.1 Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Enable Email authentication in Authentication > Providers
3. Run this SQL in the SQL Editor:

```sql
-- Sources table
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  source_type TEXT NOT NULL,
  platform TEXT,
  metadata JSONB NOT NULL,
  ai_metadata JSONB,
  provenance JSONB,
  user_notes TEXT,
  highlighted_excerpt TEXT,
  tags TEXT[],
  screenshot_paths JSONB
);

-- Sessions table  
CREATE TABLE research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Shared origin trails
CREATE TABLE shared_trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES research_sessions(id),
  share_token TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  access_level TEXT DEFAULT 'link-only',
  view_count INTEGER DEFAULT 0
);

-- Create indexes
CREATE INDEX sources_user_id_idx ON sources(user_id);
CREATE INDEX sources_created_at_idx ON sources(created_at DESC);
CREATE INDEX shared_trails_token_idx ON shared_trails(share_token);

-- Enable Row Level Security
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_trails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can CRUD their own sources"
  ON sources FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD their own sessions"
  ON research_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD their own shared trails"
  ON shared_trails FOR ALL
  USING (auth.uid() = creator_id);

CREATE POLICY "Anyone can view shared trails by token"
  ON shared_trails FOR SELECT
  USING (true);

-- Create storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('screenshots', 'screenshots', false);

-- Storage policies
CREATE POLICY "Users can upload their own screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 8.2 Supabase Client

Create `src/lib/storage/sync.ts`:

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db } from '@/lib/db';
import { SourceCapture } from '@/types/source';

let supabase: SupabaseClient | null = null;

export async function initSupabase(): Promise<SupabaseClient | null> {
  // Get credentials from extension storage
  const { supabaseUrl, supabaseAnonKey } = await browser.storage.local.get([
    'supabaseUrl',
    'supabaseAnonKey'
  ]);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured');
    return null;
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: 'artefakt-auth'
    }
  });

  return supabase;
}

export function getSupabase(): SupabaseClient | null {
  return supabase;
}

export async function syncSourcesToCloud(): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  // Get unsynced sources
  const unsyncedSources = await db.sources
    .filter(s => !s.syncedAt)
    .toArray();

  if (unsyncedSources.length === 0) return;

  for (const source of unsyncedSources) {
    try {
      // Upload screenshots to Supabase Storage
      const screenshotPaths: { thumbnail?: string; full?: string } = {};

      if (source.screenshot?.thumbnail) {
        const thumbPath = `${user.id}/${source.id}/thumb.jpg`;
        const { error: thumbError } = await client.storage
          .from('screenshots')
          .upload(thumbPath, source.screenshot.thumbnail, {
            contentType: 'image/jpeg',
            upsert: true
          });
        if (!thumbError) screenshotPaths.thumbnail = thumbPath;
      }

      if (source.screenshot?.fullImage) {
        const fullPath = `${user.id}/${source.id}/full.jpg`;
        const { error: fullError } = await client.storage
          .from('screenshots')
          .upload(fullPath, source.screenshot.fullImage, {
            contentType: 'image/jpeg',
            upsert: true
          });
        if (!fullError) screenshotPaths.full = fullPath;
      }

      // Insert source record
      const { error } = await client.from('sources').upsert({
        id: source.id,
        user_id: user.id,
        created_at: source.createdAt,
        updated_at: source.updatedAt,
        source_type: source.sourceType,
        platform: source.platform,
        metadata: source.metadata,
        ai_metadata: source.aiMetadata,
        provenance: source.provenance,
        user_notes: source.userNotes,
        highlighted_excerpt: source.highlightedExcerpt,
        tags: source.tags,
        screenshot_paths: screenshotPaths
      });

      if (!error) {
        // Mark as synced in IndexedDB
        await db.sources.update(source.id!, { syncedAt: new Date() });
      }
    } catch (err) {
      console.error(`Failed to sync source ${source.id}:`, err);
    }
  }
}
```

### 8.3 Share Link Generation

Create `src/lib/storage/share.ts`:

```typescript
import { nanoid } from 'nanoid';
import { getSupabase } from './sync';

interface CreateShareOptions {
  sessionId: string;
  title: string;
  description?: string;
  expiresInDays?: number;
}

export async function createShareLink(options: CreateShareOptions): Promise<string | null> {
  const client = getSupabase();
  if (!client) {
    throw new Error('Not authenticated');
  }

  const shareToken = nanoid(12);
  
  const expiresAt = options.expiresInDays
    ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const { error } = await client.from('shared_trails').insert({
    session_id: options.sessionId,
    share_token: shareToken,
    title: options.title,
    description: options.description,
    expires_at: expiresAt,
    access_level: 'link-only'
  });

  if (error) {
    console.error('Failed to create share link:', error);
    throw error;
  }

  // Return shareable URL - adjust domain for your deployment
  return `https://artefakt.app/trail/${shareToken}`;
}

export async function getSharedTrail(shareToken: string) {
  const client = getSupabase();
  if (!client) {
    throw new Error('Supabase not initialized');
  }

  // Get trail metadata
  const { data: trail, error: trailError } = await client
    .from('shared_trails')
    .select('*')
    .eq('share_token', shareToken)
    .single();

  if (trailError || !trail) {
    return null;
  }

  // Check expiration
  if (trail.expires_at && new Date(trail.expires_at) < new Date()) {
    return null;
  }

  // Get sources for this session
  const { data: sources, error: sourcesError } = await client
    .from('sources')
    .select('*')
    .eq('provenance->>sessionId', trail.session_id)
    .order('created_at', { ascending: true });

  if (sourcesError) {
    console.error('Failed to fetch sources:', sourcesError);
    return null;
  }

  // Increment view count
  await client
    .from('shared_trails')
    .update({ view_count: trail.view_count + 1 })
    .eq('id', trail.id);

  return {
    ...trail,
    sources
  };
}
```

---

## 9. Phase 8: Testing & Polish

**Duration: 3-4 days**

### 9.1 Functionality Testing Checklist

- [ ] Capture source from regular webpage
- [ ] Capture source from ChatGPT with model version detection
- [ ] Capture source from Claude
- [ ] Capture source from YouTube video with timestamp
- [ ] Screenshot compression produces files under 200KB
- [ ] Generate APA citation for webpage
- [ ] Generate MLA citation for AI conversation
- [ ] Generate Chicago citation for academic source
- [ ] Copy citation to clipboard works
- [ ] Copy bibliography to clipboard works
- [ ] Origin trail shows sources in chronological order
- [ ] Clicking source in timeline selects it in source list
- [ ] Sources persist after browser restart (IndexedDB)
- [ ] Create shareable link (requires Supabase setup)
- [ ] View shared origin trail without login

### 9.2 Accessibility Testing Checklist

- [ ] All interactive elements reachable via Tab key
- [ ] Focus indicators visible on all focusable elements
- [ ] Focus order is logical (left-to-right, top-to-bottom)
- [ ] Screen reader announces button purposes correctly
- [ ] Screen reader announces form labels
- [ ] Color contrast passes WCAG AA (use DevTools Lighthouse)
- [ ] UI usable at 200% browser zoom
- [ ] No content is cut off at 200% zoom
- [ ] Timeline navigable with keyboard
- [ ] Error messages are announced by screen readers
- [ ] No content relies solely on color to convey meaning

### 9.3 Cross-Browser Testing

- [ ] Chrome: All features work
- [ ] Firefox: All features work  
- [ ] Edge: All features work
- [ ] Safari: Basic capture works (full testing can be deferred)

### 9.4 Build Commands

```bash
# Development with hot reload
npm run dev

# Build for Chrome
npm run build

# Build for Firefox  
npm run build:firefox

# Build for all browsers
npm run build -- --browser chrome,firefox,edge

# Zip for distribution
npm run zip
```

---

## 10. MVP Deliverables Summary

### 10.1 Core Features (Required)

1. **Source Capture**: One-click capture of any webpage with automatic screenshot and metadata extraction
2. **AI Platform Support**: Special handling for ChatGPT, Claude, and Gemini with model version detection
3. **Video Support**: YouTube metadata extraction with timestamp capture
4. **Reference Clipboard**: Side panel showing all captured sources with thumbnails
5. **Citation Generation**: Format citations in APA, MLA, Chicago, IEEE, Harvard with copy to clipboard
6. **Origin Trail**: Visual timeline of research process with screenshot thumbnails
7. **Sharing**: Generate shareable links for origin trails

### 10.2 Technical Requirements (Required)

- Cross-browser extension (Chrome, Firefox, Edge) using WXT and Manifest V3
- Local-first storage with IndexedDB via Dexie.js
- Cloud sync via Supabase (opt-in, requires authentication)
- WCAG 2.1 AA accessibility compliance
- Screenshot compression under 200KB per image
- TypeScript throughout

### 10.3 Out of Scope for MVP

The following are **explicitly NOT required** for MVP:

- Direct Google Docs/Word integration (clipboard approach is sufficient)
- Safari full support (basic testing only)
- Automatic PII redaction in screenshots (manual blur tool is fine for v1.1)
- Workflow recording mode (Scribe-like auto-capture on every click)
- PDF export of origin trail
- Artefakt platform integration (future phase)
- Institutional accounts and admin features
- Mobile support

---

## Quick Reference: File Checklist

When complete, you should have created these key files:

```
src/
├── entrypoints/
│   ├── background.ts          ✓
│   ├── content.ts             ✓
│   ├── popup/App.tsx          ✓
│   └── sidepanel/App.tsx      ✓
├── components/
│   ├── ui/Button.tsx          ✓
│   ├── ui/Select.tsx          ✓
│   ├── SourceCard.tsx         ✓
│   ├── CitationFormatter.tsx  ✓
│   └── OriginTrail.tsx        ✓
├── lib/
│   ├── db/index.ts            ✓
│   ├── db/types.ts            ✓
│   ├── capture/screenshot.ts  ✓
│   ├── capture/adapters/generic.ts   ✓
│   ├── capture/adapters/chatgpt.ts   ✓
│   ├── capture/adapters/claude.ts    ✓
│   ├── capture/adapters/youtube.ts   ✓
│   ├── citation/styles.ts     ✓
│   ├── citation/formats.ts    ✓
│   ├── citation/citeproc.ts   ✓
│   ├── storage/sync.ts        ✓
│   └── storage/share.ts       ✓
├── styles/globals.css         ✓
└── types/source.ts            ✓
```

---

*End of Implementation Plan*
