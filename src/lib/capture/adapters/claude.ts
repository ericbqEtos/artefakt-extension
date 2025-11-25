export interface ClaudeMetadata {
  aiMetadata: {
    modelName: string;
    modelVersion?: string;
    conversationTitle?: string;
    promptText?: string;
    responseExcerpt?: string;
  };
}

export function extractClaudeMetadata(): ClaudeMetadata | null {
  if (!window.location.hostname.includes('claude.ai')) {
    return null;
  }

  const aiMetadata: ClaudeMetadata['aiMetadata'] = {
    modelName: 'Claude'
  };

  // Extract model version - Claude shows this in the UI
  const modelIndicators = document.querySelectorAll('button, span, div');
  for (const el of modelIndicators) {
    const text = el.textContent?.trim();
    if (text && (
      text.includes('Claude 3') ||
      text.includes('Opus') ||
      text.includes('Sonnet') ||
      text.includes('Haiku')
    )) {
      aiMetadata.modelVersion = text;
      break;
    }
  }

  // Get conversation title from page or first message
  const titleEl = document.querySelector('h1, [class*="title"]');
  if (titleEl) {
    aiMetadata.conversationTitle = titleEl.textContent?.trim();
  }

  // Extract messages - Claude uses different selectors
  // Look for human and assistant message containers
  const humanMessages = document.querySelectorAll('[class*="human"], [data-role="user"]');
  const assistantMessages = document.querySelectorAll('[class*="assistant"], [data-role="assistant"]');

  if (humanMessages.length > 0) {
    const lastHuman = humanMessages[humanMessages.length - 1];
    aiMetadata.promptText = lastHuman.textContent?.trim().slice(0, 500);
  }

  if (assistantMessages.length > 0) {
    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    aiMetadata.responseExcerpt = lastAssistant.textContent?.trim().slice(0, 500);
  }

  // Note: Claude does not have shareable URLs like ChatGPT
  // The screenshot serves as proof of the conversation

  return { aiMetadata };
}
