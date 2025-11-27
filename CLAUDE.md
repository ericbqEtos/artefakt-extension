# Artefakt Extension

A browser extension that helps students and educators capture, cite, and document their research process with visual provenance tracking.

## Project Overview

Artefakt is a "reference clipboard" extension that allows users to:
- Save sources from any webpage, academic paper, AI conversation, or video
- Automatically capture screenshots as visual documentation
- Generate properly formatted citations (APA, MLA, Chicago, IEEE, Harvard)
- Create an "origin trail" showing the research journey
- Share the research process with examiners or collaborators

## Tech Stack

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

## Architecture

### Core Components

1. **Background Service Worker** (`entrypoints/background.ts`)
   - Handles keyboard shortcuts and message passing
   - Coordinates screenshot capture and source saving
   - Manages research sessions

2. **Content Script** (`entrypoints/content.ts`)
   - Extracts metadata from web pages
   - Uses platform-specific adapters for AI tools (ChatGPT, Claude, Gemini) and YouTube

3. **Popup** (`entrypoints/popup/`)
   - Quick capture interface with loading states and toast notifications
   - Shows 5 most recent sources with SourceCard component
   - "Full View" button to open side panel

4. **Side Panel** (`entrypoints/sidepanel/`)
   - Full reference clipboard view with search and filtering
   - Source list with thumbnails and type badges
   - Delete sources with confirmation modal
   - Citation generation (Phase 5)
   - Origin trail visualization (Phase 6)

### Platform Adapters

Located in `src/lib/capture/adapters/`:
- `generic.ts` - Schema.org JSON-LD, OpenGraph, meta tags extraction
- `chatgpt.ts` - ChatGPT conversation and model version extraction (GPT-5.1, o3, o4-mini)
- `claude.ts` - Claude conversation extraction (Opus 4.5, Sonnet 4.5, Haiku 4.5)
- `youtube.ts` - Video metadata with timestamp capture
- `gemini.ts` - Gemini conversation extraction (Gemini 3)
- `ai-detector.ts` - Generic AI platform detector for unknown tools
- `scholar.ts` - Google Scholar academic paper extraction (planned)

### Data Model

**SourceCapture** - Primary entity for saved sources:
- Source identification (type, platform)
- Bibliographic metadata (CSL-JSON compatible)
- AI-specific fields (model name, version, prompt, shareable URL)
- Visual capture (thumbnail + full image blobs)
- User additions (notes, excerpts, tags)
- Provenance tracking (session, previous source, capture method)

**ResearchSession** - Groups sources into research sessions for origin trail

## Key Design Decisions

### Visual Capture Approach
The extension prioritizes "outside-in" data gathering via screenshots rather than relying solely on APIs. This:
- Bypasses API limitations for AI tools
- Creates verifiable proof of research process
- Makes origin trail intuitive for humans reviewing work

### Storage Strategy
- **Local-first**: IndexedDB stores all data locally via Dexie.js
- **Cloud sync optional**: Supabase integration for cross-device sync and sharing
- **Image optimization**: Screenshots compressed to ~100KB using browser-image-compression

### Citation Standards
Follows official 2024-2025 guidance from APA, MLA, Chicago for AI citations:
- AI company as author (APA) or container (MLA)
- Model version and date required
- Shareable URLs captured when available

## Development Commands

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

## Accessibility Requirements

- WCAG 2.1 AA compliant
- All interactive elements keyboard accessible
- ARIA labels on interactive components
- 4.5:1 color contrast minimum
- Focus visible indicators on all focusable elements

## Browser Support

- **Primary**: Chrome, Firefox, Edge
- **Secondary**: Safari (requires additional setup with Xcode)
- Uses Manifest V3 exclusively

## File Structure

