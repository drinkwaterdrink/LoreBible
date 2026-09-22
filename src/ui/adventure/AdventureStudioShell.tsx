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
import { Globe, Clock, Hammer, ArrowLeft, Feather } from "lucide-react";

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

        {/* Mobile Workflow Strip (visible on mobile in Write view) */}
        {activeNav === "write" && (
          <div className="md:hidden border-b border-[var(--border-soft)] bg-[var(--surface-panel)]/80 px-2 py-1">
            <JourneyStrip
              currentStage={currentStage}
              maxUnlockedStage={maxUnlockedStage}
              onSelectStage={onSelectStage}
              variant="mobile-strip"
            />
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
    </div>
  );
};
