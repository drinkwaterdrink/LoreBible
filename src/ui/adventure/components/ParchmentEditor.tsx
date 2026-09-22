import React, { useRef, useEffect, useState } from "react";
import { QuillEmblem } from "./DecorativeArt";
import { RotateCcw, AlertCircle, Sparkles } from "lucide-react";

interface ParchmentEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  chapterTitle?: string;
  authorFlavorLabel?: string;
  disabled?: boolean;
  onClear?: () => void;
}

export const ParchmentEditor: React.FC<ParchmentEditorProps> = ({
  value,
  onChange,
  placeholder = "Write your premise here... Lay down the initial seed of the world, characters, or uncanny collision.",
  chapterTitle = "Chapter I · The Initial Spark",
  authorFlavorLabel,
  disabled = false,
  onClear,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Auto-grow with bounded height constraints
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const targetHeight = Math.min(Math.max(160, el.scrollHeight), 480);
    el.style.height = `${targetHeight}px`;
  }, [value]);

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  const handleConfirmClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange("");
    }
    setShowConfirmClear(false);
    textareaRef.current?.focus();
  };

  return (
    <article
      id="adventure-parchment-editor"
      className="parchment-workspace w-full p-5 sm:p-8 md:p-10 transition-all flex flex-col relative"
    >
      {/* Parchment Header / Chapter Plate */}
      <header className="flex items-center justify-between pb-4 mb-3 border-b border-[var(--border-paper)]/70">
        <div className="flex items-center gap-2.5">
          <QuillEmblem size={16} className="text-[var(--accent-gold)] shrink-0" />
          <span className="font-serif-title text-xs sm:text-sm font-semibold tracking-wide text-[var(--text-paper)] uppercase">
            {chapterTitle}
          </span>
        </div>

        {authorFlavorLabel && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-[var(--surface-paper-sunken)] border border-[var(--border-paper)] text-[10px] font-mono text-[var(--text-paper-muted)]">
            <Sparkles size={11} className="text-[var(--accent-gold)]" />
            <span>{authorFlavorLabel}</span>
          </div>
        )}
      </header>

      {/* Manuscript Writing Surface */}
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          id="adventure-spark-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Manuscript Premise Editor"
          className="w-full bg-transparent resize-none border-none outline-none font-manuscript text-base sm:text-lg text-[var(--text-paper)] placeholder:text-[var(--text-paper-muted)]/50 placeholder:italic leading-relaxed max-h-[45dvh] sm:max-h-[500px] overflow-y-auto pr-2"
        />
      </div>

      {/* Parchment Editorial Footer */}
      <footer className="mt-4 pt-3 border-t border-[var(--border-paper)]/70 flex items-center justify-between text-xs text-[var(--text-paper-muted)] font-manuscript select-none">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-medium tracking-tight text-[var(--text-paper)]">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
          <span className="text-[var(--border-paper)]">·</span>
          <span className="text-[11px] text-[var(--text-paper-muted)]">
            {charCount} chars
          </span>
        </div>

        {/* Secondary overflow reset control with confirmation */}
        <div className="relative">
          {showConfirmClear ? (
            <div className="flex items-center gap-2 bg-[var(--surface-paper-sunken)] border border-[var(--border-paper)] px-2 py-1 rounded shadow-sm text-xs">
              <span className="text-[11px] text-[var(--text-paper)] font-medium flex items-center gap-1">
                <AlertCircle size={12} className="text-[var(--status-danger)]" /> Clear premise?
              </span>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="text-[11px] font-semibold text-[var(--status-danger)] hover:underline cursor-pointer"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="text-[11px] text-[var(--text-paper-muted)] hover:underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            value.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setShowConfirmClear(true)}
                title="Wipe draft"
                className="opacity-40 hover:opacity-100 transition-opacity p-1 text-[var(--text-paper-muted)] cursor-pointer"
                aria-label="Wipe draft"
              >
                <RotateCcw size={13} />
              </button>
            )
          )}
        </div>
      </footer>
    </article>
  );
};
