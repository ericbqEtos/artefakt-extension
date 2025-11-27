/**
 * NotebookLM output types - different tools within the platform
 * Each represents a different way of engaging with source material
 */
export type NotebookLMOutputType =
  | 'chat'           // Standard Q&A with sources
  | 'audio-overview' // AI-generated podcast/audio summary
  | 'video-overview' // AI-generated video with narrated slides
  | 'mind-map'       // Interactive concept visualization
  | 'report'         // Structured written report (blog post format)
  | 'quiz'           // Auto-generated quiz for self-testing
  | 'flashcards'     // Study flashcards from content
  | 'learning-guide' // Guided learning path
  | 'briefing-doc'   // Executive summary document
  | 'study-guide'    // Comprehensive study material
  | 'faq'            // Generated FAQ from sources
  | 'timeline';      // Chronological event timeline

/**
 * Detailed metadata for NotebookLM tool utilization
 * Captures context about HOW the AI tool was used, not just WHAT was generated
 */
export interface NotebookLMToolContext {
  outputType: NotebookLMOutputType;
  outputLabel: string;           // Human-readable label (e.g., "Audio Overview (Podcast)")
  outputDescription?: string;    // Description of what this output type does
  generatedFromSources: boolean; // Whether output was generated from uploaded sources
  sourceCount?: number;          // Number of sources used
  sourceNames?: string[];        // Names/titles of sources used
  duration?: string;             // For audio/video: duration if detectable
  customization?: {              // Any customization applied
    style?: string;              // e.g., "casual", "academic", "professional"
    length?: string;             // e.g., "short", "detailed"
    audience?: string;           // e.g., "beginner", "expert"
  };
}

export interface NotebookLMMetadata {
  aiMetadata: {
    modelName: string;
    modelVersion?: string;
    conversationTitle?: string;
    notebookTitle?: string;
    promptText?: string;
    responseExcerpt?: string;
    shareableUrl?: string;
    sources?: string[];
    outputType?: NotebookLMOutputType;
    // Enhanced tool context for citations and origin trail
    toolContext?: NotebookLMToolContext;
  };
}

