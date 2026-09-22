import React, { useEffect } from "react";
import type { LegacyStageId } from "./types";
import { PlusCircle, Save, Archive, Command, Settings, X, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface QuickActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onNewScenario: () => void;
  onSaveScenario: () => void;
  onOpenVault: () => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
  onSelectStage: (stage: LegacyStageId) => void;
  currentStage: LegacyStageId;
  maxUnlockedStage: LegacyStageId;
}

export const QuickActionsSheet: React.FC<QuickActionsSheetProps> = ({
  isOpen,
  onClose,
  onNewScenario,
  onSaveScenario,
  onOpenVault,
  onOpenCommandPalette,
  onOpenSettings,
  onSelectStage,
  currentStage,
  maxUnlockedStage,
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
      aria-label="Quick Actions"
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
              Quick Actions
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label="Close quick actions"
          >
            <X size={18} />
          </button>
        </div>

        {/* Primary Real Actions */}
        <div className="grid grid-cols-2 gap-2 text-xs font-apparatus">
          <button
            type="button"
            onClick={() => {
              onNewScenario();
              onClose();
            }}
            className="flex flex-col items-start justify-center p-3 rounded-[4px] bg-[var(--surface-app)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-[var(--text-primary)] min-h-[44px] cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[var(--rubric)] font-semibold mb-0.5">
              <PlusCircle size={15} />
              <span>New Scenario</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Start fresh seed</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSaveScenario();
              onClose();
            }}
            className="flex flex-col items-start justify-center p-3 rounded-[4px] bg-[var(--surface-app)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-[var(--text-primary)] min-h-[44px] cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[var(--accent-gold)] font-semibold mb-0.5">
              <Save size={15} />
              <span>Save Scenario</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Seal to Vault</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenVault();
              onClose();
            }}
            className="flex flex-col items-start justify-center p-3 rounded-[4px] bg-[var(--surface-app)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-[var(--text-primary)] min-h-[44px] cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[var(--text-secondary)] font-semibold mb-0.5">
              <Archive size={15} />
              <span>Open Library</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Browse saved vaults</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenCommandPalette();
              onClose();
            }}
            className="flex flex-col items-start justify-center p-3 rounded-[4px] bg-[var(--surface-app)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-[var(--text-primary)] min-h-[44px] cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[var(--text-secondary)] font-semibold mb-0.5">
              <Command size={15} />
              <span>Commands</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Search & palette</span>
          </button>
        </div>

        {/* Quick Jump to Stage */}
        <div className="pt-2 border-t border-[var(--border-soft)]">
          <div className="text-[11px] font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
            <Sparkles size={12} className="text-[var(--accent-gold)]" />
            <span>Workflow Stage Jump</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 font-mono-ui text-xs">
            {([1, 2, 3, 4, 5] as LegacyStageId[]).map((stage) => {
              const isCurrent = stage === currentStage;
              const isLocked = stage > maxUnlockedStage;
              const labels = ["Spark", "Diverge", "Blueprint", "Forge", "Refine"];

              return (
                <button
                  key={stage}
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    onSelectStage(stage);
                    onClose();
                  }}
                  className={`flex flex-col items-center justify-center py-2 rounded-[3px] border min-h-[44px] transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-[var(--surface-panel-raised)] border-[var(--accent-gold)] text-[var(--accent-gold)] font-bold shadow-[0_0_8px_rgba(212,175,55,0.2)]"
                      : isLocked
                      ? "opacity-35 cursor-not-allowed border-transparent text-[var(--text-muted)]"
                      : "bg-[var(--surface-app)] border-[var(--border-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span className="text-xs">{stage}</span>
                  <span className="text-[9px] font-apparatus truncate max-w-[50px]">{labels[stage - 1]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
