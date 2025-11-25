import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Artefakt Extension',
    description: 'Capture, cite, and document your research process',
    version: '0.1.0',
    permissions: [
      'activeTab',
      'storage',
      'sidePanel',
      'clipboardWrite'
    ],
    host_permissions: [
      'https://chat.openai.com/*',
      'https://chatgpt.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
      'https://www.youtube.com/*',
      'https://scholar.google.com/*'
    ],
    side_panel: {
      default_path: 'sidepanel.html'
    },
    action: {
      default_popup: 'popup.html',
      default_icon: {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
        '48': 'icons/icon-48.png',
        '128': 'icons/icon-128.png'
      }
    },
    commands: {
      'capture-source': {
        suggested_key: {
          default: 'Alt+Shift+S'
        },
        description: 'Capture current page as source'
      }
    }
  }
});
