import React, { useState } from "react";
import type { NavDestination, LegacyStageId, GenerationTelemetryView } from "./types";
import type { SavedLoreBibleProjectV2 } from "../../lib/projectPersistence";
import { DesktopRail } from "./DesktopRail";
import { MobileNav } from "./MobileNav";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { JourneyStrip } from "./JourneyStrip";
import { ProjectHome } from "./ProjectHome";
import { QuickActionsSheet } from "./QuickActionsSheet";
import { ActivityShelf } from "./ActivityShelf";
import { Globe, Clock, Hammer, ArrowLeft, Feather, ChevronDown, X } from "lucide-react";

interface AdventureStudioShellProps {
  currentStage: LegacyStageId;
  maxUnlockedStage: LegacyStageId;
  onSelectStage: (stage: LegacyStageId) => void;
  workingTitle?: string;
  sparkText?: string;
  isSaved?: boolean;
  savedProjects: SavedLoreBibleProjectV2[];
  onSaveScenario: () => void;
  onNewScenario: () => void;
  onOpenVault: () => void;
  onLoadSavedProject?: (project: SavedLoreBibleProjectV2) => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts?: () => void;
  onToggleMargin?: () => void;
  isMarginOpen?: boolean;
  marginBadgeCount?: number;
  isDark: boolean;
  onToggleDark: () => void;
  telemetry: GenerationTelemetryView;
  marginPanel?: React.ReactNode;
  children: React.ReactNode;
}

