import React from "react";
import { Command, Feather } from "lucide-react";

interface WorkspaceHeaderProps {
  workingTitle?: string;
  isSaved?: boolean;
  onOpenCommandPalette: () => void;
  contextAction?: {
    label: string;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    onClick: () => void;
    title?: string;
  };
  onToggleMargin?: () => void;
  isMarginOpen?: boolean;
  marginBadgeCount?: number;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  workingTitle,
  isSaved = true,
  onOpenCommandPalette,
  contextAction,
  onToggleMargin,
  isMarginOpen = false,
  marginBadgeCount = 0,
}) => {
  const displayTitle = workingTitle && workingTitle.trim().length > 0 ? workingTitle : "Untitled Scenario";

  return (
    <header
      id="adventure-workspace-header"
      aria-label="Workspace Context Header"
      className="adventure-header shrink-0 h-12 bg-[var(--surface-app)] border-b border-[var(--border-soft)] px-4 flex items-center justify-between select-none z-20"
    >
      {/* Left: Project / Breadcrumb Context */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono-ui text-[11px] text-[var(--accent-gold)] opacity-80 shrink-0">§</span>
          <h2 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] font-apparatus truncate">
            {displayTitle}
          </h2>
        </div>

        {/* Truthful Saved State Indicator */}
        <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono-ui text-[var(--text-muted)] bg-[var(--surface-panel)] border border-[var(--border-soft)] px-2 py-0.5 rounded-full shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSaved ? "bg-[var(--accent-sage)] shadow-[0_0_4px_var(--accent-sage)]" : "bg-[var(--status-warning)]"
            }`}
          />
          <span>{isSaved ? "Saved" : "Unsaved"}</span>
        </div>
      </div>

      {/* Right: Search / Commands + Contextual Action */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search / Command Palette Access */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-2.5 py-1 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-apparatus transition-all cursor-pointer min-h-[32px]"
          title="Search & commands (⌘K)"
          aria-label="Open Command Palette"
        >
          <Command size={13} className="text-[var(--accent-gold)] opacity-80" />
          <span className="hidden md:inline text-[11px] text-[var(--text-muted)]">Search...</span>
          <kbd className="hidden md:inline font-mono-ui text-[9px] bg-[var(--surface-app)] px-1.5 py-0.5 rounded border border-[var(--border-soft)] text-[var(--text-muted)]">
            ⌘K
          </kbd>
        </button>

        {/* Optional Margin / Canon Contextual Toggle */}
        {onToggleMargin && (
          <button
            type="button"
            onClick={onToggleMargin}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border text-xs font-apparatus transition-all cursor-pointer min-h-[32px] ${
              isMarginOpen
                ? "bg-[var(--surface-panel-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-semibold"
                : "bg-[var(--surface-panel)] border-[var(--border-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            title="Toggle Margin Apparatus (Canon & Anchors)"
            aria-label="Toggle Margin Apparatus"
          >
            <Feather size={12} className="text-[var(--rubric)]" />
            <span className="hidden sm:inline text-[11px]">Margin</span>
            {marginBadgeCount > 0 && (
              <span className="font-mono-ui text-[9px] px-1 rounded bg-[var(--surface-app)] text-[var(--text-primary)] border border-[var(--border-soft)]">
                {marginBadgeCount}
              </span>
            )}
          </button>
        )}

        {/* At Most One Context-Specific Primary Action */}
        {contextAction && (
          <button
            type="button"
            onClick={contextAction.onClick}
            title={contextAction.title}
            className="flex items-center gap-1.5 px-3 py-1 rounded-[3px] bg-[var(--surface-panel-raised)] border border-[var(--border-gold)] text-[var(--accent-gold)] hover:bg-[var(--accent-gold)] hover:text-[var(--surface-app)] font-apparatus text-xs font-semibold shadow-[0_0_8px_rgba(212,175,55,0.15)] transition-all cursor-pointer min-h-[32px]"
          >
            {contextAction.icon && <contextAction.icon size={13} />}
            <span>{contextAction.label}</span>
          </button>
        )}
      </div>
    </header>
  );
};
