import React from "react";
import { BookOpen, Moon, Sun, Archive, Sparkles, X, HelpCircle, Feather, PlusCircle, Save, KeyRound } from "lucide-react";

interface SidebarRailProps {
  currentStage: 1 | 2 | 3 | 4 | 5;
  onSelectStage: (stage: 1 | 2 | 3 | 4 | 5) => void;
  maxUnlockedStage: 1 | 2 | 3 | 4 | 5;
  workingTitle?: string;
  modelSummary?: string;
  isDark: boolean;
  onToggleDark: () => void;
  onOpenVault: () => void;
  savedCount: number;
  onOpenCommandPalette: () => void;
  onOpenShortcuts?: () => void;
  onOpenOnboarding?: () => void;
  onOpenSettings?: () => void;
  onNewScenario?: () => void;
  onSaveScenario?: () => void;
  onCloseMobile?: () => void;
}

const STAGES: { num: 1 | 2 | 3 | 4 | 5; name: string; subtitle: string }[] = [
  { num: 1, name: "SPARK", subtitle: "Concept & register" },
  { num: 2, name: "DIVERGENCE", subtitle: "Four competing angles" },
  { num: 3, name: "PHYSICS", subtitle: "Rules & mundanity" },
  { num: 4, name: "FORGE", subtitle: "Streaming synthesis" },
  { num: 5, name: "REFINE", subtitle: "Manuscript & lorebook" },
];

