/**
 * CSL Style Loader
 * Fetches and caches Citation Style Language (CSL) files from the CSL repository
 */

// Common citation styles with their CSL repository filenames
export const CITATION_STYLES = {
  apa: {
    id: 'apa',
    name: 'APA 7th Edition',
    filename: 'apa.csl'
  },
  mla: {
    id: 'mla',
    name: 'MLA 9th Edition',
    filename: 'modern-language-association.csl'
  },
  chicago: {
    id: 'chicago',
    name: 'Chicago 17th Edition (Author-Date)',
    filename: 'chicago-author-date.csl'
  },
  ieee: {
    id: 'ieee',
    name: 'IEEE',
    filename: 'ieee.csl'
  },
  harvard: {
    id: 'harvard',
    name: 'Harvard',
    filename: 'harvard-cite-them-right.csl'
  }
} as const;

export type CitationStyleId = keyof typeof CITATION_STYLES;

// CSL GitHub raw content base URL
const CSL_STYLES_BASE_URL = 'https://raw.githubusercontent.com/citation-style-language/styles/master/';

// In-memory cache for loaded styles
const styleCache = new Map<string, string>();

// IndexedDB cache for persistence across sessions
const DB_NAME = 'artefakt-csl-cache';
const DB_VERSION = 1;
const STORE_NAME = 'styles';

/**
 * Open or create the IndexedDB for style caching
 */
async function openStyleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Get a cached style from IndexedDB
 */
