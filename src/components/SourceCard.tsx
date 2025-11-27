import { useState, useEffect, useMemo } from 'react';
import type { SourceCapture } from '../types/source';
import { formatDistanceToNow } from 'date-fns';

interface SourceCardProps {
  source: SourceCapture;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  showThumbnail?: boolean;
  compact?: boolean;
}

export function SourceCard({
  source,
  isSelected = false,
  onClick,
  onDelete,
  showThumbnail = true,
  compact = false
}: SourceCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  // Create object URL for thumbnail
  useEffect(() => {
    if (source.screenshot?.thumbnail && showThumbnail) {
      const url = URL.createObjectURL(source.screenshot.thumbnail);
      setThumbnailUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [source.screenshot?.thumbnail, showThumbnail]);

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

        {/* Delete button (on hover) */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="
              absolute top-2 right-2 p-1 rounded
              opacity-0 group-hover:opacity-100 focus:opacity-100
              bg-white/80 hover:bg-red-50 text-neutral-400 hover:text-red-600
              transition-all
            "
            aria-label={`Delete ${source.metadata.title}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

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
    </div>
  );
}
