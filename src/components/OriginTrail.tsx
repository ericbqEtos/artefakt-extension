import { useEffect, useRef, useCallback, useState } from 'react';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import type { TimelineOptions, TimelineItem, IdType } from 'vis-timeline/types';
import type { SourceCapture } from '../types/source';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface OriginTrailProps {
  sources: SourceCapture[];
  selectedSourceId?: string;
  onSourceSelect?: (sourceId: string) => void;
}

// Source type color mapping
const SOURCE_TYPE_COLORS: Record<string, { background: string; border: string; text: string; label: string }> = {
  'ai-conversation': { background: '#ede9fe', border: '#8b5cf6', text: '#6d28d9', label: 'AI' },
  'webpage': { background: '#dbeafe', border: '#3b82f6', text: '#1d4ed8', label: 'Web' },
  'academic': { background: '#dcfce7', border: '#22c55e', text: '#15803d', label: 'Academic' },
  'pdf': { background: '#dcfce7', border: '#22c55e', text: '#15803d', label: 'PDF' },
  'video': { background: '#fee2e2', border: '#ef4444', text: '#b91c1c', label: 'Video' },
  'podcast': { background: '#ffedd5', border: '#f97316', text: '#c2410c', label: 'Podcast' },
  'document': { background: '#f3f4f6', border: '#6b7280', text: '#374151', label: 'Doc' },
};

// Get source type info
function getSourceTypeInfo(type: string) {
  return SOURCE_TYPE_COLORS[type] || SOURCE_TYPE_COLORS['webpage'];
}

// Convert source to timeline item
function sourceToTimelineItem(source: SourceCapture, thumbnailUrl?: string): TimelineItem {
  const colors = getSourceTypeInfo(source.sourceType);
  const platformLabel = source.platform || colors.label;
  const isDeleted = source.isDeleted === true;

  // Create content with optional thumbnail and deleted indicator
  let content = `
    <div class="timeline-item ${isDeleted ? 'timeline-item-deleted' : ''}">
      ${thumbnailUrl ? `<img src="${thumbnailUrl}" class="timeline-thumb ${isDeleted ? 'opacity-50' : ''}" alt="" />` : ''}
      <div class="timeline-content">
        <span class="timeline-title ${isDeleted ? 'line-through opacity-60' : ''}" title="${source.metadata.title}">${source.metadata.title}</span>
        <span class="timeline-platform">${platformLabel}${isDeleted ? ' (Deleted)' : ''}</span>
      </div>
    </div>
  `;

  // Deleted sources get muted styling
  const bgColor = isDeleted ? '#f5f5f5' : colors.background;
  const borderColor = isDeleted ? '#d4d4d4' : colors.border;
  const textColor = isDeleted ? '#737373' : colors.text;

  return {
    id: source.id!,
    content,
    start: new Date(source.createdAt),
    className: `source-${source.sourceType} ${isDeleted ? 'source-deleted' : ''}`,
    style: `background-color: ${bgColor}; border-color: ${borderColor}; color: ${textColor}; ${isDeleted ? 'opacity: 0.7;' : ''}`,
    title: `${source.metadata.title}${isDeleted ? ' (Deleted)' : ''}\n${format(new Date(source.createdAt), 'PPpp')}`,
  };
}

// Group sources by session
interface SessionGroup {
  sessionId: string;
  sources: SourceCapture[];
  startTime: Date;
  endTime: Date;
}

function groupSourcesBySession(sources: SourceCapture[]): SessionGroup[] {
  const sessionMap = new Map<string, SourceCapture[]>();

  sources.forEach(source => {
    const sessionId = source.provenance?.sessionId || 'default';
    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, []);
    }
    sessionMap.get(sessionId)!.push(source);
  });

  const groups: SessionGroup[] = [];
  sessionMap.forEach((sessionSources, sessionId) => {
    const sorted = sessionSources.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    groups.push({
      sessionId,
      sources: sorted,
      startTime: new Date(sorted[0].createdAt),
      endTime: new Date(sorted[sorted.length - 1].createdAt),
    });
  });

  return groups.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

