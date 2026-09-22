import React from "react";
import type { NavDestination } from "./types";
import {
  Home,
  Feather,
  Globe,
  Hammer,
  Clock,
  Archive,
  Settings,
  Moon,
  Sun,
  HelpCircle,
} from "lucide-react";
import { AppVersionBadge } from "../../components/AppVersionBadge";

interface DesktopRailProps {
  activeNav: NavDestination;
  onSelectNav: (dest: NavDestination) => void;
  savedCount: number;
  onOpenSettings: () => void;
  onOpenShortcuts?: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

interface NavItemDef {
  id: NavDestination;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
  hint?: string;
}

export const DesktopRail: React.FC<DesktopRailProps> = ({
  activeNav,
  onSelectNav,
  savedCount,
  onOpenSettings,
  onOpenShortcuts,
  isDark,
  onToggleDark,
}) => {
  const navItems: NavItemDef[] = [
    { id: "home", label: "Home", icon: Home, hint: "Overview & project dashboard" },
    { id: "write", label: "Write", icon: Feather, hint: "Active writing & world studio" },
    { id: "world", label: "World", icon: Globe, hint: "World bible & entities" },
    { id: "build", label: "Build", icon: Hammer, hint: "Blueprint & Forge synthesis" },
    { id: "timeline", label: "Timeline", icon: Clock, hint: "Chronology & sequence" },
    { id: "library", label: "Library", icon: Archive, badge: savedCount, hint: "Vault manuscripts & projects" },
  ];

  return (
    <aside
      id="adventure-desktop-rail"
      aria-label="Application Navigation"
      className="adventure-rail w-56 shrink-0 h-full bg-[var(--surface-sidebar)] border-r border-[var(--border-soft)] flex flex-col justify-between select-none py-4 px-3 overflow-y-auto overscroll-contain"
    >
      <div>
        {/* Brand Header with Pixel Influence */}
        <div className="flex items-center justify-between mb-6 px-2 pt-1">
          <div className="flex items-center gap-2.5">
            {/* Pixel Logo Glyph */}
            <div className="w-8 h-8 rounded-[3px] bg-[var(--surface-panel)] border border-[var(--border-gold)] flex items-center justify-center text-[var(--accent-gold)] shadow-[0_0_8px_rgba(212,175,55,0.2)]">
              <span className="font-mono-ui font-black text-sm tracking-tighter">§</span>
            </div>
            <div>
              <div className="font-semibold text-xs tracking-wider text-[var(--text-primary)] uppercase flex items-center gap-1.5">
                <span>LORE BIBLE</span>
                <AppVersionBadge />
              </div>
              <div className="text-[10px] text-[var(--accent-gold)] font-mono-ui tracking-wider uppercase opacity-85">
                Adventure Journal
              </div>
            </div>
          </div>
        </div>

        {/* Primary Navigation Destinations */}
        <nav className="space-y-1" aria-label="Primary Navigation">
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectNav(item.id)}
                aria-current={isActive ? "page" : undefined}
                title={item.hint}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-[3px] text-xs font-apparatus transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--surface-panel)] text-[var(--accent-gold)] border border-[var(--accent-gold)] font-semibold shadow-[inset_2px_0_0_var(--accent-gold)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-panel)]/50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={15} className={isActive ? "text-[var(--accent-gold)]" : "opacity-75"} />
                  <span className="tracking-wide">{item.label}</span>
                </div>

                {typeof item.badge === "number" && item.badge > 0 && (
                  <span
                    className={`font-mono-ui text-[10px] px-1.5 py-0.5 rounded-full border leading-none ${
                      isActive
                        ? "bg-[var(--accent-gold)]/20 border-[var(--accent-gold)] text-[var(--accent-gold)]"
                        : "bg-[var(--surface-panel)] border-[var(--border-soft)] text-[var(--text-muted)]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Utility Footer: Theme, Shortcuts, Settings */}
      <div className="pt-4 border-t border-[var(--border-soft)]/75 space-y-1 px-1">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onToggleDark}
            className="p-1.5 rounded-[3px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-panel)] border border-transparent transition-all cursor-pointer"
            title={isDark ? "Switch to daylight vellum" : "Switch to midnight slate"}
            aria-label="Toggle visual theme"
          >
            {isDark ? <Sun size={14} className="text-[var(--accent-gold)]" /> : <Moon size={14} />}
          </button>

          {onOpenShortcuts && (
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="p-1.5 rounded-[3px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-panel)] border border-transparent transition-all cursor-pointer"
              title="Keyboard Shortcuts"
              aria-label="Keyboard Shortcuts"
            >
              <HelpCircle size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded-[3px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-panel)] border border-transparent transition-all cursor-pointer"
            title="Settings & UI Mode"
            aria-label="Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
};
