import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { SourceGroup } from '../types/source';

interface GroupWithCount extends SourceGroup {
  sourceCount: number;
}

interface GroupListProps {
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onManageGroups: () => void;
  showDeleted?: boolean;
  onToggleDeleted?: () => void;
}

/**
 * Sidebar component showing all groups with source counts.
 * Allows filtering the source list by clicking on a group.
 */
export function GroupList({
  selectedGroupId,
  onSelectGroup,
  onManageGroups,
  showDeleted = false,
  onToggleDeleted
}: GroupListProps) {
  // Get all groups with their source counts
  const groupsWithCounts = useLiveQuery(async () => {
    const groups = await db.groups.orderBy('name').toArray();
    const countsPromises = groups.map(async (group) => {
      const count = await db.sources
        .where('groupIds')
        .equals(group.id!)
        .and(s => !s.isDeleted)
        .count();
      return { ...group, sourceCount: count };
    });
    return Promise.all(countsPromises);
  }, []) as GroupWithCount[] | undefined;

  // Count all active sources
  const totalActiveCount = useLiveQuery(
    () => db.sources.filter(s => !s.isDeleted).count(),
    []
  );

  // Count ungrouped sources
  const ungroupedCount = useLiveQuery(
    () => db.sources
      .filter(s => !s.isDeleted && (!s.groupIds || s.groupIds.length === 0))
      .count(),
    []
  );

  // Count deleted sources
  const deletedCount = useLiveQuery(
    () => db.sources.filter(s => s.isDeleted === true).count(),
    []
  );

  const handleKeyDown = (e: React.KeyboardEvent, groupId: string | null) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectGroup(groupId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50 border-r border-neutral-200">
      {/* Header */}
      <div className="p-3 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-700">Groups</h3>
          <button
            onClick={onManageGroups}
            className="text-xs text-primary-600 hover:text-primary-700 focus:outline-none focus:underline"
            aria-label="Manage groups"
          >
            Manage
          </button>
        </div>
      </div>

      {/* Group List */}
      <nav className="flex-1 overflow-y-auto p-2" aria-label="Source groups">
        <ul className="space-y-1" role="listbox" aria-label="Filter by group">
          {/* All Sources */}
          <li>
            <button
              onClick={() => onSelectGroup(null)}
              onKeyDown={(e) => handleKeyDown(e, null)}
              role="option"
              aria-selected={selectedGroupId === null && !showDeleted}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                selectedGroupId === null && !showDeleted
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                All Sources
              </span>
              <span className="text-xs text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded-full">
                {totalActiveCount ?? 0}
              </span>
            </button>
          </li>

          {/* Ungrouped */}
          <li>
            <button
              onClick={() => onSelectGroup('ungrouped')}
              onKeyDown={(e) => handleKeyDown(e, 'ungrouped')}
              role="option"
              aria-selected={selectedGroupId === 'ungrouped'}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                selectedGroupId === 'ungrouped'
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                Ungrouped
              </span>
              <span className="text-xs text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded-full">
                {ungroupedCount ?? 0}
              </span>
            </button>
          </li>

          {/* Divider */}
          {groupsWithCounts && groupsWithCounts.length > 0 && (
            <li className="py-2">
              <div className="border-t border-neutral-200" />
            </li>
          )}

          {/* Individual Groups */}
          {groupsWithCounts?.map(group => (
            <li key={group.id}>
              <button
                onClick={() => onSelectGroup(group.id!)}
                onKeyDown={(e) => handleKeyDown(e, group.id!)}
                role="option"
                aria-selected={selectedGroupId === group.id}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedGroupId === group.id
                    ? 'bg-primary-100 text-primary-800'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color || '#3b82f6' }}
                  />
                  <span className="truncate">{group.name}</span>
                </span>
                <span className="text-xs text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2">
                  {group.sourceCount}
                </span>
              </button>
            </li>
          ))}

          {/* Deleted Sources (optional) */}
          {onToggleDeleted && (deletedCount ?? 0) > 0 && (
            <>
              <li className="py-2">
                <div className="border-t border-neutral-200" />
              </li>
              <li>
                <button
                  onClick={onToggleDeleted}
                  role="option"
                  aria-selected={showDeleted}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                    showDeleted
                      ? 'bg-red-100 text-red-800'
                      : 'text-neutral-500 hover:bg-neutral-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Deleted
                  </span>
                  <span className="text-xs text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded-full">
                    {deletedCount ?? 0}
                  </span>
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </div>
  );
}