// Detail Panel Component for showing full source info
function SourceDetailPanel({
  source,
  thumbnailUrl,
  fullImageUrl,
  onViewFullImage,
  onClose
}: {
  source: SourceCapture;
  thumbnailUrl?: string;
  fullImageUrl?: string;
  onViewFullImage: () => void;
  onClose: () => void;
}) {
  const typeInfo = getSourceTypeInfo(source.sourceType);

  const isDeleted = source.isDeleted === true;

  return (
    <div className={`bg-white border rounded-lg shadow-lg overflow-hidden ${isDeleted ? 'border-neutral-300' : ''}`}>
      {/* Deleted Banner */}
      {isDeleted && (
        <div className="bg-neutral-100 border-b border-neutral-200 px-4 py-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-sm text-neutral-600">
            This source was deleted but kept for provenance tracking
          </span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${isDeleted ? 'opacity-60' : ''}`}
              style={{ backgroundColor: typeInfo.background, color: typeInfo.text, border: `1px solid ${typeInfo.border}` }}
            >
              {source.platform || typeInfo.label}
            </span>
            <span className="text-xs text-neutral-500">
              {formatDistanceToNow(new Date(source.createdAt), { addSuffix: true })}
            </span>
          </div>
          <h3 className={`font-semibold line-clamp-2 ${isDeleted ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>
            {source.metadata.title}
          </h3>
          {source.metadata.URL && (
            <a
              href={source.metadata.URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-600 hover:underline truncate block mt-1"
            >
              {source.metadata.URL}
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600 rounded"
          aria-label="Close details"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Screenshot - use full image for header if available, fall back to thumbnail */}
      {(fullImageUrl || thumbnailUrl) && (
        <div className="relative group">
          <img
            src={fullImageUrl || thumbnailUrl}
            alt={`Screenshot of ${source.metadata.title}`}
            className="w-full h-48 object-cover cursor-pointer"
            onClick={onViewFullImage}
          />
          <div
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            onClick={onViewFullImage}
          >
            <span className="text-white text-sm font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              View Full Size
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        {/* AI Interaction Details */}
        {source.sourceType === 'ai-conversation' && source.aiMetadata && (
          <div className="space-y-3">
            {/* Model Info */}
            {(source.aiMetadata.modelName || source.aiMetadata.modelVersion) && (
              <div>
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                  AI Model
                </h4>
                <p className="text-sm text-neutral-800">
                  {source.aiMetadata.modelName}
                  {source.aiMetadata.modelVersion && (
                    <span className="text-neutral-500"> ({source.aiMetadata.modelVersion})</span>
                  )}
                </p>
              </div>
            )}

            {/* Prompt / Query */}
            {source.aiMetadata.promptText && (
              <div>
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                  Your Prompt
                </h4>
                <div className="bg-neutral-50 rounded-lg p-3 text-sm text-neutral-700 border-l-4 border-primary-400">
                  {source.aiMetadata.promptText.length > 300
                    ? source.aiMetadata.promptText.slice(0, 300) + '...'
                    : source.aiMetadata.promptText}
                </div>
              </div>
            )}

            {/* AI Response Excerpt */}
            {source.aiMetadata.responseExcerpt && (
              <div>
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                  AI Response
                </h4>
                <div className="bg-purple-50 rounded-lg p-3 text-sm text-neutral-700 border-l-4 border-purple-400">
                  {source.aiMetadata.responseExcerpt.length > 300
                    ? source.aiMetadata.responseExcerpt.slice(0, 300) + '...'
                    : source.aiMetadata.responseExcerpt}
                </div>
              </div>
            )}

            {/* Conversation Title */}
            {source.aiMetadata.conversationTitle && (
              <div>
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                  Conversation
                </h4>
                <p className="text-sm text-neutral-800">
                  {source.aiMetadata.conversationTitle}
                </p>
              </div>
            )}

            {/* NotebookLM Tool Context */}
            {source.aiMetadata.toolContext && (
              <div>
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                  Tool Used
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    {source.aiMetadata.toolContext.outputLabel}
                  </span>
                  {source.aiMetadata.toolContext.sourceCount && source.aiMetadata.toolContext.sourceCount > 0 && (
                    <span className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs">
                      Based on {source.aiMetadata.toolContext.sourceCount} source{source.aiMetadata.toolContext.sourceCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {source.aiMetadata.toolContext.sourceNames && source.aiMetadata.toolContext.sourceNames.length > 0 && (
                  <ul className="mt-2 text-xs text-neutral-600 list-disc list-inside">
                    {source.aiMetadata.toolContext.sourceNames.slice(0, 5).map((name, i) => (
                      <li key={i} className="truncate">{name}</li>
                    ))}
                    {source.aiMetadata.toolContext.sourceNames.length > 5 && (
                      <li className="text-neutral-500">
                        ...and {source.aiMetadata.toolContext.sourceNames.length - 5} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {/* Shareable URL */}
            {source.aiMetadata.shareableUrl && (
              <div>
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                  Shareable Link
                </h4>
                <a
                  href={source.aiMetadata.shareableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:underline break-all"
                >
                  {source.aiMetadata.shareableUrl}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Video Details */}
        {source.sourceType === 'video' && (
          <div className="space-y-3">
            {source.metadata['container-title'] && (
              <div>
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                  Platform
                </h4>
                <p className="text-sm text-neutral-800">{source.metadata['container-title']}</p>
              </div>
            )}
            {source.metadata.URL?.includes('t=') && (() => {
              // Extract timestamp from URL (supports t=123 or t=1h2m3s formats)
              const url = source.metadata.URL;
              let timestampDisplay = '';

              // Try t=seconds format
              const secondsMatch = url.match(/[?&]t=(\d+)/);
              if (secondsMatch) {
                const totalSeconds = parseInt(secondsMatch[1], 10);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                if (hours > 0) {
                  timestampDisplay = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                  timestampDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
              }

              // Try t=1h2m3s format
              const hmsMatch = url.match(/[?&]t=(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
              if (!secondsMatch && hmsMatch) {
                const hours = parseInt(hmsMatch[1] || '0', 10);
                const minutes = parseInt(hmsMatch[2] || '0', 10);
                const seconds = parseInt(hmsMatch[3] || '0', 10);

                if (hours > 0) {
                  timestampDisplay = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                  timestampDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
              }

              if (!timestampDisplay) return null;

              return (
                <div>
                  <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                    Timestamp
                  </h4>
                  <p className="text-sm text-neutral-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                    </svg>
                    <span className="font-mono">{timestampDisplay}</span>
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* PDF/Academic Details */}
        {(source.sourceType === 'pdf' || source.sourceType === 'academic') && (
          <div className="space-y-3">
            {source.metadata.author && source.metadata.author.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                  Author{source.metadata.author.length > 1 ? 's' : ''}
                </h4>
                <p className="text-sm text-neutral-800">
                  {source.metadata.author.map(a =>
                    a.literal || `${a.given || ''} ${a.family || ''}`.trim()
                  ).join(', ')}
                </p>
              </div>
            )}
            {source.metadata.abstract && (
              <div>
                <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                  Abstract
                </h4>
                <p className="text-sm text-neutral-600 line-clamp-4">
                  {source.metadata.abstract}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {source.metadata.abstract && source.sourceType !== 'pdf' && source.sourceType !== 'academic' && (
          <div>
            <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Description
            </h4>
            <p className="text-sm text-neutral-600 line-clamp-3">
              {source.metadata.abstract}
            </p>
          </div>
        )}

        {/* User Notes */}
        {source.userNotes && (
          <div>
            <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Your Notes
            </h4>
            <div className="bg-yellow-50 rounded-lg p-3 text-sm text-neutral-700 border-l-4 border-yellow-400">
              {source.userNotes}
            </div>
          </div>
        )}

        {/* Highlighted Excerpt */}
        {source.highlightedExcerpt && (
          <div>
            <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Selected Text
            </h4>
            <blockquote className="bg-blue-50 rounded-lg p-3 text-sm text-neutral-700 border-l-4 border-blue-400 italic">
              "{source.highlightedExcerpt}"
            </blockquote>
          </div>
        )}

        {/* Tags */}
        {source.tags && source.tags.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Tags
            </h4>
            <div className="flex flex-wrap gap-1">
              {source.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Capture Context */}
        <div>
          <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
            Captured
          </h4>
          <p className="text-sm text-neutral-600">
            {format(new Date(source.createdAt), 'PPPP')} at {format(new Date(source.createdAt), 'p')}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Method: {source.provenance?.captureMethod === 'manual' ? 'Manual save' : source.provenance?.captureMethod}
          </p>
        </div>
      </div>
    </div>
  );
}

export function OriginTrail({ sources, selectedSourceId, onSourceSelect }: OriginTrailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const itemsRef = useRef<DataSet<TimelineItem>>(new DataSet());
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(new Map());
  const [fullImageUrls, setFullImageUrls] = useState<Map<string, string>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [selectedForDetail, setSelectedForDetail] = useState<string | undefined>();

  // Get the selected source
  const selectedSource = selectedForDetail
    ? sources.find(s => s.id === selectedForDetail)
    : selectedSourceId
    ? sources.find(s => s.id === selectedSourceId)
    : undefined;

  // Convert blob thumbnails to object URLs
  useEffect(() => {
    const thumbMap = new Map<string, string>();
    const fullMap = new Map<string, string>();

    sources.forEach(source => {
      if (source.id) {
        if (source.screenshot?.thumbnail) {
          const url = URL.createObjectURL(source.screenshot.thumbnail);
          thumbMap.set(source.id, url);
        }
        if (source.screenshot?.fullImage) {
          const url = URL.createObjectURL(source.screenshot.fullImage);
          fullMap.set(source.id, url);
        }
      }
    });

    setThumbnailUrls(thumbMap);
    setFullImageUrls(fullMap);

    // Cleanup URLs on unmount
    return () => {
      thumbMap.forEach(url => URL.revokeObjectURL(url));
      fullMap.forEach(url => URL.revokeObjectURL(url));
    };
  }, [sources]);

  // Initialize timeline
  useEffect(() => {
    if (!containerRef.current || sources.length === 0) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const options: TimelineOptions = {
      height: '100%',
      minHeight: 200,
      maxHeight: 400,
      stack: true,
      stackSubgroups: true,
      showCurrentTime: false,
      zoomMin: 1000 * 60 * 5, // 5 minutes
      zoomMax: 1000 * 60 * 60 * 24 * 365, // 1 year
      orientation: { axis: 'bottom', item: 'bottom' },
      margin: { item: { horizontal: 10, vertical: 10 } },
      selectable: true,
      multiselect: false,
      // Accessibility
      keyboard: {
        enabled: true,
        bindKeys: {
          right: 39,
          left: 37,
          up: 38,
          down: 40,
          pageUp: 33,
          pageDown: 34,
        },
      },
      // Animation
      animation: prefersReducedMotion ? false : {
        duration: 500,
        easingFunction: 'easeInOutQuad',
      },
      // Tooltips
      tooltip: {
        followMouse: true,
        overflowMethod: 'cap',
      },
    };

    // Create timeline if it doesn't exist
    if (!timelineRef.current) {
      timelineRef.current = new Timeline(containerRef.current, itemsRef.current, options);

      // Handle selection
      timelineRef.current.on('select', (properties: { items: IdType[] }) => {
        if (properties.items.length > 0) {
          const id = properties.items[0] as string;
          setSelectedForDetail(id);
          if (onSourceSelect) {
            onSourceSelect(id);
          }
        }
      });

      // Handle keyboard navigation
      timelineRef.current.on('changed', () => {
        // Ensure timeline is accessible
        const timelineElement = containerRef.current?.querySelector('.vis-timeline');
        if (timelineElement && !timelineElement.hasAttribute('role')) {
          timelineElement.setAttribute('role', 'application');
          timelineElement.setAttribute('aria-label', 'Research timeline. Use arrow keys to navigate, Enter to select.');
        }
      });

      setIsReady(true);
    }

    return () => {
      if (timelineRef.current) {
        timelineRef.current.destroy();
        timelineRef.current = null;
        setIsReady(false);
      }
    };
  }, [sources.length > 0]); // Only reinitialize if we go from 0 to some sources

  // Update items when sources or thumbnails change
  useEffect(() => {
    if (!timelineRef.current || sources.length === 0) return;

    const items = sources.map(source =>
      sourceToTimelineItem(source, thumbnailUrls.get(source.id!))
    );

    itemsRef.current.clear();
    itemsRef.current.add(items);

    // Fit to show all items
    timelineRef.current.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
  }, [sources, thumbnailUrls]);

  // Sync selection with external state
  useEffect(() => {
    if (!timelineRef.current || !isReady) return;

    const idToSelect = selectedForDetail || selectedSourceId;
    if (idToSelect) {
      timelineRef.current.setSelection([idToSelect]);
      // Focus on selected item
      timelineRef.current.focus(idToSelect, { animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
    } else {
      timelineRef.current.setSelection([]);
    }
  }, [selectedSourceId, selectedForDetail, isReady]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.zoomIn(0.5);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.zoomOut(0.5);
    }
  }, []);

  const handleFitAll = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
    }
  }, []);

  // Calculate session stats
  const sessionGroups = groupSourcesBySession(sources);
  const totalSessions = sessionGroups.length;

  // Count by type
  const typeCounts = sources.reduce((acc, s) => {
    acc[s.sourceType] = (acc[s.sourceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
        <svg className="w-16 h-16 mb-4 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-center">
          Capture some sources to see your research timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="origin-trail flex flex-col h-full">
      {/* Stats Bar */}
      <div className="flex items-center justify-between mb-3 p-3 bg-neutral-50 rounded-lg">
        <div className="flex gap-4 text-sm">
          <span className="text-neutral-600">
            <strong className="text-neutral-900">{sources.length}</strong> sources
          </span>
          <span className="text-neutral-600">
            <strong className="text-neutral-900">{totalSessions}</strong> session{totalSessions !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Type breakdown */}
        <div className="flex gap-2 text-xs">
          {Object.entries(typeCounts).slice(0, 4).map(([type, count]) => {
            const info = getSourceTypeInfo(type);
            return (
              <div key={type} className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-sm border"
                  style={{ backgroundColor: info.background, borderColor: info.border }}
                />
                <span className="text-neutral-600">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={handleZoomIn} aria-label="Zoom in">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleZoomOut} aria-label="Zoom out">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleFitAll} aria-label="Fit all items">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </Button>
        <span className="text-xs text-neutral-500 ml-2">
          Click items to see details • Arrow keys to navigate
        </span>
      </div>

      {/* Timeline Container */}
      <div
        ref={containerRef}
        className="timeline-container border rounded-lg overflow-hidden"
        style={{ height: selectedSource ? '200px' : '300px' }}
        role="region"
        aria-label="Research timeline visualization"
      />

      {/* Detail Panel */}
      {selectedSource && (
        <div className="mt-4 flex-1 min-h-0 overflow-hidden">
          <SourceDetailPanel
            source={selectedSource}
            thumbnailUrl={thumbnailUrls.get(selectedSource.id!)}
            fullImageUrl={fullImageUrls.get(selectedSource.id!)}
            onViewFullImage={() => setShowFullImage(true)}
            onClose={() => {
              setSelectedForDetail(undefined);
              if (timelineRef.current) {
                timelineRef.current.setSelection([]);
              }
            }}
          />
        </div>
      )}

      {/* Full Image Modal - larger display */}
      {showFullImage && selectedSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setShowFullImage(false)}
        >
          <div
            className="relative max-w-[95vw] max-h-[95vh] bg-white rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-neutral-50">
              <div className="flex-1 min-w-0 mr-4">
                <h3 className="font-medium text-neutral-900 truncate">
                  {selectedSource.metadata.title}
                </h3>
                <p className="text-xs text-neutral-500">
                  Captured {format(new Date(selectedSource.createdAt), 'PPpp')}
                </p>
              </div>
              <button
                onClick={() => setShowFullImage(false)}
                className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 rounded-full transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Image */}
            <div className="overflow-auto max-h-[calc(95vh-60px)]">
              {fullImageUrls.get(selectedSource.id!) ? (
                <img
                  src={fullImageUrls.get(selectedSource.id!)}
                  alt={`Full screenshot of ${selectedSource.metadata.title}`}
                  className="max-w-none"
                  style={{ minWidth: '800px' }}
                />
              ) : thumbnailUrls.get(selectedSource.id!) ? (
                <img
                  src={thumbnailUrls.get(selectedSource.id!)}
                  alt={`Screenshot of ${selectedSource.metadata.title}`}
                  className="max-w-none"
                  style={{ minWidth: '600px' }}
                />
              ) : (
                <p className="text-neutral-500 text-center py-16 px-8">No screenshot available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
