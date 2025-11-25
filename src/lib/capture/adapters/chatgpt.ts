export interface ChatGPTMetadata {
  aiMetadata: {
    modelName: string;
    modelVersion?: string;
    shareableUrl?: string;
    conversationTitle?: string;
    promptText?: string;
    responseExcerpt?: string;
  };
}

export function extractChatGPTMetadata(): ChatGPTMetadata | null {
  // Verify we're on ChatGPT
  const hostname = window.location.hostname;
  if (!hostname.includes('chat.openai.com') && !hostname.includes('chatgpt.com')) {
    return null;
  }

  const aiMetadata: ChatGPTMetadata['aiMetadata'] = {
    modelName: 'ChatGPT'
  };

  // Extract model version from UI
  // Look for model selector button or indicator
  const modelSelector = document.querySelector('[data-testid="model-switcher"]');
  if (modelSelector) {
    aiMetadata.modelVersion = modelSelector.textContent?.trim();
  }

  // Alternative: look for model name in other UI elements
  if (!aiMetadata.modelVersion) {
    const modelIndicators = document.querySelectorAll('[class*="model"]');
    for (const el of modelIndicators) {
      const text = el.textContent?.trim();
      if (text && (text.includes('GPT-4') || text.includes('GPT-3.5'))) {
        aiMetadata.modelVersion = text;
        break;
      }
    }
  }

  // Get conversation title
  const titleElement = document.querySelector('h1');
  if (titleElement) {
    aiMetadata.conversationTitle = titleElement.textContent?.trim();
  }

  // Get last prompt and response
  const messages = document.querySelectorAll('[data-message-author-role]');
  const messageArray = Array.from(messages);

  for (let i = messageArray.length - 1; i >= 0; i--) {
    const role = messageArray[i].getAttribute('data-message-author-role');
    const content = messageArray[i].textContent?.trim();

    if (role === 'assistant' && !aiMetadata.responseExcerpt) {
      aiMetadata.responseExcerpt = content?.slice(0, 500);
    }
    if (role === 'user' && !aiMetadata.promptText) {
      aiMetadata.promptText = content?.slice(0, 500);
    }

    if (aiMetadata.promptText && aiMetadata.responseExcerpt) break;
  }

  // Check for shareable URL
  if (window.location.pathname.includes('/share/')) {
    aiMetadata.shareableUrl = window.location.href;
  }

  return { aiMetadata };
}
