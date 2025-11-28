/**
 * Settings types for the Artefakt extension
 */

export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'ieee' | 'harvard';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ja' | 'ko';

export interface ExtensionSettings {
  // Language & Localization
  language: SupportedLanguage;

  // Keyboard Shortcuts (display only - managed by browser)
  captureShortcut: string;

  // Citation Preferences
  defaultCitationStyle: CitationStyle;

  // Institutional Account (future)
  institutionalEmail?: string;
  isConnected: boolean;

  // Metadata
  updatedAt: Date;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  language: 'en',
  captureShortcut: 'Alt+Shift+S',
  defaultCitationStyle: 'apa',
  isConnected: false,
  updatedAt: new Date(),
};

export const SUPPORTED_LANGUAGES: { id: SupportedLanguage; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español' },
  { id: 'fr', name: 'Français' },
  { id: 'de', name: 'Deutsch' },
  { id: 'pt', name: 'Português' },
  { id: 'zh', name: '中文' },
  { id: 'ja', name: '日本語' },
  { id: 'ko', name: '한국어' },
];

export const CITATION_STYLES: { id: CitationStyle; name: string }[] = [
  { id: 'apa', name: 'APA (7th Edition)' },
  { id: 'mla', name: 'MLA (9th Edition)' },
  { id: 'chicago', name: 'Chicago (17th Edition)' },
  { id: 'ieee', name: 'IEEE' },
  { id: 'harvard', name: 'Harvard' },
];
