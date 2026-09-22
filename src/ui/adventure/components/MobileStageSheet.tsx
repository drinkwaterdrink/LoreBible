import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface MobileStageSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export const MobileStageSheet: React.FC<MobileStageSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = "max-h-[85dvh]",
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sliding Bottom Drawer */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={`relative z-10 w-full bg-[var(--surface-sidebar)] border-t border-[var(--border-gold)] rounded-t-xl shadow-2xl flex flex-col overflow-hidden ${maxHeight} pb-[max(1.5rem,env(safe-area-inset-bottom))]`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab Handle */}
            <div className="w-full flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
            </div>

            {/* Header */}
            <header className="px-4 py-2.5 border-b border-[var(--border-soft)] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-serif-title font-semibold text-[var(--text-primary)]">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-[11px] font-manuscript text-[var(--text-secondary)]">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                aria-label="Close sheet"
              >
                <X size={18} />
              </button>
            </header>

            {/* Sheet Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
