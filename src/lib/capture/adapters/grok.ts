export interface GrokMetadata {
  aiMetadata: {
    modelName: string;
    modelVersion?: string;
    conversationTitle?: string;
    promptText?: string;
    responseExcerpt?: string;
    shareableUrl?: string;
    isPrivateChat?: boolean;
  };
}

export function extractGrokMetadata(): GrokMetadata | null {
  const hostname = window.location.hostname;

  // Grok is available on grok.com and x.com (formerly Twitter)
  const isGrokCom = hostname.includes('grok.com');
  const isXGrok = hostname.includes('x.com') && window.location.pathname.includes('/grok');

  if (!isGrokCom && !isXGrok) {
    return null;
  }

  const aiMetadata: GrokMetadata['aiMetadata'] = {
    modelName: 'Grok'
  };

  // Extract model version - Grok models as of November 2025
  // Grok 4.1 is the latest, with Grok 3, Grok 2.5, and earlier versions
  const modelSelectors = [
    '[data-testid="model-selector"]',
    '[data-testid="model-picker"]',
    'button[aria-label*="model"]',
    '[class*="model-selector"]',
    '[class*="ModelSelector"]',
    '[class*="model-picker"]'
  ];

  for (const selector of modelSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.textContent?.trim();
      if (text && text.length < 50) {
        aiMetadata.modelVersion = text;
        break;
      }
    }
  }

  // Fallback: search for model name patterns in page
  if (!aiMetadata.modelVersion) {
    const modelPatterns = [
      // Latest models (November 2025)
      /Grok\s*4\.1/i,
      /Grok\s*4/i,
      /Grok\s*3\.5/i,
      /Grok\s*3/i,
      // Previous generation
      /Grok\s*2\.5/i,
      /Grok\s*2/i,
      // Generic patterns
      /Grok\s*(?:Vision|Mini|Pro)?/i
    ];

    const allText = document.body.innerText;
    for (const pattern of modelPatterns) {
      const match = allText.match(pattern);
      if (match) {
        aiMetadata.modelVersion = match[0];
        break;
      }
    }
  }

  // Get conversation title - Grok often uses the first message or a generated title
  const titleSelectors = [
    '[data-testid="conversation-title"]',
    'h1',
    '[class*="chat-title"]',
    '[class*="ChatTitle"]',
    '[class*="conversation-header"]',
    'header [class*="title"]'
  ];

  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text && text.length > 0 && text.length < 200 &&
        !text.toLowerCase().includes('grok') &&
        text !== 'New chat') {
      aiMetadata.conversationTitle = text;
      break;
    }
  }

  // Extract messages - try multiple selectors
  const messageSelectors = [
    { human: '[data-testid="user-message"]', assistant: '[data-testid="assistant-message"]' },
    { human: '[data-testid="human-message"]', assistant: '[data-testid="grok-message"]' },
    { human: '[class*="user-message"]', assistant: '[class*="assistant-message"]' },
    { human: '[class*="human"]', assistant: '[class*="grok"]' },
    { human: '[data-role="user"]', assistant: '[data-role="assistant"]' },
    { human: '[class*="UserMessage"]', assistant: '[class*="AssistantMessage"]' }
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

  // Check for shareable URL - Grok has a share feature
  // URLs look like: grok.com/share/... or x.com/i/grok/share/...
  const path = window.location.pathname;
  if (path.includes('/share/')) {
    aiMetadata.shareableUrl = window.location.href;
  }

  // Check if this is a private chat
  // Private chats are not saved and deleted within 30 days
  if (path.includes('/private') ||
      document.querySelector('[class*="private"]') ||
      document.body.innerText.toLowerCase().includes('private chat')) {
    aiMetadata.isPrivateChat = true;
  }

  return { aiMetadata };
}
