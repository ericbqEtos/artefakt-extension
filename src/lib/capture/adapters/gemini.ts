export interface GeminiMetadata {
  aiMetadata: {
    modelName: string;
    modelVersion?: string;
    shareableUrl?: string;
    conversationTitle?: string;
    promptText?: string;
    responseExcerpt?: string;
  };
}

export function extractGeminiMetadata(): GeminiMetadata | null {
  if (!window.location.hostname.includes('gemini.google.com')) {
    return null;
  }

  const aiMetadata: GeminiMetadata['aiMetadata'] = {
    modelName: 'Gemini'
  };

  // Extract model version from UI
  // Updated November 2025: Gemini 3 (Pro, Deep Think) are latest models
  const modelSelectors = [
    '[data-testid="model-selector"]',
    'button[aria-label*="model"]',
    '[class*="model-selector"]',
    '[class*="model"], [class*="version"]'
  ];

  for (const selector of modelSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const text = el.textContent?.trim();
      if (text && text.length < 100 && (
        text.includes('Gemini') ||
        text.includes('Pro') ||
        text.includes('Ultra') ||
        text.includes('Deep') ||
        /\d\.\d/.test(text) // Version numbers like 3.0, 2.5
      )) {
        aiMetadata.modelVersion = text;
        break;
      }
    }
    if (aiMetadata.modelVersion) break;
  }

  // Fallback: search for model name patterns in page
  if (!aiMetadata.modelVersion) {
    const allText = document.body.innerText;
    const modelPatterns = [
      // Latest models (November 2025)
      /Gemini\s*3(?:\.0)?\s*(?:Pro|Deep\s*Think)?/i,
      // Previous generation (still available)
      /Gemini\s*2\.5\s*(?:Pro|Flash(?:-Lite)?)/i,
      /Gemini\s*2\.0\s*(?:Pro|Flash|Ultra)/i,
      // Legacy
      /Gemini\s*1\.5\s*(?:Pro|Flash|Ultra)/i,
      /Gemini\s*(?:Pro|Ultra|Flash)/i
    ];
    for (const pattern of modelPatterns) {
      const match = allText.match(pattern);
      if (match) {
        aiMetadata.modelVersion = match[0];
        break;
      }
    }
  }

  // Get conversation title
  const titleEl = document.querySelector('h1, [class*="title"]');
  if (titleEl) {
    aiMetadata.conversationTitle = titleEl.textContent?.trim();
  }

  // Extract messages
  const userMessages = document.querySelectorAll('[class*="user-message"], [data-role="user"]');
  const modelMessages = document.querySelectorAll('[class*="model-response"], [data-role="model"]');

  if (userMessages.length > 0) {
    const lastUser = userMessages[userMessages.length - 1];
    aiMetadata.promptText = lastUser.textContent?.trim().slice(0, 500);
  }

  if (modelMessages.length > 0) {
    const lastModel = modelMessages[modelMessages.length - 1];
    aiMetadata.responseExcerpt = lastModel.textContent?.trim().slice(0, 500);
  }

  // Check for shareable URL (Gemini supports g.co/gemini/share URLs)
  if (window.location.href.includes('/share/') || window.location.href.includes('g.co/gemini')) {
    aiMetadata.shareableUrl = window.location.href;
  }

  return { aiMetadata };
}