export const SidebarRail: React.FC<SidebarRailProps> = ({
  currentStage,
  onSelectStage,
  maxUnlockedStage,
  workingTitle,
  modelSummary,
  isDark,
  onToggleDark,
  onOpenVault,
  savedCount,
  onOpenCommandPalette,
  onOpenShortcuts,
  onOpenOnboarding,
  onOpenSettings,
  onNewScenario,
  onSaveScenario,
  onCloseMobile,
}) => {
  return (
    <aside
      id="sidebar-rail"
      className="w-full md:w-56 shrink-0 border-r flex flex-col justify-between select-none py-6 px-4 bg-[var(--vellum-deep)] border-[var(--ink-soft)] h-full overflow-y-auto overscroll-contain"
    >
      <div>
        {/* Monogram § */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <span
              id="app-monogram"
              className="text-2xl font-manuscript font-semibold text-[var(--rubric)] tracking-wider"
            >
              §
            </span>
            <div>
              <h1 className="text-xs font-semibold tracking-widest text-[var(--ink)] font-apparatus">
                LORE BIBLE
              </h1>
              <p className="text-[10px] text-[var(--graphite)] tracking-wide uppercase">
                Scenario Studio
              </p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1 text-[var(--graphite)] hover:text-[var(--ink)] transition-colors"
              title="Close navigation"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Working Title Snippet */}
        {workingTitle && (
          <div className="mb-4 px-2 py-1.5 border-l-2 border-[var(--ink-soft)]">
            <span className="text-[9px] uppercase tracking-widest text-[var(--graphite)] block">
              Manuscript
            </span>
            <span className="text-xs italic manuscript font-manuscript text-[var(--ink)] line-clamp-2">
              {workingTitle}
            </span>
          </div>
        )}

        {modelSummary && (
          <div className="mb-4 px-2 py-1.5 border-l-2 border-[var(--rubric)]/60">
            <span className="text-[9px] uppercase tracking-widest text-[var(--graphite)] block">Active model</span>
            <span className="text-[10px] font-mono-ui text-[var(--ink)] line-clamp-2">{modelSummary}</span>
          </div>
        )}

        {/* Quick Desk Actions: New & Save */}
        <div className="grid grid-cols-2 gap-1.5 mb-5 px-1">
          {onNewScenario && (
            <button
              id="sidebar-new-scenario-btn"
              type="button"
              onClick={onNewScenario}
              className="btn-secondary py-1.5 px-2 text-[10px] uppercase tracking-wider font-apparatus flex items-center justify-center gap-1 hover:border-[var(--rubric)] hover:text-[var(--rubric)]"
              title="Start a fresh scenario"
            >
              <PlusCircle size={12} className="text-[var(--rubric)]" />
              <span>New</span>
            </button>
          )}

          {onSaveScenario && (
            <button
              id="sidebar-save-scenario-btn"
              type="button"
              onClick={onSaveScenario}
              className="btn-primary py-1.5 px-2 text-[10px] uppercase tracking-wider font-apparatus flex items-center justify-center gap-1 shadow-xs"
              title="Seal and save manuscript to Vault (⌘S)"
            >
              <Save size={12} />
              <span>Save</span>
            </button>
          )}
        </div>

        {/* Stages Navigation */}
        <nav className="space-y-1">
          {STAGES.map((s) => {
            const isActive = currentStage === s.num;
            const isUnlocked = s.num <= maxUnlockedStage;

            return (
              <button
                key={s.num}
                id={`stage-nav-btn-${s.num}`}
                disabled={!isUnlocked}
                onClick={() => onSelectStage(s.num)}
                className={`w-full text-left py-2 px-3 transition-all relative block nav-item ${
                  isActive
                    ? "active font-medium pl-3.5 bg-transparent"
                    : isUnlocked
                    ? "hover:text-[var(--ink)] hover:bg-[var(--vellum-raised)] border-l-2 border-transparent"
                    : "opacity-40 cursor-not-allowed border-l-2 border-transparent"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className={`text-[11px] tracking-wider uppercase font-apparatus ${
                      isActive ? "font-semibold text-[var(--ink)]" : "font-normal"
                    }`}
                  >
                    {s.name}
                  </span>
                  <span className="text-[9px] font-mono-ui text-[var(--graphite)]">
                    0{s.num}
                  </span>
                </div>
                <div className="text-[10px] text-[var(--graphite)] truncate mt-0.5">
                  {s.subtitle}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom utilities */}
      <div className="pt-4 border-t border-[var(--ink-soft)] space-y-2">
        <button
          id="vault-trigger-btn"
          onClick={onOpenVault}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[var(--graphite)] hover:text-[var(--ink)] hover:bg-[var(--vellum-raised)] transition-colors rounded-[2px]"
          title="Open Vault of saved scenario manuscripts"
        >
          <span className="flex items-center gap-2">
            <Archive size={13} className="text-[var(--rubric)]" />
            <span className="text-[11px] uppercase tracking-wider font-apparatus">Vault</span>
          </span>
          <span className="text-[10px] font-mono-ui px-1.5 py-0.2 rounded border border-[var(--ink-soft)]">
            {savedCount}
          </span>
        </button>

        <button
          id="cmd-k-trigger-btn"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[var(--graphite)] hover:text-[var(--ink)] hover:bg-[var(--vellum-raised)] transition-colors rounded-[2px]"
          title="Command Palette (Cmd+K)"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={13} />
            <span className="text-[11px] uppercase tracking-wider font-apparatus">Commands</span>
          </span>
          <kbd className="text-[10px] font-mono-ui text-[var(--graphite)] border border-[var(--ink-soft)] px-1 rounded">
            ⌘K
          </kbd>
        </button>

        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[var(--graphite)] hover:text-[var(--ink)] hover:bg-[var(--vellum-raised)] transition-colors rounded-[2px]"
            title="Keyboard Shortcuts (?)"
          >
            <span className="flex items-center gap-2">
              <HelpCircle size={13} className="text-[var(--gold)]" />
              <span className="text-[11px] uppercase tracking-wider font-apparatus">Shortcuts</span>
            </span>
            <kbd className="text-[10px] font-mono-ui text-[var(--graphite)] border border-[var(--ink-soft)] px-1 rounded">
              ?
            </kbd>
          </button>
        )}

        {onOpenOnboarding && (
          <button
            onClick={onOpenOnboarding}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[var(--graphite)] hover:text-[var(--ink)] hover:bg-[var(--vellum-raised)] transition-colors rounded-[2px]"
            title="Open Codex Guide Note"
          >
            <span className="flex items-center gap-2">
              <Feather size={13} className="text-[var(--rubric)]" />
              <span className="text-[11px] uppercase tracking-wider font-apparatus">Guide Note</span>
            </span>
            <span className="text-[10px] font-hand text-[var(--ink-blue)]">read</span>
          </button>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[var(--graphite)] hover:text-[var(--ink)] hover:bg-[var(--vellum-raised)] transition-colors rounded-[2px]"
            title="Configure provider connections and models"
          >
            <span className="flex items-center gap-2">
              <KeyRound size={13} className="text-[var(--rubric)]" />
              <span className="text-[11px] uppercase tracking-wider font-apparatus">Connections</span>
            </span>
          </button>
        )}

        <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-[var(--graphite)]">
          <button
            id="theme-toggle-btn"
            onClick={onToggleDark}
            className="flex items-center gap-1.5 hover:text-[var(--ink)] transition-colors"
            title="Toggle night desk mode"
          >
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
            <span className="text-[10px] uppercase tracking-wider">
              {isDark ? "Day" : "Night"}
            </span>
          </button>
          <span className="text-[9px] font-mono-ui text-[var(--graphite)] opacity-70">
            v3.2
          </span>
        </div>
      </div>
    </aside>
  );
};
