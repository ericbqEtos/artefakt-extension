import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../src/lib/db';
import { softDeleteSource, permanentlyDeleteSource, restoreSource } from '../../src/lib/db/sources';
import { addSourcesToGroup, removeSourceFromGroup } from '../../src/lib/db/groups';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Select } from '../../src/components/ui/Select';
import { ToastProvider, useToast } from '../../src/components/ui/Toast';
import { SourceCard } from '../../src/components/SourceCard';
import { Modal } from '../../src/components/ui/Modal';
import { CitationFormatter } from '../../src/components/CitationFormatter';
import { OriginTrail } from '../../src/components/OriginTrail';
import { GroupList } from '../../src/components/GroupList';
import { GroupManager } from '../../src/components/GroupManager';
import { GroupSelector } from '../../src/components/GroupSelector';

type Tab = 'sources' | 'timeline' | 'share';
type SourceType = 'all' | 'ai-conversation' | 'webpage' | 'video' | 'academic' | 'pdf' | 'document';
type DeleteAction = 'soft' | 'permanent' | 'remove-from-group';

function SidepanelContent() {
  const [activeTab, setActiveTab] = useState<Tab>('sources');
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<SourceType>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [timelineSelectedId, setTimelineSelectedId] = useState<string | undefined>();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [showBulkGroupSelector, setShowBulkGroupSelector] = useState(false);
  const [groupSidebarCollapsed, setGroupSidebarCollapsed] = useState(false);
  const { addToast } = useToast();

  // Fetch all sources (including deleted for origin trail)
  const allSources = useLiveQuery(
    () => db.sources.orderBy('createdAt').reverse().toArray()
  );

  // Active sources only (excludes deleted)
  const sources = useMemo(() => {
    if (!allSources) return [];
    return allSources.filter(s => !s.isDeleted);
  }, [allSources]);

  // Deleted sources
  const deletedSources = useMemo(() => {
    if (!allSources) return [];
    return allSources.filter(s => s.isDeleted);
  }, [allSources]);

  // Filter sources based on search, type, and group
  const filteredSources = useMemo(() => {
    // If showing deleted, return deleted sources with search/type filter only
    if (showDeleted) {
      return deletedSources.filter(source => {
        if (filterType !== 'all' && source.sourceType !== filterType) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = source.metadata.title?.toLowerCase().includes(query);
          const matchesUrl = source.metadata.URL?.toLowerCase().includes(query);
          const matchesPlatform = source.platform?.toLowerCase().includes(query);
          if (!matchesTitle && !matchesUrl && !matchesPlatform) return false;
        }
        return true;
      });
    }

    if (!sources) return [];

    return sources.filter(source => {
      // Group filter
      if (selectedGroupId === 'ungrouped') {
        if (source.groupIds && source.groupIds.length > 0) return false;
      } else if (selectedGroupId) {
        if (!source.groupIds || !source.groupIds.includes(selectedGroupId)) return false;
      }

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
  }, [sources, deletedSources, searchQuery, filterType, selectedGroupId, showDeleted]);

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

  const handleSoftDelete = async (id: string) => {
    try {
      await softDeleteSource(id);
      selectedSourceIds.delete(id);
      setSelectedSourceIds(new Set(selectedSourceIds));
      addToast('success', 'Source moved to deleted (still visible in Origin Trail)');
      setDeleteConfirmId(null);
    } catch (err) {
      addToast('error', 'Failed to delete source');
      console.error('Delete error:', err);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await permanentlyDeleteSource(id);
      selectedSourceIds.delete(id);
      setSelectedSourceIds(new Set(selectedSourceIds));
      addToast('success', 'Source permanently deleted');
      setDeleteConfirmId(null);
    } catch (err) {
      addToast('error', 'Failed to permanently delete source');
      console.error('Delete error:', err);
    }
  };

  const handleRemoveFromGroup = async (sourceId: string, groupId: string) => {
    try {
      await removeSourceFromGroup(sourceId, groupId);
      addToast('success', 'Source removed from group');
      setDeleteConfirmId(null);
    } catch (err) {
      addToast('error', 'Failed to remove source from group');
      console.error('Remove from group error:', err);
    }
  };

  const handleRestoreSource = async (id: string) => {
    try {
      await restoreSource(id);
      addToast('success', 'Source restored');
    } catch (err) {
      addToast('error', 'Failed to restore source');
      console.error('Restore error:', err);
    }
  };

  const handleSelectGroup = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    setShowDeleted(false);
    clearSelection();
  };

  const handleToggleDeleted = () => {
    setShowDeleted(!showDeleted);
    setSelectedGroupId(null);
    clearSelection();
  };

  const sourceToDelete = deleteConfirmId
    ? allSources?.find(s => s.id === deleteConfirmId)
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
          {/* Group Sidebar */}
          <div className={`${groupSidebarCollapsed ? 'w-10' : 'w-48'} flex-shrink-0 transition-all duration-200`}>
            {groupSidebarCollapsed ? (
              <div className="h-full bg-neutral-50 border-r border-neutral-200 flex flex-col items-center py-2">
                <button
                  onClick={() => setGroupSidebarCollapsed(false)}
                  className="p-2 text-neutral-600 hover:bg-neutral-100 rounded"
                  aria-label="Expand groups sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-end p-1 border-b border-neutral-200 bg-neutral-50">
                  <button
                    onClick={() => setGroupSidebarCollapsed(true)}
                    className="p-1 text-neutral-400 hover:text-neutral-600 rounded"
                    aria-label="Collapse groups sidebar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
                <GroupList
                  selectedGroupId={selectedGroupId}
                  onSelectGroup={handleSelectGroup}
                  onManageGroups={() => setShowGroupManager(true)}
                  showDeleted={showDeleted}
                  onToggleDeleted={handleToggleDeleted}
                />
              </div>
            )}
          </div>

          {/* Source List */}
          <div className="flex-1 border-r overflow-y-auto flex flex-col min-w-0">
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
                {showDeleted ? (
                  `Deleted Sources (${filteredSources.length})`
                ) : selectedGroupId ? (
                  `Showing ${filteredSources.length} sources`
                ) : filteredSources.length === sources?.length ? (
                  `All Sources (${sources?.length || 0})`
                ) : (
                  `Showing ${filteredSources.length} of ${sources?.length || 0}`
                )}
              </h2>
              <div className="flex gap-2">
                {selectedSourceIds.size > 0 && !showDeleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBulkGroupSelector(true)}
                  >
                    Add to Group
                  </Button>
                )}
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
                  <div key={source.id} className="relative">
                    <SourceCard
                      source={source}
                      isSelected={selectedSourceIds.has(source.id!)}
                      onClick={() => toggleSourceSelection(source.id!)}
                      onDelete={() => setDeleteConfirmId(source.id!)}
                      showThumbnail
                      showGroups={!showDeleted}
                      currentGroupId={selectedGroupId}
                    />
                    {/* Restore button for deleted sources */}
                    {showDeleted && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreSource(source.id!);
                        }}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {filteredSources.length === 0 && (
                <p className="text-neutral-500 italic text-center py-8">
                  {showDeleted
                    ? 'No deleted sources.'
                    : sources?.length === 0
                      ? 'No sources captured yet.'
                      : 'No sources match your filters.'}
                </p>
              )}
            </div>
          </div>

          {/* Citation Panel */}
          <div className="w-1/3 overflow-hidden flex flex-col min-w-0">
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
        isOpen={deleteConfirmId !== null && !sourceToDelete?.isDeleted}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Source"
      >
        <p className="text-neutral-600 mb-4">
          What would you like to do with "{sourceToDelete?.metadata.title}"?
        </p>

        <div className="space-y-3">
          {/* Remove from current group option (only if viewing a specific group) */}
          {selectedGroupId && selectedGroupId !== 'ungrouped' && (
            <button
              onClick={() => deleteConfirmId && handleRemoveFromGroup(deleteConfirmId, selectedGroupId)}
              className="w-full p-3 text-left border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <div className="font-medium text-neutral-900">Remove from this group</div>
              <div className="text-sm text-neutral-500">
                The source will remain in your library and other groups.
              </div>
            </button>
          )}

          {/* Soft delete option */}
          <button
            onClick={() => deleteConfirmId && handleSoftDelete(deleteConfirmId)}
            className="w-full p-3 text-left border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
          >
            <div className="font-medium text-amber-900">Delete source</div>
            <div className="text-sm text-amber-700">
              Removes from all groups but keeps in Origin Trail for provenance tracking.
            </div>
          </button>

          {/* Permanent delete option */}
          <button
            onClick={() => deleteConfirmId && handlePermanentDelete(deleteConfirmId)}
            className="w-full p-3 text-left border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <div className="font-medium text-red-900">Permanently delete</div>
            <div className="text-sm text-red-700">
              Completely removes the source. This cannot be undone.
            </div>
          </button>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Permanent Delete Confirmation for already-deleted sources */}
      <Modal
        isOpen={deleteConfirmId !== null && sourceToDelete?.isDeleted === true}
        onClose={() => setDeleteConfirmId(null)}
        title="Permanently Delete Source"
      >
        <p className="text-neutral-600 mb-4">
          Are you sure you want to permanently delete "{sourceToDelete?.metadata.title}"?
          This will remove it from the Origin Trail and cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => deleteConfirmId && handlePermanentDelete(deleteConfirmId)}
          >
            Permanently Delete
          </Button>
        </div>
      </Modal>

      {/* Group Manager Modal */}
      <GroupManager
        isOpen={showGroupManager}
        onClose={() => setShowGroupManager(false)}
      />

      {/* Bulk Group Selector Modal */}
      <Modal
        isOpen={showBulkGroupSelector}
        onClose={() => setShowBulkGroupSelector(false)}
        title="Add Sources to Group"
      >
        <GroupSelector
          sourceIds={Array.from(selectedSourceIds)}
          currentGroupIds={[]}
          onClose={() => setShowBulkGroupSelector(false)}
          onGroupsChanged={() => {
            setShowBulkGroupSelector(false);
            addToast('success', `Added ${selectedSourceIds.size} sources to group`);
          }}
        />
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
