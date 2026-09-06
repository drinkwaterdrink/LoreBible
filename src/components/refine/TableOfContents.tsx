import React from "react";
import { LoreBibleDocument } from "../../types";

export interface TocSectionItem {
  id: string;
  label: string;
  count?: number;
  permanence: "P" | "C" | "T";
}

interface TableOfContentsProps {
  document: LoreBibleDocument;
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
  marginaliaCount: number;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  document,
  activeSectionId,
  onSelectSection,
  marginaliaCount,
}) => {
  const sections: TocSectionItem[] = [
    { id: "core", label: "Core Scenario Seed", count: 1, permanence: "P" },
    { id: "user", label: "User Role & Hooks", count: 1, permanence: "P" },
    { id: "worldPhysics", label: "World Physics & Rules", count: document.worldPhysics?.rules?.length || 1, permanence: "C" },
    { id: "status", label: "Current Status Block", count: 1, permanence: "P" },
    { id: "locations", label: "Location Seeds", count: document.locations?.length || 0, permanence: "C" },
    { id: "factions", label: "Faction Seeds", count: document.factions?.length || 0, permanence: "C" },
    { id: "npcs", label: "NPC Cast Seeds", count: document.npcs?.length || 0, permanence: "C" },
    { id: "relationshipWeb", label: "Relationship Web", count: document.relationshipWeb?.length || 0, permanence: "C" },
    { id: "knowledgeMap", label: "Knowledge Map", count: document.knowledgeMap?.length || 0, permanence: "C" },
    { id: "items", label: "Item & Ability Seeds", count: document.items?.length || 0, permanence: "C" },
    { id: "secrets", label: "Secret Seeds", count: document.secrets?.length || 0, permanence: "C" },
    { id: "conflict", label: "Conflict Architecture", count: 1, permanence: "P" },
    { id: "pressureProtocol", label: "Pressure Protocol", count: 1, permanence: "P" },
    { id: "pressures", label: "Pressures & Clocks", count: document.pressures?.length || 0, permanence: "C" },
    { id: "proceduralRolls", label: "Procedural Rolls", count: document.proceduralRolls?.length || 0, permanence: "C" },
    { id: "opening", label: "Opening Scene & Prompt", count: 1, permanence: "T" },
    { id: "antiGravity", label: "Anti-Gravity Notes", count: document.antiGravity?.temptations?.length || 0, permanence: "P" },
    { id: "testBench", label: "Pre-Flight Test Bench", count: 5, permanence: "P" },
  ];

  return (
    <nav
      id="manuscript-table-of-contents"
      aria-label="Manuscript Table of Contents"
      className="w-full pr-4 select-none font-apparatus text-[11px]"
    >
      {/* Header */}
      <div className="pb-3 mb-2 border-b border-[var(--ink-soft)]/50">
        <span className="font-apparatus uppercase tracking-widest text-[9px] text-[var(--graphite)] block">
          Table of Contents
        </span>
        <span className="font-manuscript text-xs italic text-[var(--ink)]">
          {document.core?.title || "Working Manuscript"}
        </span>
      </div>

      {/* Proofreader marginalia indicator if any */}
      {marginaliaCount > 0 && (
        <div className="mb-3 py-1 px-2 border-l border-[var(--gold)] text-[10px] text-[var(--gold)] font-hand text-sm flex items-center justify-between">
          <span>{marginaliaCount} proofreader marginalia</span>
          <span className="font-mono-ui text-[9px]">✍</span>
        </div>
      )}

      {/* The slim list: small caps, hairline leader dots, entry counts, ochre bullet on active */}
      <ul className="space-y-1.5 list-none p-0 m-0">
        {sections.map((sec) => {
          const isActive = activeSectionId === sec.id;
          return (
            <li key={sec.id} className="m-0 p-0">
              <button
                type="button"
                onClick={() => onSelectSection(sec.id)}
                className="w-full flex items-baseline justify-between text-left py-0.5 group cursor-pointer bg-transparent border-0"
              >
                {/* Ochre bullet for active, quiet space for inactive */}
                <span className="w-3 shrink-0 text-center text-[10px] leading-none">
                  {isActive ? (
                    <span className="text-[var(--gold)] font-bold animate-pulse">•</span>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-40 text-[var(--graphite)]">·</span>
                  )}
                </span>

                {/* Section title in small caps */}
                <span
                  className={`uppercase tracking-wider text-[10px] truncate max-w-[135px] transition-colors ${
                    isActive
                      ? "text-[var(--ink)] font-semibold"
                      : "text-[var(--graphite)] group-hover:text-[var(--ink)]"
                  }`}
                  style={{ fontVariant: "all-small-caps" }}
                >
                  {sec.label}
                </span>

                {/* Hairline leader dots */}
                <span className="flex-1 mx-1.5 border-b border-dotted border-[var(--ink-soft)] opacity-40 self-center" />

                {/* Entry count in numbers */}
                <span className="font-mono-ui text-[10px] text-[var(--graphite)] shrink-0 group-hover:text-[var(--ink)]">
                  {sec.count !== undefined ? sec.count : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
