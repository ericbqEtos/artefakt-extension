import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import type { SourceCapture, SourceGroup } from '../types/source';
import { formatDistanceToNow } from 'date-fns';
import { db } from '../lib/db';
import { GroupBadge } from './ui/GroupBadge';
import { GroupSelector } from './GroupSelector';
import { removeSourceFromGroup } from '../lib/db/groups';

interface SourceCardProps {
  source: SourceCapture;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onAddToGroup?: () => void;
  showThumbnail?: boolean;
  compact?: boolean;
  showGroups?: boolean;
  currentGroupId?: string | null;
}

export function SourceCard({
  source,
  isSelected = false,
  onClick,
  onDelete,
  onAddToGroup,
  showThumbnail = true,
  compact = false,
  showGroups = true,
  currentGroupId = null
}: SourceCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState<{ top: number; left: number } | null>(null);
  const groupButtonRef = useRef<HTMLButtonElement>(null);
  const groupSelectorRef = useRef<HTMLDivElement>(null);

  // Fetch groups for this source
  const sourceGroups = useLiveQuery(async () => {
    if (!source.groupIds || source.groupIds.length === 0) return [];
    return db.groups.where('id').anyOf(source.groupIds).toArray();
  }, [source.groupIds]) as SourceGroup[] | undefined;

  // Create object URL for thumbnail
  useEffect(() => {
    if (source.screenshot?.thumbnail && showThumbnail) {
      const url = URL.createObjectURL(source.screenshot.thumbnail);
      setThumbnailUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [source.screenshot?.thumbnail, showThumbnail]);

  // Close group selector when clicking outside
  useEffect(() => {
    if (!showGroupSelector) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check if click is outside both the selector and the trigger button
      const isOutsideSelector = groupSelectorRef.current && !groupSelectorRef.current.contains(target);
      const isOutsideButton = groupButtonRef.current && !groupButtonRef.current.contains(target);

      if (isOutsideSelector && isOutsideButton) {
        setShowGroupSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGroupSelector]);

  const handleRemoveFromGroup = async (groupId: string) => {
    if (!source.id) return;
    await removeSourceFromGroup(source.id, groupId);
  };

  const handleToggleGroupSelector = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showGroupSelector && groupButtonRef.current) {
      const rect = groupButtonRef.current.getBoundingClientRect();
      setSelectorPosition({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 256), // 256px is the selector width, ensure it doesn't go off-screen
      });
    }
    setShowGroupSelector(!showGroupSelector);
  };

  // Format the capture time
  const captureTime = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(source.createdAt), { addSuffix: true });
    } catch {
      return '';
    }
  }, [source.createdAt]);

  // Get source type badge color
  const sourceTypeBadge = useMemo(() => {
    const types: Record<string, { bg: string; text: string; label: string }> = {
      'ai-conversation': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'AI' },
      'webpage': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Web' },
      'video': { bg: 'bg-red-100', text: 'text-red-800', label: 'Video' },
      'academic': { bg: 'bg-green-100', text: 'text-green-800', label: 'Academic' },
      'pdf': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'PDF' },
      'document': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Doc' },
      'spreadsheet': { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Sheet' },
      'presentation': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Slides' },
      'image': { bg: 'bg-pink-100', text: 'text-pink-800', label: 'Image' },
      'podcast': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Podcast' }
    };
    return types[source.sourceType] || { bg: 'bg-neutral-100', text: 'text-neutral-800', label: source.sourceType };
  }, [source.sourceType]);

  // Get platform display name
  const platformName = useMemo(() => {
    if (source.platform) {
      return source.platform.charAt(0).toUpperCase() + source.platform.slice(1);
    }
    try {
      return new URL(source.metadata.URL).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }, [source.platform, source.metadata.URL]);

  if (compact) {
    return (
      <div
        role="option"
        aria-selected={isSelected}
        onClick={onClick}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onClick) {
            e.preventDefault();
            onClick();
          }
        }}
        tabIndex={0}
        className={`
          p-2 rounded border cursor-pointer transition-all
          focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1
          ${isSelected
            ? 'border-primary-600 bg-primary-50'
            : 'border-neutral-200 hover:bg-neutral-50'}
        `}
      >
        <p className="text-sm font-medium text-neutral-900 truncate">
          {source.metadata.title}
        </p>
        <p className="text-xs text-neutral-500 truncate">
          {source.metadata.URL}
        </p>
      </div>
    );
  }

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
        if (e.key === 'Delete' && onDelete) {
          e.preventDefault();
          onDelete();
        }
      }}
      tabIndex={0}
      className={`
        group relative rounded-lg border overflow-hidden cursor-pointer transition-all
        focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2
        ${isSelected
          ? 'border-primary-600 bg-primary-50 shadow-md'
          : 'border-neutral-200 hover:bg-neutral-50 hover:shadow-sm'}
      `}
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        {showThumbnail && (
          <div className="flex-shrink-0 w-20 h-14 bg-neutral-100 rounded overflow-hidden">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 truncate">
            {source.metadata.title}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <span className={`
              inline-flex items-center text-xs px-1.5 py-0.5 rounded-full
              ${sourceTypeBadge.bg} ${sourceTypeBadge.text}
            `}>
              {sourceTypeBadge.label}
            </span>
            {platformName && (
              <span className="text-xs text-neutral-500">
                {platformName}
              </span>
            )}
          </div>

          {/* AI Model info */}
          {source.aiMetadata?.modelVersion && (
            <p className="text-xs text-purple-600 mt-1 truncate">
              {source.aiMetadata.modelVersion}
            </p>
          )}

          {/* Capture time */}
          <p className="text-xs text-neutral-400 mt-1">
            {captureTime}
          </p>
        </div>

        {/* Action buttons (on hover) */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all">
          {/* Add to group button */}
          <button
            ref={groupButtonRef}
            onClick={handleToggleGroupSelector}
            className="p-1 rounded bg-white/80 hover:bg-primary-50 text-neutral-400 hover:text-primary-600 transition-all"
            aria-label={`Add ${source.metadata.title} to group`}
            aria-expanded={showGroupSelector}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </button>

          {/* Delete button */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded bg-white/80 hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-all"
              aria-label={`Delete ${source.metadata.title}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Groups */}
      {showGroups && sourceGroups && sourceGroups.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {sourceGroups.map(group => (
            <GroupBadge
              key={group.id}
              group={group}
              size="sm"
              onRemove={currentGroupId === group.id ? () => handleRemoveFromGroup(group.id!) : undefined}
            />
          ))}
        </div>
      )}

      {/* Tags */}
      {source.tags && source.tags.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {source.tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* User notes preview */}
      {source.userNotes && (
        <div className="px-3 pb-2">
          <p className="text-xs text-neutral-500 italic line-clamp-2">
            {source.userNotes}
          </p>
        </div>
      )}

      {/* Group selector popover - rendered via portal to escape overflow:hidden containers */}
      {showGroupSelector && selectorPosition && createPortal(
        <div
          ref={groupSelectorRef}
          className="fixed z-[9999]"
          style={{
            top: selectorPosition.top,
            left: selectorPosition.left,
          }}
        >
          <GroupSelector
            sourceIds={[source.id!]}
            currentGroupIds={source.groupIds || []}
            onClose={() => setShowGroupSelector(false)}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
