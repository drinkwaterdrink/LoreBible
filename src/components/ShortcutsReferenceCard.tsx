import React, { useEffect } from "react";
import { Command, X } from "lucide-react";

interface ShortcutsReferenceCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsReferenceCard: React.FC<ShortcutsReferenceCardProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape" || e.key === "?") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutGroups = [
    {
      group: "Navigation & Apparatus",
      items: [
        { keys: ["⌘ / Ctrl", "K"], action: "Open Command Palette" },
        { keys: ["/"], action: "Focus Section / Outline Search" },
        { keys: ["?"], action: "Toggle this Reference Card" },
        { keys: ["Esc"], action: "Close modal or clear selection" },
      ],
    },
    {
      group: "Manuscript Actions",
      items: [
        { keys: ["⌘ / Ctrl", "S"], action: "Export Lore Bible (SillyTavern, JSON, TXT)" },
        { keys: ["⌘ / Ctrl", "Z"], action: "Undo last manuscript edit" },
        { keys: ["⌘ / Ctrl", "⇧", "Z"], action: "Redo manuscript edit" },
        { keys: ["⌘ / Ctrl", "P"], action: "Print writer's clean monograph" },
      ],
    },
    {
      group: "Focused Entry Keystrokes",
      items: [
        { keys: ["↑", "↓"], action: "Step between entries" },
        { keys: ["R"], action: "Reroll focused entry via Gemini" },
        { keys: ["L"], action: "Toggle lock permanence (Constant / Inked)" },
        { keys: ["N"], action: "Add handwritten margin note" },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keystroke reference card"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-ink-bleed select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[3px] shadow-2xl p-6 sm:p-7 text-[var(--ink)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow:
            "0 20px 45px -15px rgba(35, 32, 27, 0.35), 0 0 0 1px var(--ink-soft)",
        }}
      >
        {/* Card Header with letterpress title */}
        <div className="flex items-center justify-between border-b border-[var(--rubric)] pb-2.5 mb-5">
          <div className="flex items-center gap-2">
            <Command size={14} className="text-[var(--rubric)]" />
            <h3 className="font-manuscript text-base font-bold uppercase tracking-widest text-[var(--ink)]">
              Scriptorium Keystroke Card
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts reference"
            className="text-[var(--graphite)] hover:text-[var(--ink)] p-1 rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Shortcuts Listing */}
        <div className="space-y-5">
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <h4 className="font-apparatus uppercase tracking-wider text-[10px] font-bold text-[var(--graphite)] mb-2.5">
                {group.group}
              </h4>
              <div className="space-y-2">
                {group.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="flex items-center justify-between text-xs py-1 border-b border-[var(--ink-soft)]/30 last:border-b-0"
                  >
                    <span className="font-manuscript text-[var(--ink)]">
                      {item.action}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 font-mono-ui text-[10px] font-semibold bg-[var(--vellum-deep)] border border-[var(--ink-soft)] text-[var(--ink)] rounded-[2px] shadow-2xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="pt-4 mt-5 border-t border-[var(--ink-soft)] flex items-center justify-between">
          <span className="font-hand text-[var(--ink-blue)] text-sm">
            “Quick hands make light ink work.”
          </span>
          <span className="font-mono-ui text-[10px] text-[var(--graphite)]">
            Press Esc or ? to dismiss
          </span>
        </div>
      </div>
    </div>
  );
};
