import React from 'react';

interface KeybindInputProps {
  value: string;
  onOpenBrowserSettings: () => void;
}

export function KeybindInput({ value, onOpenBrowserSettings }: KeybindInputProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 px-3 py-2 bg-neutral-100 border border-neutral-300 rounded-md text-sm text-neutral-700 font-mono">
        {value}
      </div>
      <button
        type="button"
        onClick={onOpenBrowserSettings}
        className="px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label="Change keyboard shortcut in browser settings"
      >
        Change
      </button>
    </div>
  );
}

/**
 * Opens the browser's extension shortcuts settings page
 */
export function openBrowserShortcutSettings() {
  // Detect browser and open appropriate settings page
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('firefox')) {
    // Firefox: Open about:addons with shortcuts
    browser.tabs.create({ url: 'about:addons' });
  } else if (userAgent.includes('edg')) {
    // Edge
    browser.tabs.create({ url: 'edge://extensions/shortcuts' });
  } else {
    // Chrome and other Chromium browsers
    browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
  }
}
