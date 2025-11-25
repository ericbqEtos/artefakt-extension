import { extractGenericMetadata } from '../src/lib/capture/adapters/generic';
import { extractChatGPTMetadata } from '../src/lib/capture/adapters/chatgpt';
import { extractClaudeMetadata } from '../src/lib/capture/adapters/claude';
import { extractGeminiMetadata } from '../src/lib/capture/adapters/gemini';
import { extractYouTubeMetadata } from '../src/lib/capture/adapters/youtube';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Listen for extraction requests from background
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'EXTRACT_METADATA') {
        const metadata = extractMetadata();
        const selectedText = window.getSelection()?.toString().trim() || '';
        sendResponse({ metadata, selectedText });
      }
      return true;
    });
  }
});

function extractMetadata() {
  const hostname = window.location.hostname;

  // Try platform-specific extractors first
  if (hostname.includes('chat.openai.com') || hostname.includes('chatgpt.com')) {
    const aiMeta = extractChatGPTMetadata();
    if (aiMeta) {
      return {
        ...extractGenericMetadata(),
        ...aiMeta,
        sourceType: 'ai-conversation',
        platform: 'chatgpt'
      };
    }
  }

  if (hostname.includes('claude.ai')) {
    const aiMeta = extractClaudeMetadata();
    if (aiMeta) {
      return {
        ...extractGenericMetadata(),
        ...aiMeta,
        sourceType: 'ai-conversation',
        platform: 'claude'
      };
    }
  }

  if (hostname.includes('gemini.google.com')) {
    const aiMeta = extractGeminiMetadata();
    if (aiMeta) {
      return {
        ...extractGenericMetadata(),
        ...aiMeta,
        sourceType: 'ai-conversation',
        platform: 'gemini'
      };
    }
  }

  if (hostname.includes('youtube.com')) {
    const videoMeta = extractYouTubeMetadata();
    if (videoMeta) {
      return {
        ...extractGenericMetadata(),
        ...videoMeta,
        sourceType: 'video',
        platform: 'youtube'
      };
    }
  }

  // Fall back to generic extraction
  return {
    ...extractGenericMetadata(),
    sourceType: 'webpage'
  };
}
