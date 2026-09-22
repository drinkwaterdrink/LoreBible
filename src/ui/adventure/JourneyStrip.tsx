import React from "react";
import type { LegacyStageId, JourneyStageItem } from "./types";
import { Sparkles, Split, Compass, Hammer, BookOpen, Check } from "lucide-react";

interface JourneyStripProps {
  currentStage: LegacyStageId;
  maxUnlockedStage: LegacyStageId;
  onSelectStage: (stage: LegacyStageId) => void;
  className?: string;
  variant?: "desktop-bar" | "mobile-strip";
}

const STAGE_DEFINITIONS: Array<{
  id: LegacyStageId;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: 1, name: "Spark", subtitle: "Premise & Register", icon: Sparkles },
  { id: 2, name: "Divergence", subtitle: "Four Angles", icon: Split },
  { id: 3, name: "Blueprint", subtitle: "Rules & Physics", icon: Compass },
  { id: 4, name: "Forge", subtitle: "Streaming Synthesis", icon: Hammer },
  { id: 5, name: "Refine", subtitle: "Manuscript & Codex", icon: BookOpen },
];

export const JourneyStrip: React.FC<JourneyStripProps> = ({
  currentStage,
  maxUnlockedStage,
  onSelectStage,
  className = "",
  variant = "desktop-bar",
}) => {
  const stages: JourneyStageItem[] = STAGE_DEFINITIONS.map((def) => {
    let status: JourneyStageItem["status"] = "locked";
    if (def.id === currentStage) {
      status = "current";
    } else if (def.id <= maxUnlockedStage) {
      status = def.id < currentStage ? "completed" : "available";
    }
    return {
      id: def.id,
      name: def.name,
      subtitle: def.subtitle,
      status,
    };
  });

  if (variant === "mobile-strip") {
    return (
      <nav
        aria-label="Workflow Journey"
        className={`flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-none overscroll-contain ${className}`}
      >
        {stages.map((stage) => {
          const isCurrent = stage.id === currentStage;
          const isLocked = stage.status === "locked";
          const isCompleted = stage.status === "completed";

          return (
            <button
              key={stage.id}
              type="button"
              disabled={isLocked}
              onClick={() => onSelectStage(stage.id)}
              aria-current={isCurrent ? "step" : undefined}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-apparatus transition-all min-h-[36px] ${
                isCurrent
                  ? "bg-[var(--surface-panel-raised)] text-[var(--accent-gold)] border border-[var(--accent-gold)] shadow-[0_0_8px_rgba(212,175,55,0.25)] font-semibold"
                  : isLocked
                  ? "opacity-40 cursor-not-allowed text-[var(--text-muted)] border border-transparent"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-panel)] border border-[var(--border-soft)]"
              }`}
            >
              <span className="font-mono-ui text-[10px] opacity-75">
                {isCompleted ? <Check size={10} className="text-[var(--accent-sage)] inline" /> : stage.id}
              </span>
              <span>{stage.name}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  // Desktop horizontal journey bar inspired by mockup bottom stepper
  return (
    <div
      aria-label="Workflow Journey Stepper"
      className={`flex items-center justify-between gap-2 px-4 py-2 bg-[var(--surface-panel)]/90 backdrop-blur-md border-t border-[var(--border-soft)] select-none text-xs font-apparatus ${className}`}
    >
      <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-none py-0.5">
        {stages.map((stage, idx) => {
          const isCurrent = stage.id === currentStage;
          const isLocked = stage.status === "locked";
          const isCompleted = stage.status === "completed";
          const Def = STAGE_DEFINITIONS[idx];
          const Icon = Def.icon;

          return (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => onSelectStage(stage.id)}
                aria-current={isCurrent ? "step" : undefined}
                className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-[3px] border transition-all text-left cursor-pointer ${
                  isCurrent
                    ? "bg-[var(--surface-panel-raised)] border-[var(--accent-gold)] text-[var(--text-primary)] shadow-[0_0_12px_rgba(212,175,55,0.2)]"
                    : isLocked
                    ? "opacity-35 cursor-not-allowed border-transparent text-[var(--text-muted)]"
                    : "border-[var(--border-soft)] bg-[var(--surface-app)]/50 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-app)]"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-[2px] flex items-center justify-center font-mono-ui text-[10px] border shrink-0 ${
                    isCurrent
                      ? "border-[var(--accent-gold)] bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] font-bold"
                      : isCompleted
                      ? "border-[var(--accent-sage)] bg-[var(--accent-sage)]/15 text-[var(--accent-sage)]"
                      : "border-[var(--border-strong)] text-[var(--text-muted)]"
                  }`}
                >
                  {isCompleted ? <Check size={11} /> : stage.id}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 leading-tight">
                    <Icon size={12} className={isCurrent ? "text-[var(--accent-gold)]" : "opacity-60"} />
                    <span className={`font-semibold tracking-wide ${isCurrent ? "text-[var(--accent-gold)]" : ""}`}>
                      {stage.name}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[130px] font-manuscript">
                    {stage.subtitle}
                  </div>
                </div>
              </button>

              {idx < stages.length - 1 && (
                <div className="text-[var(--border-strong)] opacity-50 select-none text-[10px] shrink-0">
                  →
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-[var(--surface-app)] border border-[var(--border-soft)] rounded-[2px] text-[11px] text-[var(--text-secondary)] font-manuscript italic shrink-0">
        <span>“A richer story awaits.”</span>
      </div>
    </div>
  );
};
