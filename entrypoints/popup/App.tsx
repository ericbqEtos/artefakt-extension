import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../src/lib/db';
import { Button } from '../../src/components/ui/Button';

export function App() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get 5 most recent sources
  const recentSources = useLiveQuery(
    () => db.sources.orderBy('createdAt').reverse().limit(5).toArray()
  );

  const handleCapture = async () => {
    setIsCapturing(true);
    setError(null);

    try {
      // Get all tabs in the current window
      const tabs = await browser.tabs.query({ currentWindow: true });

      // Helper to check if a URL is capturable (not an extension or special page)
      const isCapturableUrl = (url?: string) => {
        if (!url) return false;
        return url.startsWith('http://') || url.startsWith('https://');
      };

      // Find the active capturable tab
      // This handles the case where the popup is opened as a page in Playwright tests
      let targetTab = tabs.find(t => t.active && isCapturableUrl(t.url));

      // If no active capturable tab, try to find any capturable tab
      if (!targetTab) {
        targetTab = tabs.find(t => isCapturableUrl(t.url));
      }

      if (!targetTab?.id) {
        setError('No capturable tab found. Navigate to a webpage first.');
        return;
      }

      const response = await browser.runtime.sendMessage({
        type: 'CAPTURE_SOURCE',
        tabId: targetTab.id
      });
      if (response?.error) {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to capture source. Please try again.');
      console.error('Capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const openSidePanel = async () => {
    await browser.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    window.close();
  };

  return (
    <div className="w-80 p-4 bg-white" role="main">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-neutral-900">
          Artefakt
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={openSidePanel}
          aria-label="Open full reference clipboard in side panel"
        >
          Full View
        </Button>
      </header>

      <Button
        onClick={handleCapture}
        disabled={isCapturing}
        className="w-full mb-4"
        aria-busy={isCapturing}
        aria-describedby={error ? 'capture-error' : undefined}
      >
        {isCapturing ? 'Capturing...' : 'Save This Page'}
      </Button>

      {error && (
        <p id="capture-error" className="text-sm text-red-600 mb-4" role="alert">
          {error}
        </p>
      )}

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
              <li
                key={source.id}
                className="p-2 rounded border border-neutral-200 hover:bg-neutral-50"
              >
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {source.metadata.title}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {source.metadata.URL}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;
