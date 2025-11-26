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

  // Extract model version from UI - try multiple selectors
  const modelSelectors = [
    '[data-testid="model-switcher"]',
    '[data-testid="model-selector"]',
    'button[aria-haspopup="menu"]', // Model dropdown
    '[class*="ModelSwitcher"]'
  ];

  for (const selector of modelSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = el.textContent?.trim();
      if (text && (text.includes('GPT') || text.includes('4') || text.includes('o1'))) {
        aiMetadata.modelVersion = text;
        break;
      }
    }
  }

  // Fallback: search for model name in page text
  // Updated November 2025: GPT-5.1, o3, o4-mini are latest models
  if (!aiMetadata.modelVersion) {
    const allText = document.body.innerText;
    const modelPatterns = [
      // Latest models (November 2025)
      /GPT-5\.1\s*(Instant|Thinking)?/i,
      /GPT-5\s*(Instant|Thinking|Pro)?/i,
      /GPT-4\.5/i,
      /o4-mini/i,
      /o3(-mini)?/i,
      // Previous generation (still available)
      /GPT-4\.1/i,
      /GPT-4o(-mini)?/i,
      /o1(-preview|-mini)?/i,
      // Legacy (for historical captures)
      /GPT-4(-turbo)?/i,
      /GPT-3\.5(-turbo)?/i
    ];
    for (const pattern of modelPatterns) {
      const match = allText.match(pattern);
      if (match) {
        aiMetadata.modelVersion = match[0];
        break;
      }
    }
  }

  // Get conversation title - multiple approaches
  const titleSelectors = [
    'h1',
    '[data-testid="conversation-title"]',
    'nav [class*="active"]'
  ];
  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text && text.length > 0 && text.length < 200) {
      aiMetadata.conversationTitle = text;
      break;
    }
  }

  // Get messages - try multiple selectors
  const messageSelectors = [
    '[data-message-author-role]',
    '[class*="ConversationItem"]',
    '[class*="message"]'
  ];

  for (const selector of messageSelectors) {
    const messages = document.querySelectorAll(selector);
    if (messages.length > 0) {
      const messageArray = Array.from(messages);

      for (let i = messageArray.length - 1; i >= 0; i--) {
        const role = messageArray[i].getAttribute('data-message-author-role') ||
                     (messageArray[i].className.includes('user') ? 'user' : 'assistant');
        const content = messageArray[i].textContent?.trim();

        if (role === 'assistant' && !aiMetadata.responseExcerpt && content) {
          aiMetadata.responseExcerpt = content.slice(0, 500);
        }
        if (role === 'user' && !aiMetadata.promptText && content) {
          aiMetadata.promptText = content.slice(0, 500);
        }

        if (aiMetadata.promptText && aiMetadata.responseExcerpt) break;
      }
      if (aiMetadata.promptText || aiMetadata.responseExcerpt) break;
    }
  }

  // Check for shareable URL
  if (window.location.pathname.includes('/share/')) {
    aiMetadata.shareableUrl = window.location.href;
  }

  return { aiMetadata };
}
