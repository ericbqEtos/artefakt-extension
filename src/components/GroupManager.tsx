import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { createGroup, updateGroup, deleteGroup, GROUP_COLORS } from '../lib/db/groups';
import type { SourceGroup } from '../types/source';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface GroupManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroupWithCount extends SourceGroup {
  sourceCount: number;
}

/**
 * Modal for managing all groups - create, rename, change color, delete
 */
export function GroupManager({ isOpen, onClose }: GroupManagerProps) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleStartEdit = (group: SourceGroup) => {
    setEditingGroupId(group.id!);
    setEditName(group.name);
    setEditColor(group.color || GROUP_COLORS[0]);
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingGroupId || !editName.trim()) {
      setError('Group name is required');
      return;
    }

    try {
      await updateGroup(editingGroupId, {
        name: editName.trim(),
        color: editColor
      });
      setEditingGroupId(null);
      setError(null);
    } catch (err) {
      setError('Failed to update group');
    }
  };

  const handleCancelEdit = () => {
    setEditingGroupId(null);
    setEditName('');
    setEditColor('');
    setError(null);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setError('Group name is required');
      return;
    }

    try {
      await createGroup(newGroupName.trim(), undefined, newGroupColor);
      setNewGroupName('');
      setNewGroupColor(GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]);
      setIsCreating(false);
      setError(null);
    } catch (err) {
      setError('Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      setDeleteConfirmId(null);
    } catch (err) {
      setError('Failed to delete group');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    } else if (e.key === 'Escape') {
      if (editingGroupId) {
        handleCancelEdit();
      } else if (isCreating) {
        setIsCreating(false);
        setNewGroupName('');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Groups">
      <div className="space-y-4">
        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Group List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {groupsWithCounts?.map(group => (
            <div key={group.id}>
              {editingGroupId === group.id ? (
                // Edit mode
                <div className="p-3 bg-neutral-50 rounded-md space-y-3">
                  <Input
                    label="Group Name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                    autoFocus
                  />
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {GROUP_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setEditColor(color)}
                          className={`w-6 h-6 rounded-full transition-transform ${
                            editColor === color ? 'ring-2 ring-offset-1 ring-primary-600 scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="flex items-center justify-between p-2 rounded-md hover:bg-neutral-50 group">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: group.color || '#3b82f6' }}
                    />
                    <span className="text-sm text-neutral-900 truncate">{group.name}</span>
                    <span className="text-xs text-neutral-500">
                      ({group.sourceCount} {group.sourceCount === 1 ? 'source' : 'sources'})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(group)}
                      className="p-1 text-neutral-500 hover:text-neutral-700 rounded"
                      aria-label={`Edit group: ${group.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(group.id!)}
                      className="p-1 text-neutral-500 hover:text-red-600 rounded"
                      aria-label={`Delete group: ${group.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {(!groupsWithCounts || groupsWithCounts.length === 0) && !isCreating && (
            <p className="text-sm text-neutral-500 text-center py-4">
              No groups yet. Create one to organize your sources.
            </p>
          )}
        </div>

        {/* Create New Group */}
        {isCreating ? (
          <div className="p-3 bg-primary-50 rounded-md space-y-3">
            <Input
              label="New Group Name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleCreateGroup)}
              placeholder="e.g., History Essay, Project Alpha"
              autoFocus
            />
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Color
              </label>
              <div className="flex flex-wrap gap-1">
                {GROUP_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewGroupColor(color)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      newGroupColor === color ? 'ring-2 ring-offset-1 ring-primary-600 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
                Create Group
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setIsCreating(false);
                setNewGroupName('');
              }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setIsCreating(true)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Group
          </Button>
        )}

        {/* Delete Confirmation */}
        {deleteConfirmId && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 mb-3">
              Are you sure you want to delete this group? Sources in this group will remain but will be ungrouped.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => handleDeleteGroup(deleteConfirmId)}
              >
                Delete Group
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
