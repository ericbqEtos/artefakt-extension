# Building a reference clipboard and origin trail browser extension

A well-designed "reference clipboard" extension with provenance tracking is technically feasible using modern cross-browser frameworks, established metadata standards, and visualization libraries—though the AI documentation component represents a significant **market gap** with no existing dedicated tools. The optimal architecture combines the **WXT framework** for cross-browser development, **CSL-JSON** as the core data format, **W3C PROV** for provenance modeling, and **Cytoscape.js** or **vis-timeline** for origin trail visualization. Integration with Google Docs requires a hybrid browser extension plus Apps Script approach, while Word Online demands a separate Office Add-in.

---

## Cross-browser architecture favors WXT over Plasmo

The WebExtensions API provides the foundation for cross-browser compatibility, though significant implementation differences remain between Chrome, Firefox, Safari, and Edge. After evaluating the major frameworks, **WXT (wxt.dev)** emerges as the strongest choice for new projects in 2025. Unlike Plasmo, which shows signs of reduced maintenance activity, WXT offers active development, Vite-based tooling for fast builds, and framework-agnostic support for React, Vue, or Svelte.

Key architectural considerations include the **Manifest V3 transition**, which all major browsers now enforce. MV3 replaces persistent background pages with ephemeral service workers, requiring stateless design patterns. All state must be persisted to `chrome.storage` since workers can terminate at any time. For extensions interacting with many websites, content scripts run in an isolated world and communicate with the background via message passing—WXT provides type-safe abstractions for this.

**Safari presents the greatest development overhead**, requiring a native macOS/iOS app wrapper, Xcode knowledge, $99/year Apple Developer Program membership, and App Store review cycles. Budget 30-50% additional time for Safari support. The recommended approach is to develop for Chrome/Firefox first using WXT's `wxt build --browser safari` command, then convert using Apple's `safari-web-extension-converter` tool.

For storage, a tiered approach works best: `chrome.storage.sync` for user preferences under 100KB, `chrome.storage.local` for application state up to 10MB, and IndexedDB or a cloud backend (Supabase or Firebase) for larger datasets. Note that `storage.sync` only works within the same browser—cross-browser synchronization requires a cloud backend.

---

## CSL-JSON provides the optimal unified metadata format

The reference clipboard should use **CSL-JSON (Citation Style Language JSON)** as its internal format, providing direct compatibility with citeproc-js for citation generation across 10,000+ styles. CSL-JSON supports approximately 40 item types including `article-journal`, `book`, `webpage`, `video`, `podcast`, and the crucial `personal_communication` type suitable for AI conversations.

For academic papers, the **CrossRef API** (`api.crossref.org/works/{DOI}`) returns comprehensive metadata without authentication. Include a `mailto` parameter in requests to access the "polite" pool with higher rate limits. Web pages should be parsed in priority order: Schema.org JSON-LD first, OpenGraph meta tags second, standard HTML meta tags as fallback.

A unified schema should capture:
- **Identifiers**: DOI, URL, ISBN, platform-specific IDs
- **Bibliographic data**: title, authors (with ORCID where available), abstract
- **Temporal metadata**: publication date, access date, modification date
- **Archive information**: Wayback Machine URLs for ephemeral content
- **Source-specific extensions**: video timestamps, podcast episode numbers, AI model versions

For AI conversations specifically, the schema must include model identification (name, version, developer), conversation timestamp, prompt text, and shareable URL if available. This data enables proper citation generation across all major style guides.

---

## AI citation standards now have clear official guidance

All major style guides updated their AI citation policies in 2024-2025, converging on key principles while differing in format details.

**APA Style** treats AI tools as software, with the AI company as author. The reference format is: `OpenAI. (2024). ChatGPT (Nov 13 version) [Large language model]. https://chat.openai.com`. APA requires describing AI usage in the methodology section, stating prompts in the text when quoting, and including full AI output as supplemental material for journal submissions. AI cannot be listed as an author.

