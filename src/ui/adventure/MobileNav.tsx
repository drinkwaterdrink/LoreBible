import React, { useState } from "react";
import type { NavDestination } from "./types";
import { Home, Feather, Plus, Globe, MoreHorizontal } from "lucide-react";
import { MobileMoreSheet } from "./MobileMoreSheet";

interface MobileNavProps {
  activeNav: NavDestination;
  onSelectNav: (dest: NavDestination) => void;
  onOpenQuickActions: () => void;
  savedCount: number;
  onOpenSettings: () => void;
  onOpenShortcuts?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeNav,
  onSelectNav,
  onOpenQuickActions,
  savedCount,
  onOpenSettings,
  onOpenShortcuts,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="adventure-nav fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface-sidebar)]/95 backdrop-blur-md border-t border-[var(--border-soft)] md:hidden pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex items-center justify-around px-2 h-14 select-none">
          {/* Home */}
          <button
            type="button"
            onClick={() => onSelectNav("home")}
            aria-current={activeNav === "home" ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 transition-colors cursor-pointer ${
              activeNav === "home" ? "text-[var(--accent-gold)] font-semibold" : "text-[var(--text-secondary)]"
            }`}
          >
            <Home size={18} />
            <span className="text-[10px] font-apparatus mt-0.5">Home</span>
          </button>

          {/* Write */}
          <button
            type="button"
            onClick={() => onSelectNav("write")}
            aria-current={activeNav === "write" ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 transition-colors cursor-pointer ${
              activeNav === "write" ? "text-[var(--accent-gold)] font-semibold" : "text-[var(--text-secondary)]"
            }`}
          >
            <Feather size={18} />
            <span className="text-[10px] font-apparatus mt-0.5">Write</span>
          </button>

          {/* Center Quick Actions Button (+) */}
          <div className="flex items-center justify-center px-2">
            <button
              type="button"
              onClick={onOpenQuickActions}
              aria-label="Quick Actions"
              className="w-11 h-11 rounded-full bg-[var(--accent-gold)] text-[var(--surface-sidebar)] shadow-[0_0_12px_rgba(212,175,55,0.4)] flex items-center justify-center hover:bg-[var(--accent-gold-hover)] active:scale-95 transition-all cursor-pointer font-bold"
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>
          </div>

          {/* World */}
          <button
            type="button"
            onClick={() => onSelectNav("world")}
            aria-current={activeNav === "world" ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 transition-colors cursor-pointer ${
              activeNav === "world" ? "text-[var(--accent-gold)] font-semibold" : "text-[var(--text-secondary)]"
            }`}
          >
            <Globe size={18} />
            <span className="text-[10px] font-apparatus mt-0.5">World</span>
          </button>

          {/* More */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            aria-label="More navigation and tools"
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 transition-colors cursor-pointer ${
              isMoreOpen || activeNav === "build" || activeNav === "timeline" || activeNav === "library"
                ? "text-[var(--accent-gold)] font-semibold"
                : "text-[var(--text-secondary)]"
            }`}
          >
            <MoreHorizontal size={18} />
            <span className="text-[10px] font-apparatus mt-0.5">More</span>
          </button>
        </div>
      </nav>

      <MobileMoreSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        onSelectNav={onSelectNav}
        savedCount={savedCount}
        onOpenSettings={onOpenSettings}
        onOpenShortcuts={onOpenShortcuts}
      />
    </>
  );
};
