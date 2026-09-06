import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { PlusCircle, Save, Trash2, X } from "lucide-react";

interface NewScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndStartNew: () => void;
  onDiscardAndStartNew: () => void;
  currentTitle?: string;
}

export const NewScenarioModal: React.FC<NewScenarioModalProps> = ({
  isOpen,
  onClose,
  onSaveAndStartNew,
  onDiscardAndStartNew,
  currentTitle = "Untitled Scenario",
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          id="new-scenario-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-md bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[4px] shadow-2xl p-6 select-none"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--graphite)] hover:text-[var(--ink)] transition-colors p-1"
            title="Cancel"
          >
            <X size={16} />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-[var(--rubric)]/15 border border-[var(--rubric)]/30 flex items-center justify-center text-[var(--rubric)]">
              <PlusCircle size={18} />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-apparatus text-[var(--graphite)] block">
                Folio Management
              </span>
              <h3 className="text-lg font-manuscript font-semibold text-[var(--ink)]">
                Start a Fresh Scenario?
              </h3>
            </div>
          </div>

          <p className="text-xs text-[var(--ink)]/80 font-manuscript leading-relaxed mb-4">
            You have an active manuscript on the desk:
          </p>

          <div className="p-3 mb-5 rounded border border-[var(--ink-soft)] bg-[var(--vellum)] font-hand text-base text-[var(--ink-blue)] italic">
            “{currentTitle}”
          </div>

          <p className="text-xs text-[var(--graphite)] font-manuscript leading-relaxed mb-6">
            Would you like to seal your current work to the Vault before clearing the workspace, or discard it and start clean?
          </p>

          {/* Action Stack */}
          <div className="flex flex-col gap-2.5">
            {/* Primary Action: Save & Start New */}
            <button
              id="save-and-start-new-btn"
              type="button"
              onClick={onSaveAndStartNew}
              className="w-full btn-primary py-2.5 px-4 text-xs font-apparatus flex items-center justify-center gap-2"
            >
              <Save size={14} />
              <span>Seal to Vault &amp; Start Fresh</span>
            </button>

            {/* Secondary Action: Discard & Start New */}
            <button
              id="discard-and-start-new-btn"
              type="button"
              onClick={onDiscardAndStartNew}
              className="w-full btn-secondary py-2 px-4 text-xs font-apparatus text-[var(--rubric)] hover:border-[var(--rubric)] flex items-center justify-center gap-2"
            >
              <Trash2 size={13} />
              <span>Discard Desk &amp; Start Fresh</span>
            </button>

            {/* Tertiary Action: Keep Editing */}
            <button
              type="button"
              onClick={onClose}
              className="w-full text-center py-1.5 text-xs text-[var(--graphite)] hover:text-[var(--ink)] transition-colors font-manuscript"
            >
              Keep editing current manuscript
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
