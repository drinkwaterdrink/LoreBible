import React from "react";

interface HandDrawnEmptyStateProps {
  sketchType?: "quill" | "codex" | "dice" | "marginalia";
  headline?: string;
  handwrittenNote: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const HandDrawnEmptyState: React.FC<HandDrawnEmptyStateProps> = ({
  sketchType = "quill",
  headline,
  handwrittenNote,
  actionButton,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center select-none ${className}`}
    >
      {/* Hand-drawn faint ink sketch */}
      <div className="relative mb-4 opacity-45 dark:opacity-40 text-[var(--graphite)]">
        {sketchType === "quill" && (
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transform -rotate-12"
          >
            {/* Quill feather contour */}
            <path d="M48 6 C32 10 22 24 18 42 L16 52 L22 48 C28 40 38 28 48 6 Z" strokeDasharray="3 2" />
            <path d="M16 52 C26 34 38 20 48 6" />
            <path d="M26 34 C30 33 34 35 37 34" strokeDasharray="2 2" />
            <path d="M22 41 C27 40 30 42 32 41" strokeDasharray="2 2" />
            {/* Inkpot rim */}
            <ellipse cx="44" cy="52" rx="10" ry="4" />
            <path d="M34 52 L36 60 C36 61 52 61 52 60 L54 52" />
            {/* Droplet */}
            <circle cx="20" cy="56" r="1.5" fill="currentColor" />
          </svg>
        )}

        {sketchType === "codex" && (
          <svg
            width="68"
            height="56"
            viewBox="0 0 68 56"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Open book / codex spine and leaves */}
            <path d="M34 14 C26 9 14 9 6 12 L6 46 C14 43 26 43 34 48 C42 43 54 43 62 46 L62 12 C54 9 42 9 34 14 Z" strokeDasharray="4 2" />
            <path d="M34 14 L34 48" />
            {/* Ruled lines on pages */}
            <path d="M12 20 C18 19 24 19 28 21" strokeDasharray="2 2" />
            <path d="M12 27 C18 26 24 26 28 28" strokeDasharray="2 2" />
            <path d="M12 34 C18 33 24 33 28 35" strokeDasharray="2 2" />
            <path d="M40 21 C44 19 50 19 56 20" strokeDasharray="2 2" />
            <path d="M40 28 C44 26 50 26 56 27" strokeDasharray="2 2" />
            <path d="M40 35 C44 33 50 33 56 34" strokeDasharray="2 2" />
            {/* Ribbon bookmark */}
            <path d="M34 14 C35 22 36 30 38 52 L42 46 L46 52 C44 32 40 20 34 14" />
          </svg>
        )}

        {sketchType === "dice" && (
          <svg
            width="64"
            height="56"
            viewBox="0 0 64 56"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Isometric 20-sided / d100 facet sketch */}
            <polygon points="32,6 54,18 54,42 32,52 10,42 10,18" strokeDasharray="4 2" />
            <line x1="32" y1="6" x2="32" y2="52" />
            <line x1="10" y1="18" x2="54" y2="42" />
            <line x1="10" y1="42" x2="54" y2="18" />
            {/* Faint roman numeral in facet */}
            <circle cx="24" cy="22" r="1.5" fill="currentColor" />
            <circle cx="40" cy="36" r="1.5" fill="currentColor" />
          </svg>
        )}

        {sketchType === "marginalia" && (
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Section symbol and scribe brace */}
            <path d="M18 10 C14 14 14 20 18 24 C24 30 24 36 18 42 C14 46 14 50 18 54" strokeDasharray="2 2" />
            <path d="M36 14 C32 14 28 17 28 20 C28 24 34 26 34 30 C34 34 30 36 26 36" />
            <path d="M26 22 C30 22 34 25 34 28 C34 32 28 34 28 38 C28 42 32 44 36 44" />
          </svg>
        )}
      </div>

      {/* Optional quiet apparatus headline */}
      {headline && (
        <h4 className="font-apparatus uppercase tracking-widest text-[11px] font-semibold text-[var(--graphite)] mb-1">
          {headline}
        </h4>
      )}

      {/* Suggested action in scriptorium handwriting */}
      <p className="font-hand text-[var(--ink-blue)] text-lg max-w-sm leading-snug mb-3">
        “{handwrittenNote}”
      </p>

      {/* Optional action button */}
      {actionButton && (
        <button
          type="button"
          onClick={actionButton.onClick}
          className="btn-secondary text-[10px] py-1 px-3 mt-1 hover:border-[var(--rubric)] hover:text-[var(--rubric)]"
        >
          {actionButton.label}
        </button>
      )}
    </div>
  );
};