```
artefakt-extension/
├── entrypoints/              # Extension entry points (WXT convention)
│   ├── background.ts         # Service worker
│   ├── content.ts            # Content script
│   ├── popup/                # Popup UI
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx
│   └── sidepanel/            # Side panel UI
│       ├── index.html
│       ├── main.tsx
│       └── App.tsx
├── src/
│   ├── components/           # React components
│   │   ├── ui/               # Base UI components (Button, Input, Select, Modal, Spinner, Toast)
│   │   └── SourceCard.tsx    # Source display with thumbnails
│   ├── lib/
│   │   ├── db/               # Dexie database setup
│   │   └── capture/          # Screenshot and metadata extraction
│   │       ├── screenshot.ts # Image processing
│   │       └── adapters/     # Platform-specific extractors
│   ├── types/                # TypeScript types
│   └── styles/               # Global styles (Tailwind CSS)
├── e2e/                      # Playwright E2E tests
│   ├── extension.spec.ts
│   └── fixtures.ts
└── public/                   # Static assets (icons)
```

## MVP Scope

### Included
- One-click source capture with screenshots
- AI platform support (ChatGPT, Claude, Gemini)
- YouTube with timestamps
- Citation generation (APA, MLA, Chicago, IEEE, Harvard)
- Origin trail timeline visualization
- Shareable links

### Excluded from MVP
- Direct Google Docs/Word integration
- Full Safari support
- Automatic PII redaction
- Workflow recording mode
- PDF export
- Institutional accounts

## Development Progress

### Completed Phases

**Phase 1: Project Setup & Core Infrastructure**
- WXT project initialized with React and TypeScript
- Core dependencies installed (Dexie, browser-image-compression, date-fns, etc.)
- Tailwind CSS v4 configured with accessible color palette
- Database schema with Dexie.js for IndexedDB
- Extension icons generated (16, 32, 48, 128px)
- E2E testing with Playwright

**Phase 2: Source Capture System**
- Background service worker for capture orchestration
- Screenshot capture with `tabs.captureVisibleTab`
- Screenshot compression to <200KB using browser-image-compression
- Content script for DOM metadata extraction
- Programmatic script injection fallback
- Session management

**Phase 3: Platform Adapters**
- ChatGPT adapter with November 2025 models (GPT-5.1, o3, o4-mini)
- Claude adapter with November 2025 models (Opus 4.5, Sonnet 4.5, Haiku 4.5)
- Gemini adapter with Gemini 3 support
- YouTube adapter with video timestamp capture
- **NotebookLM adapter** with tool context (podcasts, quizzes, flashcards, mind maps, etc.)
- **Grok AI adapter** for grok.com and X integration
- Generic AI detector for unknown platforms
- Generic webpage adapter with Schema.org/OpenGraph extraction
- Local file support (PDFs, documents) with metadata extraction via offscreen document

**Phase 4: UI Components**
- Shared UI components (Button, Input, Select, Modal, Spinner, Toast)
- SourceCard component with thumbnails and type badges
- Popup with loading states, success feedback, and toast notifications
- Sidepanel with search, filtering by source type, and source deletion
- Delete confirmation modal
- WCAG 2.1 AA accessibility (focus indicators, ARIA labels, keyboard navigation)

### Remaining Phases

**Phase 5: Citation System** - citeproc-js integration with CSL styles
- Standard citation formats (APA, MLA, Chicago, IEEE, Harvard)
- AI tool-specific citations (include model version, date)
- **Tool utilization context for NotebookLM** - citations should reflect HOW the tool was used:
  - Example: "NotebookLM Audio Overview based on [Source X, Source Y]"
  - Include output type (podcast, quiz, flashcards, mind map, etc.)
  - Reference the source materials used to generate the output

**Phase 6: Origin Trail Visualization** - vis-timeline for research journey
- Timeline showing chronological research process
- **Tool utilization nodes** - show not just sources but HOW they were processed:
  - "Student uploaded [PDF A, PDF B] to NotebookLM"
  - "Generated Audio Overview (podcast) from sources"
  - "Created quiz for self-testing"
  - This tells the story of the learning/research process, not just what was captured

**Phase 7: Backend & Sharing** - Supabase sync and shareable links
**Phase 8: Testing & Polish** - Final testing and release preparation

## Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test
npx playwright test --grep "popup"

# Run tests with UI
npx playwright test --headed
```