async function getCachedStyle(styleId: string): Promise<string | null> {
  try {
    const db = await openStyleDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(styleId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.xml) {
          // Check if cache is still valid (7 days)
          const cacheAge = Date.now() - (result.timestamp || 0);
          if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
            resolve(result.xml);
            return;
          }
        }
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Save a style to IndexedDB cache
 */
async function cacheStyle(styleId: string, xml: string): Promise<void> {
  try {
    const db = await openStyleDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        id: styleId,
        xml,
        timestamp: Date.now()
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    // Silently fail cache writes
  }
}

/**
 * Fetch a CSL style from the repository
 */
async function fetchStyleFromRepository(filename: string): Promise<string> {
  const url = `${CSL_STYLES_BASE_URL}${filename}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch style: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Load a citation style by ID
 * Uses memory cache, then IndexedDB cache, then fetches from repository
 */
export async function loadStyle(styleId: CitationStyleId): Promise<string> {
  const style = CITATION_STYLES[styleId];
  if (!style) {
    throw new Error(`Unknown citation style: ${styleId}`);
  }

  // Check memory cache first
  if (styleCache.has(styleId)) {
    return styleCache.get(styleId)!;
  }

  // Check IndexedDB cache
  const cached = await getCachedStyle(styleId);
  if (cached) {
    styleCache.set(styleId, cached);
    return cached;
  }

  // Fetch from repository
  const xml = await fetchStyleFromRepository(style.filename);

  // Cache in both memory and IndexedDB
  styleCache.set(styleId, xml);
  await cacheStyle(styleId, xml);

  return xml;
}

/**
 * Preload common citation styles
 * Call this early to avoid delays when user first requests citations
 */
export async function preloadCommonStyles(): Promise<void> {
  const commonStyles: CitationStyleId[] = ['apa', 'mla', 'chicago'];

  await Promise.allSettled(
    commonStyles.map(styleId => loadStyle(styleId))
  );
}

/**
 * Get available citation styles for UI
 */
export function getAvailableStyles(): Array<{ id: CitationStyleId; name: string }> {
  return Object.entries(CITATION_STYLES).map(([id, style]) => ({
    id: id as CitationStyleId,
    name: style.name
  }));
}

/**
 * US English locale for citeproc
 * Required by citeproc-js for localization
 */
export const EN_US_LOCALE = `<?xml version="1.0" encoding="utf-8"?>
<locale xmlns="http://purl.org/net/xbiblio/csl" version="1.0" xml:lang="en-US">
  <info>
    <rights license="http://creativecommons.org/licenses/by-sa/3.0/">This work is licensed under a Creative Commons Attribution-ShareAlike 3.0 License</rights>
    <updated>2024-01-01T00:00:00+00:00</updated>
  </info>
  <style-options punctuation-in-quote="true"/>
  <date form="text">
    <date-part name="month" suffix=" "/>
    <date-part name="day" suffix=", "/>
    <date-part name="year"/>
  </date>
  <date form="numeric">
    <date-part name="month" form="numeric-leading-zeros" suffix="/"/>
    <date-part name="day" form="numeric-leading-zeros" suffix="/"/>
    <date-part name="year"/>
  </date>
  <terms>
    <term name="open-quote">"</term>
    <term name="close-quote">"</term>
    <term name="open-inner-quote">'</term>
    <term name="close-inner-quote">'</term>
    <term name="accessed">accessed</term>
    <term name="and">and</term>
    <term name="anonymous">anonymous</term>
    <term name="at">at</term>
    <term name="available at">available at</term>
    <term name="by">by</term>
    <term name="circa">circa</term>
    <term name="cited">cited</term>
    <term name="edition">
      <single>edition</single>
      <multiple>editions</multiple>
    </term>
    <term name="edition" form="short">ed.</term>
    <term name="et-al">et al.</term>
    <term name="from">from</term>
    <term name="in">in</term>
    <term name="in press">in press</term>
    <term name="internet">internet</term>
    <term name="interview">interview</term>
    <term name="letter">letter</term>
    <term name="no date">n.d.</term>
    <term name="no date" form="short">n.d.</term>
    <term name="online">online</term>
    <term name="presented at">presented at</term>
    <term name="retrieved">retrieved</term>
    <term name="page">
      <single>page</single>
      <multiple>pages</multiple>
    </term>
    <term name="page" form="short">
      <single>p.</single>
      <multiple>pp.</multiple>
    </term>
    <term name="volume">
      <single>volume</single>
      <multiple>volumes</multiple>
    </term>
    <term name="volume" form="short">
      <single>vol.</single>
      <multiple>vols.</multiple>
    </term>
    <term name="issue">issue</term>
    <term name="chapter">chapter</term>
    <term name="chapter" form="short">ch.</term>
    <term name="section">section</term>
    <term name="section" form="short">sec.</term>
    <term name="paragraph">paragraph</term>
    <term name="paragraph" form="short">para.</term>
    <term name="part">part</term>
    <term name="part" form="short">pt.</term>
    <term name="verse">verse</term>
    <term name="verse" form="short">v.</term>
    <term name="column">column</term>
    <term name="column" form="short">col.</term>
    <term name="figure">figure</term>
    <term name="figure" form="short">fig.</term>
    <term name="folio">folio</term>
    <term name="folio" form="short">f.</term>
    <term name="line">line</term>
    <term name="note">note</term>
    <term name="opus">opus</term>
    <term name="opus" form="short">op.</term>
    <term name="number">number</term>
    <term name="number" form="short">no.</term>
    <term name="supplement">supplement</term>
    <term name="supplement" form="short">suppl.</term>
    <term name="sub verbo">sub verbo</term>
    <term name="sub verbo" form="short">s.v.</term>
    <term name="translator">translator</term>
    <term name="translator" form="short">trans.</term>
    <term name="translator" form="verb">translated by</term>
    <term name="translator" form="verb-short">trans.</term>
    <term name="editor">editor</term>
    <term name="editor" form="short">ed.</term>
    <term name="editor" form="verb">edited by</term>
    <term name="editor" form="verb-short">ed.</term>
    <term name="month-01">January</term>
    <term name="month-02">February</term>
    <term name="month-03">March</term>
    <term name="month-04">April</term>
    <term name="month-05">May</term>
    <term name="month-06">June</term>
    <term name="month-07">July</term>
    <term name="month-08">August</term>
    <term name="month-09">September</term>
    <term name="month-10">October</term>
    <term name="month-11">November</term>
    <term name="month-12">December</term>
    <term name="month-01" form="short">Jan.</term>
    <term name="month-02" form="short">Feb.</term>
    <term name="month-03" form="short">Mar.</term>
    <term name="month-04" form="short">Apr.</term>
    <term name="month-05" form="short">May</term>
    <term name="month-06" form="short">June</term>
    <term name="month-07" form="short">July</term>
    <term name="month-08" form="short">Aug.</term>
    <term name="month-09" form="short">Sept.</term>
    <term name="month-10" form="short">Oct.</term>
    <term name="month-11" form="short">Nov.</term>
    <term name="month-12" form="short">Dec.</term>
  </terms>
</locale>`;
