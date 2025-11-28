export interface Author {
  family?: string;
  given?: string;
  literal?: string;
}

export interface CSLDate {
  'date-parts': [[number, number?, number?]];
}

/**
 * A group/category for organizing sources (e.g., "Assignment 1", "History Paper")
 */
export interface SourceGroup {
  id?: string;
  name: string;
  description?: string;
  color?: string; // Hex color for visual distinction (e.g., "#3b82f6")
  createdAt: Date;
  updatedAt: Date;
}

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
    conversationTitle?: string;
    responseExcerpt?: string;
    // NotebookLM-specific
    notebookTitle?: string;
    outputType?: string;
    sources?: string[];
    toolContext?: {
      outputType: string;
      outputLabel: string;
      outputDescription?: string;
      generatedFromSources: boolean;
      sourceCount?: number;
      sourceNames?: string[];
      duration?: string;
      customization?: {
        style?: string;
        length?: string;
        audience?: string;
      };
    };
    // Grok-specific
    isPrivateChat?: boolean;
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

  // Group membership (many-to-many relationship via array of group IDs)
  groupIds?: string[];

  // Soft delete (keeps source in origin trail but hides from main lists)
  isDeleted?: boolean;
  deletedAt?: Date;

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

export interface ResearchSession {
  id?: string;
  userId?: string;
  title?: string;
  createdAt: Date;
  endedAt?: Date;
  isActive: boolean;
}
