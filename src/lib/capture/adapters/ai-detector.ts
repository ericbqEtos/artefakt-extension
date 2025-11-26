/**
 * Generic AI Platform Detector
 *
 * This module attempts to detect AI conversation platforms that don't have
 * dedicated adapters. It uses heuristics to identify common patterns in AI chat
 * interfaces and extracts metadata.
 *
 * When a new platform is detected, the metadata is stored to help improve
 * future detection and potentially create dedicated adapters.
 */

export interface DetectedAIPlatform {
  isAIConversation: boolean;
  confidence: 'high' | 'medium' | 'low';
  platformName?: string;
  platformDomain: string;
  aiMetadata?: {
    modelName?: string;
    modelVersion?: string;
    conversationTitle?: string;
    promptText?: string;
    responseExcerpt?: string;
    detectedPatterns: string[];
  };
}

// Known AI platform domains (to avoid duplicate detection)
const KNOWN_AI_PLATFORMS = [
  'chat.openai.com',
  'chatgpt.com',
  'claude.ai',
  'gemini.google.com',
  'bard.google.com',
  'copilot.microsoft.com',
  'bing.com/chat',
  'poe.com',
  'perplexity.ai',
  'you.com',
  'character.ai',
  'pi.ai',
  'inflection.ai',
  'cohere.com',
  'mistral.ai',
  'groq.com',
  'together.ai',
  'huggingface.co',
  'replicate.com'
];

// Patterns that indicate AI conversation interfaces
const AI_CONVERSATION_PATTERNS = {
  // DOM patterns
  domSelectors: [
    '[data-message-author-role]',
    '[data-role="user"]',
    '[data-role="assistant"]',
    '[data-role="model"]',
    '[class*="chat-message"]',
    '[class*="conversation"]',
    '[class*="prompt"]',
    '[class*="response"]',
    '[class*="user-message"]',
    '[class*="assistant-message"]',
    '[class*="ai-response"]',
    '[class*="bot-message"]'
  ],

  // Text patterns for model names
  modelPatterns: [
    // OpenAI models
    /GPT-\d+(?:\.\d+)?(?:\s*(?:Instant|Thinking|Pro|Turbo|Mini))?/i,
    /o\d+(?:-(?:preview|mini))?/i,
    // Anthropic models
    /Claude\s*(?:\d+(?:\.\d+)?)?\s*(?:Opus|Sonnet|Haiku)?/i,
    // Google models
    /Gemini\s*(?:\d+(?:\.\d+)?)?\s*(?:Pro|Ultra|Flash|Deep\s*Think)?/i,
    /PaLM\s*\d*/i,
    // Meta models
    /Llama\s*(?:\d+(?:\.\d+)?)?/i,
    /Meta\s*AI/i,
    // Mistral models
    /Mistral\s*(?:\d+(?:x\d+)?(?:B)?)?/i,
    /Mixtral\s*(?:\d+(?:x\d+)?(?:B)?)?/i,
    // Cohere models
    /Command\s*(?:R\+?)?/i,
    /Cohere/i,
    // Other known models
    /Copilot/i,
    /Bing\s*Chat/i,
    /Perplexity/i,
    /Grok/i,
    /xAI/i,
    /DeepSeek/i,
    /Qwen/i,
    /Yi/i
  ],

  // URL patterns
  urlPatterns: [
    /chat/i,
    /conversation/i,
    /assistant/i,
    /ai/i,
    /copilot/i,
    /playground/i
  ]
};

/**
 * Attempts to detect if the current page is an AI conversation interface
 */
export function detectAIPlatform(): DetectedAIPlatform | null {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  const url = window.location.href;

  // Skip known platforms (they have dedicated adapters)
  if (KNOWN_AI_PLATFORMS.some(domain => hostname.includes(domain.split('/')[0]))) {
    return null;
  }

  const detectedPatterns: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // Check DOM patterns
  let domMatchCount = 0;
  for (const selector of AI_CONVERSATION_PATTERNS.domSelectors) {
    if (document.querySelector(selector)) {
      domMatchCount++;
      detectedPatterns.push(`dom:${selector}`);
    }
  }

  // Check URL patterns
  let urlMatchCount = 0;
  for (const pattern of AI_CONVERSATION_PATTERNS.urlPatterns) {
    if (pattern.test(url)) {
      urlMatchCount++;
      detectedPatterns.push(`url:${pattern.source}`);
    }
  }

  // Check for model names in page content
  const pageText = document.body.innerText;
  let modelName: string | undefined;
  let modelVersion: string | undefined;

  for (const pattern of AI_CONVERSATION_PATTERNS.modelPatterns) {
    const match = pageText.match(pattern);
    if (match) {
      modelName = match[0];
      detectedPatterns.push(`model:${pattern.source}`);
      break;
    }
  }

  // Determine confidence level
  if (domMatchCount >= 3 || (domMatchCount >= 2 && modelName)) {
    confidence = 'high';
  } else if (domMatchCount >= 1 && (urlMatchCount >= 1 || modelName)) {
    confidence = 'medium';
  } else if (domMatchCount >= 1 || modelName) {
    confidence = 'low';
  } else {
    // No indication this is an AI platform
    return null;
  }

  // Try to extract conversation content
  let promptText: string | undefined;
  let responseExcerpt: string | undefined;
  let conversationTitle: string | undefined;

  // Try various selectors for messages
  const userSelectors = [
    '[data-role="user"]',
    '[class*="user-message"]',
    '[class*="human"]',
    '[class*="prompt"]'
  ];

  const assistantSelectors = [
    '[data-role="assistant"]',
    '[data-role="model"]',
    '[class*="assistant"]',
    '[class*="bot"]',
    '[class*="response"]',
    '[class*="ai-message"]'
  ];

  for (const selector of userSelectors) {
    const messages = document.querySelectorAll(selector);
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      promptText = lastMessage.textContent?.trim().slice(0, 500);
      if (promptText) break;
    }
  }

  for (const selector of assistantSelectors) {
    const messages = document.querySelectorAll(selector);
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      responseExcerpt = lastMessage.textContent?.trim().slice(0, 500);
      if (responseExcerpt) break;
    }
  }

  // Try to get conversation title
  const titleEl = document.querySelector('h1, title, [class*="title"]');
  if (titleEl) {
    const text = titleEl.textContent?.trim();
    if (text && text.length < 200) {
      conversationTitle = text;
    }
  }

  // Determine platform name from hostname or detected model
  let platformName = modelName?.split(/\s+/)[0] || hostname.split('.')[0];
  if (platformName === 'www') {
    platformName = hostname.split('.')[1] || hostname;
  }

  return {
    isAIConversation: true,
    confidence,
    platformName,
    platformDomain: hostname,
    aiMetadata: {
      modelName,
      modelVersion,
      conversationTitle,
      promptText,
      responseExcerpt,
      detectedPatterns
    }
  };
}

/**
 * Get a list of all known AI platform patterns
 * This can be used to build a knowledge base of AI tools
 */
export function getKnownAIPlatforms(): string[] {
  return [...KNOWN_AI_PLATFORMS];
}

/**
 * Check if a domain is a known AI platform
 */
export function isKnownAIPlatform(hostname: string): boolean {
  return KNOWN_AI_PLATFORMS.some(domain => hostname.includes(domain.split('/')[0]));
}
