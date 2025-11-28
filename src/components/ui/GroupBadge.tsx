import type { SourceGroup } from '../../types/source';

interface GroupBadgeProps {
  group: SourceGroup;
  onRemove?: () => void;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

/**
 * A small colored badge displaying a group name
 * Optionally shows a remove button and supports click navigation
 */
export function GroupBadge({ group, onRemove, onClick, size = 'sm' }: GroupBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  // Calculate contrasting text color based on background
  const getTextColor = (bgColor: string): string => {
    // Remove # if present
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1f2937' : '#ffffff';
  };

  const bgColor = group.color || '#3b82f6';
  const textColor = getTextColor(bgColor);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onClick?.();
    }
  };

  const handleRemoveKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onRemove?.();
    }
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-600
      `}
      style={{ backgroundColor: bgColor, color: textColor }}
      onClick={handleClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `Filter by group: ${group.name}` : undefined}
    >
      <span className="truncate max-w-[120px]">{group.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          onKeyDown={handleRemoveKeyDown}
          className="
            ml-0.5 -mr-1 rounded-full p-0.5
            hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-white/50
          "
          aria-label={`Remove from group: ${group.name}`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
