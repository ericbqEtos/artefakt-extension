import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../src/lib/db';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Select } from '../../src/components/ui/Select';
import { ToastProvider, useToast } from '../../src/components/ui/Toast';
import { SourceCard } from '../../src/components/SourceCard';
import { Modal } from '../../src/components/ui/Modal';
import { CitationFormatter } from '../../src/components/CitationFormatter';
import { OriginTrail } from '../../src/components/OriginTrail';

type Tab = 'sources' | 'timeline' | 'share';
type SourceType = 'all' | 'ai-conversation' | 'webpage' | 'video' | 'academic' | 'pdf' | 'document';

function SidepanelContent() {
  const [activeTab, setActiveTab] = useState<Tab>('sources');
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<SourceType>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [timelineSelectedId, setTimelineSelectedId] = useState<string | undefined>();
  const { addToast } = useToast();

  const sources = useLiveQuery(
    () => db.sources.orderBy('createdAt').reverse().toArray()
  );

  // Filter sources based on search and type
  const filteredSources = useMemo(() => {
    if (!sources) return [];

    return sources.filter(source => {
      // Type filter
      if (filterType !== 'all' && source.sourceType !== filterType) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = source.metadata.title?.toLowerCase().includes(query);
        const matchesUrl = source.metadata.URL?.toLowerCase().includes(query);
        const matchesPlatform = source.platform?.toLowerCase().includes(query);
        const matchesTags = source.tags?.some(tag => tag.toLowerCase().includes(query));

        if (!matchesTitle && !matchesUrl && !matchesPlatform && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [sources, searchQuery, filterType]);

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
    setSelectedSourceIds(new Set(filteredSources.map(s => s.id!)));
  };

  const clearSelection = () => {
    setSelectedSourceIds(new Set());
  };

  const handleDelete = async (id: string) => {
    try {
      await db.sources.delete(id);
      selectedSourceIds.delete(id);
      setSelectedSourceIds(new Set(selectedSourceIds));
      addToast('success', 'Source deleted');
      setDeleteConfirmId(null);
    } catch (err) {
      addToast('error', 'Failed to delete source');
      console.error('Delete error:', err);
    }
  };

  const sourceToDelete = deleteConfirmId
    ? sources?.find(s => s.id === deleteConfirmId)
    : null;

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
          <div className="w-1/2 border-r overflow-y-auto flex flex-col">
            {/* Search and Filter */}
            <div className="p-4 border-b space-y-3">
              <Input
                label="Search"
                placeholder="Search sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex gap-2">
                <Select
                  label="Filter by type"
                  value={filterType}
                  onChange={(value) => setFilterType(value as SourceType)}
                  options={[
                    { id: 'all', name: 'All Types' },
                    { id: 'ai-conversation', name: 'AI Conversations' },
                    { id: 'webpage', name: 'Web Pages' },
                    { id: 'video', name: 'Videos' },
                    { id: 'academic', name: 'Academic' },
                    { id: 'pdf', name: 'PDFs' },
                    { id: 'document', name: 'Documents' }
                  ]}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Source List Header */}
            <div className="flex justify-between items-center p-4 pb-2">
              <h2 className="font-medium text-neutral-800">
                {filteredSources.length === sources?.length
                  ? `All Sources (${sources?.length || 0})`
                  : `Showing ${filteredSources.length} of ${sources?.length || 0}`}
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

            {/* Source List */}
            <div className="flex-1 overflow-y-auto p-4 pt-2">
              <div className="space-y-2" role="listbox" aria-multiselectable="true">
                {filteredSources.map(source => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    isSelected={selectedSourceIds.has(source.id!)}
                    onClick={() => toggleSourceSelection(source.id!)}
                    onDelete={() => setDeleteConfirmId(source.id!)}
                    showThumbnail
                  />
                ))}
              </div>

              {filteredSources.length === 0 && (
                <p className="text-neutral-500 italic text-center py-8">
                  {sources?.length === 0
                    ? 'No sources captured yet.'
                    : 'No sources match your search.'}
                </p>
              )}
            </div>
          </div>

          {/* Citation Panel */}
          <div className="w-1/2 overflow-hidden flex flex-col">
            <CitationFormatter
              sources={sources?.filter(s => selectedSourceIds.has(s.id!)) || []}
            />
          </div>
        </div>

        {/* Timeline Panel */}
        <div
          id="timeline-panel"
          role="tabpanel"
          aria-labelledby="timeline-tab"
          hidden={activeTab !== 'timeline'}
          className="flex-1 p-4 overflow-hidden flex flex-col"
        >
          <h2 className="font-medium text-neutral-800 mb-4">
            Research Journey
          </h2>
          <div className="flex-1 min-h-0">
            <OriginTrail
              sources={sources || []}
              selectedSourceId={timelineSelectedId}
              onSourceSelect={(id) => {
                setTimelineSelectedId(id);
                // Also add to selection for citation generation
                setSelectedSourceIds(new Set([id]));
              }}
            />
          </div>
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
            Coming in Phase 7: Generate shareable links to your research process.
          </p>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Source"
      >
        <p className="text-neutral-600 mb-4">
          Are you sure you want to delete "{sourceToDelete?.metadata.title}"?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <SidepanelContent />
    </ToastProvider>
  );
}

export default App;
