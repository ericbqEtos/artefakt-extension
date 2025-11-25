// CSL-JSON type definitions for citation processing

export interface CSLItem {
  id: string;
  type: string;
  title: string;
  URL?: string;
  accessed?: CSLDate;
  issued?: CSLDate;
  author?: CSLAuthor[];
  'container-title'?: string;
  publisher?: string;
  DOI?: string;
  volume?: string;
  issue?: string;
  page?: string;
  note?: string;
  genre?: string;
  abstract?: string;
}

export interface CSLAuthor {
  family?: string;
  given?: string;
  literal?: string;
}

export interface CSLDate {
  'date-parts': [[number, number?, number?]];
}

export type CSLItemType =
  | 'article'
  | 'article-journal'
  | 'article-magazine'
  | 'article-newspaper'
  | 'book'
  | 'chapter'
  | 'dataset'
  | 'entry'
  | 'entry-dictionary'
  | 'entry-encyclopedia'
  | 'figure'
  | 'graphic'
  | 'interview'
  | 'legal_case'
  | 'legislation'
  | 'manuscript'
  | 'map'
  | 'motion_picture'
  | 'musical_score'
  | 'pamphlet'
  | 'paper-conference'
  | 'patent'
  | 'personal_communication'
  | 'post'
  | 'post-weblog'
  | 'report'
  | 'review'
  | 'review-book'
  | 'software'
  | 'song'
  | 'speech'
  | 'thesis'
  | 'treaty'
  | 'video'
  | 'webpage';