**MLA Style** uses the prompt description as the "Title of Source" element. The format is: `"Describe the theme of nature in Jane Austen's Mansfield Park" prompt. ChatGPT, model GPT-4o, OpenAI, 23 Sept. 2024, chatgpt.com/share/[link].` MLA does not treat AI as an author—the AI tool serves as the "Container" element in their core elements template.

**Chicago Manual of Style** treats AI output like personal communication (non-retrievable), using footnotes only with no bibliography entry unless a shareable link exists. The footnote format is: `Text generated by ChatGPT, OpenAI, March 7, 2023, https://chat.openai.com/chat.`

**IEEE** has no specific citation format, deferring to Chicago style while requiring disclosure in the Acknowledgments section. ACM similarly mandates disclosure but hasn't published an AI-specific format. Both organizations prohibit AI authorship.

The core implementation challenge is **verifiability**: conversations cannot be retrieved later, and identical prompts produce different outputs. The extension should capture shareable URLs where available (ChatGPT, Gemini, Perplexity, and Poe support these; Claude does not), enable immediate export of conversation transcripts, and potentially integrate blockchain timestamping (OpenTimestamps) for cryptographic proof of existence.

---

## W3C PROV provides the standard for origin trail modeling

The W3C PROV family of specifications defines provenance interchange through three core types: **Entities** (documents, sources), **Activities** (searches, readings, syntheses), and **Agents** (users, tools). Key relationships include `wasDerivedFrom` for derivation chains, `wasGeneratedBy` for creation relationships, and `used` for activity inputs.

For the "origin trail" visualization, the data model should capture:
- Source nodes with metadata (URL, title, timestamp, snippets)
- Derivation edges showing how one source led to discovering another
- Activity nodes representing research actions (search queries, AI prompts)
- Temporal ordering for timeline representation

**Cytoscape.js** is the recommended primary visualization library for provenance graphs—purpose-built for graph theory with academic origins, supporting WebGL rendering for large datasets and extensive layout algorithms. For timeline views, **vis-timeline** provides ready-made interactive components with zoom/pan and grouping support. D3.js offers maximum flexibility for custom visualizations but requires more development effort.

Design principles from provenance research suggest a layered complexity approach: overview first showing aggregate provenance, zoom and filter for temporal details, and details on demand for full derivation chains. The visualization should support dual representations—both graph view (relationship network) and timeline view (chronological sequence) of the same underlying data.

---

## No dedicated AI documentation tool exists—a significant opportunity

Research across existing tools revealed a **critical market gap**: no tool specifically tracks AI usage in academic work with provenance documentation. Current approaches are entirely policy-based—universities require students to manually document AI use following citation guidelines.

**Zotero** provides the architectural template for reference management extensions. Its browser connector injects site-specific "translators" (JavaScript extractors), communicates with the desktop app via a local HTTP server on port 23119, and stores citations as CSL-JSON with full BibTeX/RIS export support. The Google Docs integration uses OAuth authentication with named ranges storing citation metadata. Key limitation: Google Docs performance degrades noticeably beyond 100 citations.

**Hypothesis** demonstrates annotation architecture through text anchoring algorithms using prefix/suffix/exact selectors for robust position identification across page changes. Its open-source BSD 2-Clause codebase provides reference implementations.

Tools like **Liner** and **Weava** show patterns for highlight capture and export, while **Research Rabbit** and **Semantic Scholar** demonstrate citation network visualization. However, none combines reference management with AI conversation capture and research provenance tracking in a unified interface.

---

## AI conversation capture requires platform-specific strategies

Each AI platform offers different export capabilities, requiring varied technical approaches.

**ChatGPT** provides the best capture support: built-in JSON export via Settings → Data Controls, native shareable links at `chatgpt.com/share/[uuid]`, and rich metadata including `model_slug` for version identification. Third-party tools like chatgpt-exporter (Tampermonkey script) and ExportGPT (Chrome extension) provide additional format options.

