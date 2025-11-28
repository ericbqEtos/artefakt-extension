import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { createGroup, addSourceToGroup, addSourcesToGroup, removeSourceFromGroup } from '../lib/db/groups';
import type { SourceGroup } from '../types/source';
import { GROUP_COLORS } from '../lib/db/groups';
import { Button } from './ui/Button';

interface GroupSelectorProps {
  sourceIds: string[];
  currentGroupIds?: string[];
  onClose?: () => void;
  onGroupsChanged?: () => void;
}

/**
 * A dropdown/popover component for assigning sources to groups.
 * Supports both single and multi-source selection.
 */
export function GroupSelector({
  sourceIds,
  currentGroupIds = [],
  onClose,
  onGroupsChanged
}: GroupSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState(GROUP_COLORS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const groups = useLiveQuery(() => db.groups.orderBy('name').toArray(), []);

  // Get the next unused color, or a random one if all are used
  const getNextUnusedColor = (): string => {
    if (!groups || groups.length === 0) return GROUP_COLORS[0];
    const usedColors = new Set(groups.map(g => g.color));
    const unusedColor = GROUP_COLORS.find(color => !usedColors.has(color));
    return unusedColor || GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
  };

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus create input when entering create mode and set unused color
  useEffect(() => {
    if (isCreating) {
      createInputRef.current?.focus();
      setSelectedColor(getNextUnusedColor());
    }
  }, [isCreating]);

  const filteredGroups = groups?.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const isGroupSelected = (groupId: string) => currentGroupIds.includes(groupId);

  const handleToggleGroup = async (group: SourceGroup) => {
    if (!group.id) return;

    if (isGroupSelected(group.id)) {
      // Remove from group
      for (const sourceId of sourceIds) {
        await removeSourceFromGroup(sourceId, group.id);
      }
    } else {
      // Add to group
      if (sourceIds.length === 1) {
        await addSourceToGroup(sourceIds[0], group.id);
      } else {
        await addSourcesToGroup(sourceIds, group.id);
      }
    }
    onGroupsChanged?.();
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    const group = await createGroup(newGroupName.trim(), undefined, selectedColor);

    // Automatically add sources to the new group
    if (group.id) {
      if (sourceIds.length === 1) {
        await addSourceToGroup(sourceIds[0], group.id);
      } else {
        await addSourcesToGroup(sourceIds, group.id);
      }
    }

    setNewGroupName('');
    setIsCreating(false);
    onGroupsChanged?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isCreating) {
        setIsCreating(false);
        setNewGroupName('');
      } else {
        onClose?.();
      }
    }
  };

  // Stop propagation for input fields to prevent parent handlers from intercepting
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    // Stop spacebar and other typing keys from bubbling up to parent (e.g., SourceCard selection)
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.stopPropagation();
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation first
    e.stopPropagation();

    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateGroup();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewGroupName('');
    }
  };

  // Stop all keyboard events from bubbling to prevent parent handlers
  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    // Always stop propagation to parent - the selector handles its own keyboard events
    e.stopPropagation();
    handleKeyDown(e);
  };

  return (
    <div
      className="bg-white rounded-lg shadow-lg border border-neutral-200 w-64 max-h-80 flex flex-col"
      onKeyDown={handleContainerKeyDown}
    >
      {/* Header */}
      <div className="p-3 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-neutral-900">
            {sourceIds.length === 1 ? 'Add to Group' : `Add ${sourceIds.length} sources to Group`}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Group List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredGroups.length === 0 && !isCreating && (
          <p className="text-sm text-neutral-500 text-center py-4">
            {searchQuery ? 'No groups match your search' : 'No groups yet'}
          </p>
        )}

        {filteredGroups.map(group => (
          <button
            key={group.id}
            onClick={() => handleToggleGroup(group)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 transition-colors text-left"
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: group.color || '#3b82f6' }}
            />
            <span className="flex-1 text-sm text-neutral-700 truncate">
              {group.name}
            </span>
            {isGroupSelected(group.id!) && (
              <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}

        {/* Create New Group Form */}
        {isCreating && (
          <div className="mt-2 p-2 bg-neutral-50 rounded-md">
            <input
              ref={createInputRef}
              type="text"
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={handleCreateKeyDown}
              className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 mb-2"
            />
            <div className="flex flex-wrap gap-1 mb-2">
              {GROUP_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    selectedColor === color ? 'ring-2 ring-offset-1 ring-primary-600 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCreating(false);
                  setNewGroupName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Create New Group Button */}
      {!isCreating && (
        <div className="p-2 border-t border-neutral-200">
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Group
          </button>
        </div>
      )}
    </div>
  );
}
