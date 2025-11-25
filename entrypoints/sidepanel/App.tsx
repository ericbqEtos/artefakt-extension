import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/Button';

type Tab = 'sources' | 'timeline' | 'share';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('sources');
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());

  const sources = useLiveQuery(
    () => db.sources.orderBy('createdAt').reverse().toArray()
  );

  const toggleSourceSelection = (id: string) => {
    setSelectedSourceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (sources) {
      setSelectedSourceIds(new Set(sources.map(s => s.id!)));
    }
  };

  const clearSelection = () => {
    setSelectedSourceIds(new Set());
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b p-4">
        <h1 className="text-xl font-semibold text-neutral-900">
          Artefakt
        </h1>

        {/* Tab Navigation */}
        <nav className="flex gap-2 mt-3" role="tablist" aria-label="Main sections">
          {[
            { id: 'sources', label: 'Sources' },
            { id: 'timeline', label: 'Origin Trail' },
            { id: 'share', label: 'Share' }
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${activeTab === tab.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden flex">
        {/* Sources Panel */}
        <div
          id="sources-panel"
          role="tabpanel"
          aria-labelledby="sources-tab"
          hidden={activeTab !== 'sources'}
          className="flex-1 flex"
        >
          {/* Source List */}
          <div className="w-1/2 border-r overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-medium text-neutral-800">
                All Sources ({sources?.length || 0})
              </h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                {selectedSourceIds.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear ({selectedSourceIds.size})
                  </Button>
                )}
              </div>
            </div>

            <ul className="space-y-2" role="listbox" aria-multiselectable="true">
              {sources?.map(source => (
                <li
                  key={source.id}
                  role="option"
                  aria-selected={selectedSourceIds.has(source.id!)}
                  onClick={() => toggleSourceSelection(source.id!)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSourceSelection(source.id!);
                    }
                  }}
                  tabIndex={0}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-all
                    focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2
                    ${selectedSourceIds.has(source.id!)
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-neutral-200 hover:bg-neutral-50'}
                  `}
                >
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {source.metadata.title}
                  </p>
                  <p className="text-xs text-neutral-500 truncate mt-1">
                    {source.metadata.URL}
                  </p>
                  <span className={`
                    inline-block mt-2 text-xs px-2 py-0.5 rounded-full
                    ${source.sourceType === 'ai-conversation'
                      ? 'bg-purple-100 text-purple-800'
                      : source.sourceType === 'video'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'}
                  `}>
                    {source.sourceType}
                  </span>
                </li>
              ))}
            </ul>

            {(!sources || sources.length === 0) && (
              <p className="text-neutral-500 italic text-center py-8">
                No sources captured yet.
              </p>
            )}
          </div>

          {/* Citation Panel */}
          <div className="w-1/2 overflow-y-auto p-4">
            <h2 className="font-medium text-neutral-800 mb-4">
              Generate Citations
            </h2>

            {selectedSourceIds.size === 0 ? (
              <p className="text-neutral-500 italic">
                Select one or more sources to generate citations.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-neutral-600">
                  {selectedSourceIds.size} source(s) selected
                </p>
                <p className="text-sm text-neutral-500 italic">
                  Citation formatting coming soon...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Panel */}
        <div
          id="timeline-panel"
          role="tabpanel"
          aria-labelledby="timeline-tab"
          hidden={activeTab !== 'timeline'}
          className="flex-1 p-4 overflow-y-auto"
        >
          <h2 className="font-medium text-neutral-800 mb-4">
            Research Journey
          </h2>
          {sources && sources.length > 0 ? (
            <p className="text-neutral-500 italic">
              Origin trail visualization coming soon...
            </p>
          ) : (
            <p className="text-neutral-500 italic">
              Capture some sources to see your research timeline.
            </p>
          )}
        </div>

        {/* Share Panel */}
        <div
          id="share-panel"
          role="tabpanel"
          aria-labelledby="share-tab"
          hidden={activeTab !== 'share'}
          className="flex-1 p-4 overflow-y-auto"
        >
          <h2 className="font-medium text-neutral-800 mb-4">
            Share Origin Trail
          </h2>
          <p className="text-neutral-500 italic">
            Coming soon: Generate shareable links to your research process.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