**Claude** lacks native shareable links—the most significant limitation among major platforms. Export is available via Settings → Privacy → Export Data, delivering JSON (though formatting may not be preserved). Third-party tools like Claude Exporter (Chrome) and the A.I. Archives extension can generate shareable URLs.

**Gemini** supports native shareable links via the Share button, creating public `g.co/gemini/share` URLs with model identification in thread metadata. **Copilot** removed its Word/PDF export feature; only limited CSV export remains available through the Privacy Dashboard.

For browser extension implementation, content scripts using Manifest V3 should inject into each AI platform domain with specific selectors for conversation extraction. The dynamic DOM (React/Vue frameworks) requires waiting for render completion and using MutationObserver for dynamic content. A unified data model should normalize across platforms:

```typescript
interface AIConversation {
  platform: 'chatgpt' | 'claude' | 'gemini' | 'copilot' | 'perplexity' | 'poe';
  modelInfo: { modelName: string; modelVersion?: string; };
  shareableUrl?: string;
  messages: { role: 'user' | 'assistant'; content: string; timestamp?: string; }[];
  verification: { method: string; exportHash?: string; };
}
```

---

## Document integration requires different approaches per platform

**Google Docs integration** works through the REST API (`docs.googleapis.com/v1/documents/{documentId}`) combined with browser extension OAuth authentication. The `documents.batchUpdate` method enables atomic text insertion, footnote creation, and named range management for tracking citations. Named ranges are essential—they associate document positions with citation metadata, surviving text edits.

Zotero's architecture provides a proven pattern: a browser connector handles user interaction and initial insertion via synthetic paste events, while an Apps Script backend processes batch updates. Critical limitation: Apps Script deployed as an API executable cannot INSERT new footnotes (only edit existing ones), requiring the connector to create initial footnotes.

**Microsoft Word Online** demands a completely separate **Office Add-in** (not a browser extension). Browser extensions cannot access Word's internal APIs. The Word JavaScript API provides `documents.batchUpdate` equivalent operations through `Word.run()` contexts, with Content Controls serving the same metadata-tagging role as Google Docs' named ranges.

A critical limitation: **the Word Fields API is not available in Office JavaScript API**. Traditional citation managers like Zotero and EndNote rely on Word Fields for citation tracking, meaning full compatibility with existing workflows requires a separate COM/VSTO add-in for desktop Word. For a unified approach, use Content Controls or Endnotes instead of Fields, accepting reduced legacy compatibility.

**citeproc-js** is the essential citation processing library, supporting all 10,000+ CSL styles with complex requirements like ibid., name disambiguation, and multilingual citations. The library takes CSL-JSON items and style XML, returning formatted citation text and bibliographies ready for insertion.

---

## Recommended implementation architecture

The complete technical stack should include:

- **Framework**: WXT for cross-browser extension development
- **UI**: React or Vue with Tailwind CSS
- **Storage tier 1**: `chrome.storage.sync` for user preferences
- **Storage tier 2**: `chrome.storage.local` for citation library cache  
- **Storage tier 3**: Supabase or Firebase for cloud sync and collaboration
- **Data format**: CSL-JSON internally, with BibTeX/RIS export
- **Provenance model**: W3C PROV-compatible JSON-LD
- **Graph visualization**: Cytoscape.js for provenance graphs
- **Timeline visualization**: vis-timeline for chronological view
- **Citation processing**: citeproc-js with official CSL styles repository
- **Google Docs**: REST API + OAuth + Apps Script backend
- **Microsoft Word**: Separate Office Add-in using Word JavaScript API

The extension should abstract document operations behind a common interface to handle the fundamental differences between Google Docs (REST API, named ranges) and Word (JavaScript API, content controls). Development priority should be Chrome/Firefox first, then Safari (with its additional complexity), then the separate Word add-in.

This architecture enables capturing diverse source types with proper metadata, generating citations in any standard format, and visualizing the complete research provenance—solving a genuine gap in current academic tooling while building on proven patterns from Zotero, Hypothesis, and established standards.