export function extractNotebookLMMetadata(): NotebookLMMetadata | null {
  const hostname = window.location.hostname;
  if (!hostname.includes('notebooklm.google.com') && !hostname.includes('notebooklm.google')) {
    return null;
  }

  const aiMetadata: NotebookLMMetadata['aiMetadata'] = {
    modelName: 'NotebookLM'
  };

  // NotebookLM is powered by Gemini - try to detect the underlying model
  // As of November 2025, NotebookLM uses Gemini 2.0 Flash for most operations
  const modelPatterns = [
    /Gemini\s*2\.0\s*(?:Flash|Pro|Ultra)?/i,
    /Gemini\s*1\.5\s*(?:Flash|Pro)?/i,
    /Gemini\s*(?:Flash|Pro|Ultra)/i
  ];

  const allText = document.body.innerText;
  for (const pattern of modelPatterns) {
    const match = allText.match(pattern);
    if (match) {
      aiMetadata.modelVersion = `NotebookLM (${match[0]})`;
      break;
    }
  }

  // Default version if not detected
  if (!aiMetadata.modelVersion) {
    aiMetadata.modelVersion = 'NotebookLM (Gemini 2.0)';
  }

  // Extract notebook title - multiple approaches
  const titleSelectors = [
    '[data-testid="notebook-title"]',
    'h1',
    '[class*="notebook-title"]',
    '[class*="NotebookTitle"]',
    '[aria-label*="notebook"]',
    'header h1',
    'header [class*="title"]'
  ];

  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text && text.length > 0 && text.length < 200 &&
        !text.toLowerCase().includes('notebooklm') &&
        text !== 'New notebook') {
      aiMetadata.notebookTitle = text;
      aiMetadata.conversationTitle = text;
      break;
    }
  }

  // Detect output type based on URL or visible content
  const path = window.location.pathname.toLowerCase();
  const pageText = allText.toLowerCase();

  // Output type detection with human-readable labels and descriptions
  // These will be used for citations and origin trail context
  const outputTypeMap: Record<NotebookLMOutputType, { label: string; description: string }> = {
    'chat': {
      label: 'Chat',
      description: 'Interactive Q&A conversation with AI about uploaded sources'
    },
    'audio-overview': {
      label: 'Audio Overview (Podcast)',
      description: 'AI-generated podcast-style audio summary of sources'
    },
    'video-overview': {
      label: 'Video Overview',
      description: 'AI-generated video with narrated slides summarizing sources'
    },
    'mind-map': {
      label: 'Mind Map',
      description: 'Interactive concept visualization showing relationships between ideas'
    },
    'report': {
      label: 'Report',
      description: 'Structured written report generated from sources'
    },
    'quiz': {
      label: 'Quiz',
      description: 'Auto-generated quiz for self-testing comprehension'
    },
    'flashcards': {
      label: 'Flashcards',
      description: 'Study flashcards generated from source content'
    },
    'learning-guide': {
      label: 'Learning Guide',
      description: 'Guided learning path through the material'
    },
    'briefing-doc': {
      label: 'Briefing Document',
      description: 'Executive summary document for quick understanding'
    },
    'study-guide': {
      label: 'Study Guide',
      description: 'Comprehensive study material for exam preparation'
    },
    'faq': {
      label: 'FAQ',
      description: 'Frequently asked questions generated from sources'
    },
    'timeline': {
      label: 'Timeline',
      description: 'Chronological event timeline from historical sources'
    }
  };

  // Detect the output type
  let detectedType: NotebookLMOutputType = 'chat';

  if (path.includes('/audio') || pageText.includes('audio overview') || pageText.includes('podcast')) {
    detectedType = 'audio-overview';
  } else if (path.includes('/video') || pageText.includes('video overview')) {
    detectedType = 'video-overview';
  } else if (path.includes('/mindmap') || path.includes('/mind-map') || pageText.includes('mind map')) {
    detectedType = 'mind-map';
  } else if (path.includes('/report') || (pageText.includes('report') && pageText.includes('generate'))) {
    detectedType = 'report';
  } else if (path.includes('/quiz') || pageText.includes('quiz') || pageText.includes('test yourself')) {
    detectedType = 'quiz';
  } else if (path.includes('/flashcard') || pageText.includes('flashcard')) {
    detectedType = 'flashcards';
  } else if (path.includes('/learning-guide') || pageText.includes('learning guide')) {
    detectedType = 'learning-guide';
  } else if (path.includes('/briefing') || pageText.includes('briefing')) {
    detectedType = 'briefing-doc';
  } else if (path.includes('/study-guide') || pageText.includes('study guide')) {
    detectedType = 'study-guide';
  } else if (path.includes('/faq') || (pageText.includes('faq') && pageText.includes('generate'))) {
    detectedType = 'faq';
  } else if (path.includes('/timeline') || (pageText.includes('timeline') && pageText.includes('generate'))) {
    detectedType = 'timeline';
  }

  aiMetadata.outputType = detectedType;

  // Extract sources used in the notebook
  const sourceSelectors = [
    '[data-testid="source-item"]',
    '[class*="source-card"]',
    '[class*="SourceCard"]',
    '[class*="source-list"] li',
    '[aria-label*="source"]'
  ];

  const sources: string[] = [];
  for (const selector of sourceSelectors) {
    const sourceElements = document.querySelectorAll(selector);
    if (sourceElements.length > 0) {
      sourceElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length < 200) {
          sources.push(text);
        }
      });
      break;
    }
  }

  if (sources.length > 0) {
    aiMetadata.sources = sources.slice(0, 10); // Limit to 10 sources
  }

  // Build enhanced tool context for citations and origin trail
  const typeInfo = outputTypeMap[detectedType];
  aiMetadata.toolContext = {
    outputType: detectedType,
    outputLabel: typeInfo.label,
    outputDescription: typeInfo.description,
    generatedFromSources: sources.length > 0,
    sourceCount: sources.length,
    sourceNames: sources.length > 0 ? sources.slice(0, 10) : undefined
  };

  // Try to detect duration for audio/video overviews
  if (detectedType === 'audio-overview' || detectedType === 'video-overview') {
    const durationPatterns = [
      /(\d{1,2}:\d{2}(?::\d{2})?)/,  // MM:SS or HH:MM:SS
      /(\d+)\s*(?:min|minute)/i,      // X minutes
      /duration[:\s]+([^\n]+)/i       // "Duration: X"
    ];
    for (const pattern of durationPatterns) {
      const match = allText.match(pattern);
      if (match) {
        aiMetadata.toolContext.duration = match[1];
        break;
      }
    }
  }

  // Try to detect customization options if visible
  const stylePatterns = [
    { pattern: /casual|conversational/i, value: 'casual' },
    { pattern: /academic|formal/i, value: 'academic' },
    { pattern: /professional|business/i, value: 'professional' }
  ];
  for (const { pattern, value } of stylePatterns) {
    if (pattern.test(pageText)) {
      aiMetadata.toolContext.customization = {
        ...aiMetadata.toolContext.customization,
        style: value
      };
      break;
    }
  }

  // Extract chat messages if in chat mode
  const messageSelectors = [
    { human: '[data-testid="user-message"]', assistant: '[data-testid="assistant-message"]' },
    { human: '[class*="user-message"]', assistant: '[class*="assistant-message"]' },
    { human: '[class*="human"]', assistant: '[class*="response"]' },
    { human: '[data-role="user"]', assistant: '[data-role="assistant"]' }
  ];

  for (const { human, assistant } of messageSelectors) {
    const humanMessages = document.querySelectorAll(human);
    const assistantMessages = document.querySelectorAll(assistant);

    if (humanMessages.length > 0 || assistantMessages.length > 0) {
      if (humanMessages.length > 0) {
        const lastHuman = humanMessages[humanMessages.length - 1];
        const text = lastHuman.textContent?.trim();
        if (text) {
          aiMetadata.promptText = text.slice(0, 500);
        }
      }

      if (assistantMessages.length > 0) {
        const lastAssistant = assistantMessages[assistantMessages.length - 1];
        const text = lastAssistant.textContent?.trim();
        if (text) {
          aiMetadata.responseExcerpt = text.slice(0, 500);
        }
      }

      if (aiMetadata.promptText || aiMetadata.responseExcerpt) break;
    }
  }

  // Check for shareable/public URL
  if (window.location.pathname.includes('/share/') ||
      window.location.pathname.includes('/public/')) {
    aiMetadata.shareableUrl = window.location.href;
  }

  return { aiMetadata };
}