export const AdventureStudioShell: React.FC<AdventureStudioShellProps> = ({
  currentStage,
  maxUnlockedStage,
  onSelectStage,
  workingTitle,
  sparkText,
  isSaved = true,
  savedProjects,
  onSaveScenario,
  onNewScenario,
  onOpenVault,
  onLoadSavedProject,
  onOpenCommandPalette,
  onOpenSettings,
  onOpenShortcuts,
  onToggleMargin,
  isMarginOpen,
  marginBadgeCount,
  isDark,
  onToggleDark,
  telemetry,
  marginPanel,
  children,
}) => {
  const [activeNav, setActiveNav] = useState<NavDestination>("write");
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isJourneySheetOpen, setIsJourneySheetOpen] = useState(false);

  const getStageName = (stage: LegacyStageId) => {
    switch (stage) {
      case 1:
        return "Spark";
      case 2:
        return "Divergence";
      case 3:
        return "Blueprint";
      case 4:
        return "The Forge";
      case 5:
        return "Refine Studio";
      default:
        return `Stage ${stage}`;
    }
  };

  const handleSelectNav = (dest: NavDestination) => {
    if (dest === "library") {
      onOpenVault();
      return;
    }
    if (dest === "build") {
      // Stage 3 is Blueprint (Rules & Physics), Stage 4 is Forge
      if (currentStage < 3 && maxUnlockedStage >= 3) {
        onSelectStage(3);
      }
      setActiveNav("write");
      return;
    }
    setActiveNav(dest);
  };

  return (
    <div
      id="adventure-studio-shell"
      className="adventure-journal-theme flex h-screen w-screen overflow-hidden select-none bg-[var(--surface-app)] text-[var(--text-primary)]"
    >
      {/* 1. Desktop Application Rail */}
      <div className="hidden md:flex h-full shrink-0">
        <DesktopRail
          activeNav={activeNav}
          onSelectNav={handleSelectNav}
          savedCount={savedProjects.length}
          onOpenSettings={onOpenSettings}
          onOpenShortcuts={onOpenShortcuts}
          isDark={isDark}
          onToggleDark={onToggleDark}
        />
      </div>

      {/* 2. Main Content Stack */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden relative">
        {/* Workspace Context Header */}
        <WorkspaceHeader
          workingTitle={workingTitle}
          isSaved={isSaved}
          onOpenCommandPalette={onOpenCommandPalette}
          onToggleMargin={activeNav === "write" ? onToggleMargin : undefined}
          isMarginOpen={isMarginOpen}
          marginBadgeCount={marginBadgeCount}
        />

        {/* Mobile Compact Stage Identity & Journey Drawer Trigger */}
        {activeNav === "write" && (
          <div className="md:hidden border-b border-[var(--border-soft)] bg-[var(--surface-panel)]/90 px-3 py-1.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsJourneySheetOpen(true)}
              className="flex items-center gap-1.5 text-xs font-apparatus text-[var(--text-primary)] hover:text-[var(--accent-gold)] cursor-pointer"
            >
              <span className="font-mono font-bold text-[10px] text-[var(--accent-gold)]">
                Stage {currentStage} of 5
              </span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="font-semibold">{getStageName(currentStage)}</span>
              <ChevronDown size={13} className="text-[var(--text-muted)] ml-0.5" />
            </button>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {currentStage === 5 ? "Manuscript Complete" : `Max Stage ${maxUnlockedStage}`}
            </span>
          </div>
        )}

        {/* 3. Main Outlet Viewport with contextual Margin Panel */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-row overflow-hidden relative">
          <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
            <main
              id="adventure-workspace-outlet"
              className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden pb-24 md:pb-8 relative scroll-smooth"
            >
              {activeNav === "home" && (
                <ProjectHome
                  workingTitle={workingTitle}
                  sparkText={sparkText}
                  currentStage={currentStage}
                  maxUnlockedStage={maxUnlockedStage}
                  savedProjects={savedProjects}
                  generationTelemetry={telemetry}
                  isSaved={isSaved}
                  onContinueWriting={() => setActiveNav("write")}
                  onSelectStage={(stage) => {
                    onSelectStage(stage);
                    setActiveNav("write");
                  }}
                  onNewScenario={onNewScenario}
                  onOpenVault={onOpenVault}
                  onOpenCommandPalette={onOpenCommandPalette}
                  onOpenSettings={onOpenSettings}
                  onLoadSavedProject={onLoadSavedProject}
                />
              )}

              {activeNav === "write" && (
                <div className="px-3 sm:px-6 md:px-8 py-4 max-w-5xl mx-auto w-full">
                  {children}
                </div>
              )}

            {activeNav === "world" && (
              <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[var(--surface-panel)] border border-[var(--border-gold)] flex items-center justify-center text-[var(--accent-gold)] mx-auto shadow-md">
                  <Globe size={22} />
                </div>
                <h2 className="text-xl font-bold font-serif-title text-[var(--text-primary)]">
                  World Intelligence & Codex
                </h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
                  Canonical Lorebook management, entity graphs, and deep worldbook navigation are planned for the upcoming M4 Lore Quality milestone.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveNav("write")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-xs text-[var(--text-primary)] font-semibold transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Return to Writing Studio</span>
                </button>
              </div>
            )}

            {activeNav === "timeline" && (
              <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[var(--surface-panel)] border border-[var(--border-gold)] flex items-center justify-center text-[var(--accent-gold)] mx-auto shadow-md">
                  <Clock size={22} />
                </div>
                <h2 className="text-xl font-bold font-serif-title text-[var(--text-primary)]">
                  Chronology & Timeline
                </h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
                  Era sequencing and temporal relationship tracking are scheduled for future production compiler releases.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveNav("write")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-soft)] hover:border-[var(--accent-gold)] text-xs text-[var(--text-primary)] font-semibold transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Return to Writing Studio</span>
                </button>
              </div>
            )}
          </main>

          {/* Desktop Bottom Journey Strip: firmly docked at the base of the center workspace */}
          {activeNav === "write" && (
            <div className="hidden md:block shrink-0 border-t border-[var(--border-soft)] z-30 bg-[var(--surface-app)]">
              <JourneyStrip
                currentStage={currentStage}
                maxUnlockedStage={maxUnlockedStage}
                onSelectStage={onSelectStage}
                variant="desktop-bar"
              />
            </div>
          )}
        </div>

        {/* Persistent Docked Margin Panel on XL screens */}
        {isMarginOpen && marginPanel && (
          <div className="hidden xl:flex w-72 h-full shrink-0 border-l border-[var(--border-soft)] bg-[var(--surface-panel)] flex-col overflow-hidden z-20">
            {marginPanel}
          </div>
        )}
      </div>

        {/* Global Activity Shelf (Desktop Dock Strip & Mobile Floating Pill) */}
        <ActivityShelf telemetry={telemetry} />
      </div>

      {/* 4. Mobile Permanent Bottom Navigation */}
      <MobileNav
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        onOpenQuickActions={() => setIsQuickActionsOpen(true)}
        savedCount={savedProjects.length}
        onOpenSettings={onOpenSettings}
        onOpenShortcuts={onOpenShortcuts}
      />

      {/* 5. Mobile Quick Actions Sheet */}
      <QuickActionsSheet
        isOpen={isQuickActionsOpen}
        onClose={() => setIsQuickActionsOpen(false)}
        onNewScenario={onNewScenario}
        onSaveScenario={onSaveScenario}
        onOpenVault={onOpenVault}
        onOpenCommandPalette={onOpenCommandPalette}
        onOpenSettings={onOpenSettings}
        onSelectStage={(stage) => {
          onSelectStage(stage);
          setActiveNav("write");
        }}
        currentStage={currentStage}
        maxUnlockedStage={maxUnlockedStage}
      />

      {/* 6. Mobile Journey Sheet Modal */}
      {isJourneySheetOpen && (
        <div
          role="dialog"
          aria-label="Adventure Journey"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-fade-in"
          onClick={() => setIsJourneySheetOpen(false)}
        >
          <div
            className="bg-[var(--surface-panel-raised)] border-t border-[var(--border-soft)] rounded-t-xl p-4 space-y-3 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-gold)] font-bold">
                  Adventure Journey
                </span>
                <h3 className="text-sm font-serif-title font-semibold text-[var(--text-primary)]">
                  5 Fabrication Stages
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsJourneySheetOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
                aria-label="Close Journey Sheet"
              >
                <X size={16} />
              </button>
            </div>

            <JourneyStrip
              currentStage={currentStage}
              maxUnlockedStage={maxUnlockedStage}
              onSelectStage={(s) => {
                onSelectStage(s);
                setIsJourneySheetOpen(false);
              }}
              variant="mobile-strip"
            />
          </div>
        </div>
      )}
    </div>
  );
};
