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

  // Extract model version - try multiple approaches
  // Look for model selector/indicator elements
  const modelSelectors = [
    '[data-testid="model-selector"]',
    'button[aria-label*="model"]',
    '[class*="model-selector"]',
    '[class*="ModelSelector"]'
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
  // Updated November 2025: Claude 4.5 series (Opus, Sonnet, Haiku) are latest
  if (!aiMetadata.modelVersion) {
    const modelPatterns = [
      // Latest models (November 2025)
      /Claude\s*(?:Opus|Sonnet|Haiku)\s*4\.5/i,
      /(?:Opus|Sonnet|Haiku)\s*4\.5/i,
      /Claude\s*4\.5\s*(?:Opus|Sonnet|Haiku)?/i,
      // Previous generation (still available)
      /Claude\s*(?:Opus|Sonnet)\s*4\.1/i,
      /Claude\s*(?:Opus|Sonnet)\s*4/i,
      /Claude\s*3\.7\s*Sonnet/i,
      // Legacy (for historical captures)
      /Claude\s*3\.5\s*(?:Sonnet|Opus|Haiku)/i,
      /Claude\s*3\s*(?:Sonnet|Opus|Haiku)/i,
      /Claude\s*(?:Opus|Sonnet|Haiku)/i
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

  // Get conversation title - multiple approaches
  const titleSelectors = [
    '[data-testid="conversation-title"]',
    'h1',
    '[class*="ConversationTitle"]',
    'nav [class*="active"]'
  ];
  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text && text.length > 0 && text.length < 200 && text !== 'Claude') {
      aiMetadata.conversationTitle = text;
      break;
    }
  }

  // Extract messages - try multiple selectors
  const messageSelectors = [
    { human: '[data-testid="user-message"]', assistant: '[data-testid="assistant-message"]' },
    { human: '[class*="human-turn"]', assistant: '[class*="claude-turn"]' },
    { human: '[class*="user"]', assistant: '[class*="assistant"]' },
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

  // Note: Claude does not have shareable URLs like ChatGPT
  // The screenshot serves as proof of the conversation

  return { aiMetadata };
}
