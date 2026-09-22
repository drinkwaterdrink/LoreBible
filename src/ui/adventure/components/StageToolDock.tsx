import React from "react";
import { ArrowRight, Loader2 } from "lucide-react";

export interface ToolDockAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  badge?: string | number;
}

interface StageToolDockProps {
  secondaryActions: ToolDockAction[];
  primaryAction: ToolDockAction;
  statusMessage?: string;
  className?: string;
}

export const StageToolDock: React.FC<StageToolDockProps> = ({
  secondaryActions,
  primaryAction,
  statusMessage,
  className = "",
}) => {
  return (
    <nav
      aria-label="Stage Actions"
      className={`stage-dock px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3 w-full ${className}`}
    >
      {/* Secondary Tools Area */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-start">
        {secondaryActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            title={action.title}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {action.loading ? (
              <Loader2 size={13} className="animate-spin text-[var(--accent-gold)]" />
            ) : (
              action.icon
            )}
            <span>{action.label}</span>
            {action.badge !== undefined && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[var(--surface-app)] text-[var(--accent-gold)] border border-[var(--border-gold)]">
                {action.badge}
              </span>
            )}
          </button>
        ))}

        {statusMessage && (
          <span className="hidden lg:inline-block text-xs font-manuscript text-[var(--text-muted)] italic ml-2">
            {statusMessage}
          </span>
        )}
      </div>

      {/* Dominant Primary Action CTA */}
      <div className="w-full sm:w-auto flex justify-end shrink-0">
        <button
          type="button"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled || primaryAction.loading}
          title={primaryAction.title}
          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 text-xs py-2 px-5 min-h-[40px] font-semibold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md"
        >
          {primaryAction.loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            primaryAction.icon || <ArrowRight size={15} />
          )}
          <span>{primaryAction.label}</span>
        </button>
      </div>
    </nav>
  );
};
