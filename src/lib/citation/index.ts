/**
 * Citation Module
 * Provides citation generation functionality using citeproc-js
 */

export {
  loadStyle,
  preloadCommonStyles,
  getAvailableStyles,
  CITATION_STYLES,
  EN_US_LOCALE,
  type CitationStyleId
} from './styles';

export {
  sourceToCSL,
  sourcesToCSL,
  parseAuthor,
  type CSLItem
} from './formats';

export {
  generateCitation,
  generateCitations,
  generateQuickCitation,
  formatCitationDate,
  type CitationResult
} from './citeproc';
