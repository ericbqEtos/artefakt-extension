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

1. **Background Service Worker** (`src/entrypoints/background.ts`)
   - Handles keyboard shortcuts and message passing
   - Coordinates screenshot capture and source saving
   - Manages research sessions

2. **Content Script** (`src/entrypoints/content.ts`)
   - Extracts metadata from web pages
   - Uses platform-specific adapters for AI tools (ChatGPT, Claude, Gemini) and YouTube

3. **Popup** (`src/entrypoints/popup/`)
   - Quick capture interface
   - Shows recent sources

4. **Side Panel** (`src/entrypoints/sidepanel/`)
   - Full reference clipboard view
   - Citation generation
   - Origin trail visualization

### Platform Adapters

Located in `src/lib/capture/adapters/`:
- `generic.ts` - Schema.org JSON-LD, OpenGraph, meta tags extraction
- `chatgpt.ts` - ChatGPT conversation and model version extraction
- `claude.ts` - Claude conversation extraction
- `youtube.ts` - Video metadata with timestamp capture
- `gemini.ts` - Gemini conversation extraction (planned)
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
src/
├── entrypoints/           # Extension entry points
│   ├── background.ts      # Service worker
│   ├── content.ts         # Content script
│   ├── popup/             # Popup UI
│   ├── sidepanel/         # Side panel UI
│   └── options/           # Settings page
├── components/            # React components
│   ├── ui/                # Base UI components
│   ├── SourceCard.tsx     # Source display
│   ├── CitationFormatter.tsx
│   └── OriginTrail.tsx    # Timeline visualization
├── lib/
│   ├── db/                # Dexie database setup
│   ├── capture/           # Screenshot and metadata extraction
│   │   └── adapters/      # Platform-specific extractors
│   ├── citation/          # CSL processing and formatting
│   └── storage/           # Sync and sharing
├── hooks/                 # React hooks
├── types/                 # TypeScript types
└── styles/                # Global styles
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
