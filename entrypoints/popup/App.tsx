import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../src/lib/db';
import { Button } from '../../src/components/ui/Button';
import { Spinner } from '../../src/components/ui/Spinner';
import { ToastProvider, useToast } from '../../src/components/ui/Toast';
import { SourceCard } from '../../src/components/SourceCard';

function PopupContent() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const { addToast } = useToast();

  // Get 5 most recent sources
  const recentSources = useLiveQuery(
    () => db.sources.orderBy('createdAt').reverse().limit(5).toArray()
  );

  const handleCapture = async () => {
    setIsCapturing(true);
    setCaptureSuccess(false);

    try {
      // Get all tabs in the current window
      const tabs = await browser.tabs.query({ currentWindow: true });

      // Helper to check if a URL is capturable (web pages or local files)
      const isCapturableUrl = (url?: string) => {
        if (!url) return false;
        return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://');
      };

      // Find the active capturable tab
      let targetTab = tabs.find(t => t.active && isCapturableUrl(t.url));

      // If no active capturable tab, try to find any capturable tab
      if (!targetTab) {
        targetTab = tabs.find(t => isCapturableUrl(t.url));
      }

      if (!targetTab?.id) {
        addToast('error', 'No capturable tab found. Navigate to a webpage first.');
        return;
      }

      const response = await browser.runtime.sendMessage({
        type: 'CAPTURE_SOURCE',
        tabId: targetTab.id
      });

      if (response?.error) {
        addToast('error', response.error);
      } else {
        setCaptureSuccess(true);
        addToast('success', 'Source captured successfully!');
        // Reset success state after animation
        setTimeout(() => setCaptureSuccess(false), 2000);
      }
    } catch (err) {
      addToast('error', 'Failed to capture source. Please try again.');
      console.error('Capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const openSidePanel = async (tab?: string) => {
    try {
      // Store the desired tab in session storage so sidepanel can read it
      if (tab) {
        await browser.storage.session.set({ sidepanelTab: tab });
      }
      // Get current window
      const currentWindow = await browser.windows.getCurrent();
      if (currentWindow.id) {
        // Open side panel in current window
        await browser.sidePanel.open({ windowId: currentWindow.id });
      }
    } catch (err) {
      console.error('Failed to open side panel:', err);
      // Fallback: open sidepanel.html in a new tab
      const url = tab
        ? browser.runtime.getURL(`/sidepanel.html#${tab}`)
        : browser.runtime.getURL('/sidepanel.html');
      await browser.tabs.create({ url });
    }
    window.close();
  };

  return (
    <div className="w-80 p-4 bg-white" role="main">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-neutral-900">
          Artefakt
        </h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => openSidePanel('settings')}
            className="p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Open settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openSidePanel()}
            aria-label="Open full reference clipboard in side panel"
          >
            Full View
          </Button>
        </div>
      </header>

      <Button
        onClick={handleCapture}
        disabled={isCapturing}
        className={`w-full mb-4 ${captureSuccess ? 'bg-green-600 hover:bg-green-700' : ''}`}
        aria-busy={isCapturing}
      >
        {isCapturing ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size="sm" label="Capturing" />
            <span>Capturing...</span>
          </span>
        ) : captureSuccess ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Captured!</span>
          </span>
        ) : (
          'Save This Page'
        )}
      </Button>

      <section aria-labelledby="recent-sources-heading">
        <h2
          id="recent-sources-heading"
          className="text-sm font-medium text-neutral-600 mb-2"
        >
          Recent Sources ({recentSources?.length || 0})
        </h2>

        {recentSources?.length === 0 ? (
          <p className="text-sm text-neutral-500 italic">
            No sources captured yet. Click "Save This Page" to get started.
          </p>
        ) : (
          <ul className="space-y-2" role="list">
            {recentSources?.map(source => (
              <li key={source.id}>
                <SourceCard
                  source={source}
                  compact
                  showThumbnail={false}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <PopupContent />
    </ToastProvider>
  );
}

export default App;
