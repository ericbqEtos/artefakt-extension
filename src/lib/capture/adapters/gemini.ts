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
  const modelIndicators = document.querySelectorAll('[class*="model"], [class*="version"]');
  for (const el of modelIndicators) {
    const text = el.textContent?.trim();
    if (text && (
      text.includes('Gemini') ||
      text.includes('Pro') ||
      text.includes('Ultra') ||
      text.includes('1.5')
    )) {
      aiMetadata.modelVersion = text;
      break;
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
