import { defineConfig } from 'wxt';
import path from 'node:path';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
  vite: () => ({
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }),
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
      default_icon: 'icons/icon.svg'
    },
    icons: {
      '16': 'icons/icon.svg',
      '32': 'icons/icon.svg',
      '48': 'icons/icon.svg',
      '128': 'icons/icon.svg'
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
