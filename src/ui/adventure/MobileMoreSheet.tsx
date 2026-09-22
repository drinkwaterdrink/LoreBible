import React, { useEffect } from "react";
import type { NavDestination } from "./types";
import { Hammer, Clock, Archive, Settings, HelpCircle, X } from "lucide-react";
import { motion } from "motion/react";

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNav: (dest: NavDestination) => void;
  savedCount: number;
  onOpenSettings: () => void;
  onOpenShortcuts?: () => void;
}

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
  isOpen,
  onClose,
  onSelectNav,
  savedCount,
  onOpenSettings,
  onOpenShortcuts,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="More Navigation Options"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs md:hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full bg-[var(--surface-panel)] border-t border-[var(--border-strong)] rounded-t-xl p-4 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono-ui text-[10px] text-[var(--accent-gold)] uppercase tracking-wider">§</span>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] font-apparatus">
              More Workspaces & Tools
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label="Close more options"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs font-apparatus">
          <button
            type="button"
            onClick={() => {
              onSelectNav("build");
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-[4px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-colors min-h-[44px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Hammer size={16} className="text-[var(--accent-gold)]" />
              <div className="text-left">
                <div className="font-semibold">Build & Forge</div>
                <div className="text-[10px] text-[var(--text-muted)]">Blueprint & Synthesis generation</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectNav("timeline");
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-[4px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-colors min-h-[44px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-[var(--accent-gold)]" />
              <div className="text-left">
                <div className="font-semibold">Timeline</div>
                <div className="text-[10px] text-[var(--text-muted)]">Chronology & era progression</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectNav("library");
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-[4px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-colors min-h-[44px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Archive size={16} className="text-[var(--accent-gold)]" />
              <div className="text-left">
                <div className="font-semibold">Library (Vault)</div>
                <div className="text-[10px] text-[var(--text-muted)]">Saved manuscripts & scenarios</div>
              </div>
            </div>
            {savedCount > 0 && (
              <span className="font-mono-ui text-[10px] px-2 py-0.5 rounded bg-[var(--surface-panel-raised)] text-[var(--accent-gold)] border border-[var(--border-gold)]">
                {savedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-[4px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-colors min-h-[44px] cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Settings size={16} className="text-[var(--accent-gold)]" />
              <div className="text-left">
                <div className="font-semibold">Settings & UI Mode</div>
                <div className="text-[10px] text-[var(--text-muted)]">Model profiles & Classic fallback</div>
              </div>
            </div>
          </button>

          {onOpenShortcuts && (
            <button
              type="button"
              onClick={() => {
                onOpenShortcuts();
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 rounded-[4px] bg-[var(--surface-app)] border border-[var(--border-soft)] text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-colors min-h-[44px] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <HelpCircle size={16} className="text-[var(--text-secondary)]" />
                <div className="text-left">
                  <div className="font-semibold">Help & Shortcuts</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Keys and guide</div>
                </div>
              </div>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
