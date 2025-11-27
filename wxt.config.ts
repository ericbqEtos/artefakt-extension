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
      'clipboardWrite',
      'scripting',
      'tabs',
      'offscreen'
    ],
    host_permissions: [
      '<all_urls>'
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
    icons: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png'
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
