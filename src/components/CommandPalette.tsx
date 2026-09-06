import React, { useState, useEffect } from "react";
import { Search, Sparkles, Sliders, Play, Archive, Moon, Sun, Download, FileText, PlusCircle } from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateStage: (stage: 1 | 2 | 3 | 4 | 5) => void;
  onOpenVault: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
  onNewScenario: () => void;
  onOpenExport: () => void;
  hasDocument: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateStage,
  onOpenVault,
  onToggleTheme,
  isDark,
  onNewScenario,
  onOpenExport,
  hasDocument,
}) => {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery("");
        }
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: "new-scenario",
      title: "New Scenario Spark",
      subtitle: "Clear workspace and draft a new concept",
      icon: <PlusCircle size={14} className="text-[var(--rubric)]" />,
      run: () => {
        onNewScenario();
        onClose();
      },
    },
    {
      id: "stage-1",
      title: "Go to Stage 1: Spark",
      subtitle: "Lay down raw premise and examine anchors",
      icon: <Sparkles size={14} />,
      run: () => {
        onNavigateStage(1);
        onClose();
      },
    },
    {
      id: "stage-2",
      title: "Go to Stage 2: Divergence",
      subtitle: "Explore four competing angles on the premise",
      icon: <FileText size={14} />,
      run: () => {
        onNavigateStage(2);
        onClose();
      },
    },
    {
      id: "stage-3",
      title: "Go to Stage 3: Physics",
      subtitle: "Adjust density, mundanity, and expansion notes",
      icon: <Sliders size={14} />,
      run: () => {
        onNavigateStage(3);
        onClose();
      },
    },
    {
      id: "stage-4",
      title: "Go to Stage 4: Forge",
      subtitle: "Live synthesis and ink streaming",
      icon: <Play size={14} />,
      run: () => {
        onNavigateStage(4);
        onClose();
      },
    },
    {
      id: "stage-5",
      title: "Go to Stage 5: Refine Manuscript",
      subtitle: "Inspect lorebook, locks, and handwritten notes",
      icon: <FileText size={14} />,
      run: () => {
        onNavigateStage(5);
        onClose();
      },
    },
    {
      id: "open-vault",
      title: "Open The Vault",
      subtitle: "Browse saved scenario manuscripts",
      icon: <Archive size={14} className="text-[var(--rubric)]" />,
      run: () => {
        onOpenVault();
        onClose();
      },
    },
    ...(hasDocument
      ? [
          {
            id: "export-doc",
            title: "Export Manuscript",
            subtitle: "SillyTavern JSON, Lumiverse, Chub, or Markdown",
            icon: <Download size={14} className="text-[var(--sage)]" />,
            run: () => {
              onOpenExport();
              onClose();
            },
          },
        ]
      : []),
    {
      id: "toggle-theme",
      title: isDark ? "Switch to Day Vellum" : "Switch to Night Desk",
      subtitle: "Invert paper washes and lamp glow",
      icon: isDark ? <Sun size={14} /> : <Moon size={14} />,
      run: () => {
        onToggleTheme();
        onClose();
      },
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      id="command-palette-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="command-palette-modal"
        className="w-full max-w-lg manuscript-sheet bg-[var(--vellum)] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="flex items-center px-4 py-3 border-b border-[var(--ink-soft)] gap-2.5 shrink-0">
          <Search size={15} className="text-[var(--graphite)] shrink-0" />
          <input
            id="command-palette-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or navigate to a stage..."
            className="w-full bg-transparent border-none outline-none font-apparatus text-xs text-[var(--ink)] placeholder:text-[var(--graphite)]/60"
            autoFocus
          />
          <kbd className="text-[10px] font-mono-ui text-[var(--graphite)] border border-[var(--ink-soft)] px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Action list */}
        <div className="py-2 max-h-[60vh] sm:max-h-72 overflow-y-auto min-h-0 overscroll-contain flex-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--graphite)] font-manuscript italic">
              No matching commands.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.run}
                className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-[var(--vellum-raised)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[var(--graphite)] group-hover:text-[var(--ink)]">
                    {item.icon}
                  </span>
                  <div>
                    <div className="text-xs font-apparatus font-medium text-[var(--ink)]">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-[var(--graphite)] font-manuscript">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono-ui text-[var(--graphite)] opacity-0 group-hover:opacity-100 transition-opacity">
                  ↵
                </span>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-[var(--ink-soft)] text-[10px] text-[var(--graphite)] bg-[var(--vellum-deep)]/40 flex justify-between font-mono-ui">
          <span>Lore Bible Command Apparatus</span>
          <span>Use ↑↓ and ↵ to select</span>
        </div>
      </div>
    </div>
  );
};
