import React, { useState, useRef, useEffect } from "react";
import { ProceduralRollGroup, LoreBibleDocument } from "../../types";
import { suggestRollsApi } from "../../services/geminiService";
import { Dice5, Copy, Check, Plus, Trash2, Sparkles, Wand2, Info } from "lucide-react";
import { HandDrawnEmptyState } from "../HandDrawnEmptyState";

interface ProceduralRollsEditorProps {
  document: LoreBibleDocument;
  onUpdateGroups: (groups: ProceduralRollGroup[]) => void;
  sparkText?: string;
}

const SEGMENT_COLORS = [
  { bg: "bg-[#C49339]", text: "text-[#2B1F0A]", hex: "#C49339", label: "Ochre" },
  { bg: "bg-[#5F7B59]", text: "text-[#12240E]", hex: "#5F7B59", label: "Sage" },
  { bg: "bg-[#5B554D]", text: "text-[#FFFFFF]", hex: "#5B554D", label: "Graphite" },
  { bg: "bg-[#9E4738]", text: "text-[#FFFFFF]", hex: "#9E4738", label: "Terracotta" },
  { bg: "bg-[#3D5268]", text: "text-[#FFFFFF]", hex: "#3D5268", label: "Slate Ink" },
  { bg: "bg-[#7A5B40]", text: "text-[#FFFFFF]", hex: "#7A5B40", label: "Umber" },
];

/** Renders a genuine handwritten five-bar tally gate bundle */
function FiveBarTally({ count }: { count: number }) {
  if (count <= 0) return <span className="text-[11px] font-mono-ui text-[var(--graphite)] opacity-40">—</span>;

  const fullGates = Math.floor(count / 5);
  const remainder = count % 5;

  return (
    <div className="inline-flex items-center gap-1.5 align-middle select-none">
      {Array.from({ length: fullGates }).map((_, i) => (
        <svg
          key={`gate-${i}`}
          width="26"
          height="16"
          viewBox="0 0 26 16"
          className="stroke-[var(--rubric)] text-[var(--rubric)] inline-block overflow-visible opacity-90"
        >
          {/* 4 vertical tally strokes */}
          <line x1="5" y1="2" x2="5" y2="14" strokeWidth="1.75" strokeLinecap="round" />
          <line x1="10" y1="2" x2="10" y2="14" strokeWidth="1.75" strokeLinecap="round" />
          <line x1="15" y1="2" x2="15" y2="14" strokeWidth="1.75" strokeLinecap="round" />
          <line x1="20" y1="2" x2="20" y2="14" strokeWidth="1.75" strokeLinecap="round" />
          {/* Diagonal slash across all four */}
          <line x1="2" y1="13" x2="23" y2="3" strokeWidth="1.85" strokeLinecap="round" />
        </svg>
      ))}

      {remainder > 0 && (
        <svg
          width={remainder * 5 + 6}
          height="16"
          viewBox={`0 0 ${remainder * 5 + 6} 16`}
          className="stroke-[var(--rubric)] text-[var(--rubric)] inline-block overflow-visible opacity-90"
        >
          {Array.from({ length: remainder }).map((_, r) => (
            <line
              key={`rem-${r}`}
              x1={r * 5 + 4}
              y1="2"
              x2={r * 5 + 4}
              y2="14"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          ))}
        </svg>
      )}

      <span className="font-mono-ui text-[10px] text-[var(--graphite)] ml-0.5">({count})</span>
    </div>
  );
}

export const ProceduralRollsEditor: React.FC<ProceduralRollsEditorProps> = ({
  document,
  onUpdateGroups,
  sparkText,
}) => {
  const rollGroups = document.proceduralRolls || [];
  const [activeGroupId, setActiveGroupId] = useState<string>(rollGroups[0]?.id || "");
  const [copiedSettingsId, setCopiedSettingsId] = useState<string | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<{ dividerIndex: number; startX: number } | null>(null);

  // Roll results & tallies per group
  // groupId -> { rollNumber: number, outcomeText: string, outcomeIndex: number, timestamp: number }
  const [lastRolls, setLastRolls] = useState<
    Record<
      string,
      { rollNumber: number; outcomeText: string; outcomeIndex: number; timestamp: number }
    >
  >({});

  // Tallies: groupId -> Record<outcomeIndex, count>
  const [rollTallies, setRollTallies] = useState<Record<string, Record<number, number>>>({});

  // Ensure active group is valid
  useEffect(() => {
    if (rollGroups.length > 0 && (!activeGroupId || !rollGroups.some((g) => g.id === activeGroupId))) {
      setActiveGroupId(rollGroups[0].id);
    }
  }, [rollGroups, activeGroupId]);

  const activeGroup = rollGroups.find((g) => g.id === activeGroupId) || rollGroups[0];

  const handleCopySettings = (group: ProceduralRollGroup) => {
    const text = group.settings || "Position: System | Depth: 0 | Order: 100 | Prevent-Recursion: On | Sticky: 4";
    navigator.clipboard.writeText(text);
    setCopiedSettingsId(group.id);
    setTimeout(() => {
      setCopiedSettingsId(null);
    }, 2000);
  };

  const handleRoll = (group: ProceduralRollGroup) => {
    if (!group.entries || group.entries.length === 0) return;

    // Roll random 1..100
    const roll = Math.floor(Math.random() * 100) + 1;
    let accumulated = 0;
    let selectedIdx = 0;

    for (let i = 0; i < group.entries.length; i++) {
      accumulated += group.entries[i].weight;
      if (roll <= accumulated || i === group.entries.length - 1) {
        selectedIdx = i;
        break;
      }
    }

    const wonOutcome = group.entries[selectedIdx]?.outcome || "Outcome triggered";

    // Set last roll with fresh timestamp for ink-bleed animation
    setLastRolls((prev) => ({
      ...prev,
      [group.id]: {
        rollNumber: roll,
        outcomeText: wonOutcome,
        outcomeIndex: selectedIdx,
        timestamp: Date.now(),
      },
    }));

    // Update tally for this outcome
    setRollTallies((prev) => {
      const currentGroupTallies = prev[group.id] || {};
      const newCount = (currentGroupTallies[selectedIdx] || 0) + 1;
      return {
        ...prev,
        [group.id]: {
          ...currentGroupTallies,
          [selectedIdx]: newCount,
        },
      };
    });
  };

  const handleUpdateGroupName = (groupId: string, newName: string) => {
    const updated = rollGroups.map((g) => (g.id === groupId ? { ...g, name: newName } : g));
    onUpdateGroups(updated);
  };

  const handleUpdateGroupKeys = (groupId: string, rawKeys: string) => {
    const keysArray = rawKeys.split(",").map((k) => k.trim().toUpperCase()).filter(Boolean);
    const updated = rollGroups.map((g) => (g.id === groupId ? { ...g, triggerKeys: keysArray } : g));
    onUpdateGroups(updated);
  };

  const handleUpdateOutcomeText = (groupId: string, entryId: string, newText: string) => {
    const updated = rollGroups.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        entries: g.entries.map((e) => (e.id === entryId ? { ...e, outcome: newText } : e)),
      };
    });
    onUpdateGroups(updated);
  };

  /** Proportional weight adjustment when dragging stacked bar dividers */
  const handleDividerDrag = (groupId: string, dividerIndex: number, deltaPct: number) => {
    const group = rollGroups.find((g) => g.id === groupId);
    if (!group || !group.entries || group.entries.length < 2) return;

    const entries = [...group.entries];
    const leftEntry = entries[dividerIndex];
    const rightEntry = entries[dividerIndex + 1];
    if (!leftEntry || !rightEntry) return;

    const minWeight = 5;
    const maxShiftLeft = leftEntry.weight - minWeight;
    const maxShiftRight = rightEntry.weight - minWeight;

    // Constrain delta
    const clampedDelta = Math.max(-maxShiftLeft, Math.min(maxShiftRight, Math.round(deltaPct)));
    if (clampedDelta === 0) return;

    leftEntry.weight += clampedDelta;
    rightEntry.weight -= clampedDelta;

    // Ensure total is 100
    const currentSum = entries.reduce((acc, e) => acc + e.weight, 0);
    if (currentSum !== 100) {
      entries[entries.length - 1].weight += 100 - currentSum;
    }

    const updated = rollGroups.map((g) => (g.id === groupId ? { ...g, entries } : g));
    onUpdateGroups(updated);
  };

  const handleStartDividerDrag = (e: React.MouseEvent, dividerIndex: number) => {
    e.preventDefault();
    isDraggingRef.current = { dividerIndex, startX: e.clientX };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !barRef.current) return;
      const barRect = barRef.current.getBoundingClientRect();
      if (barRect.width <= 0) return;
      const deltaX = moveEvent.clientX - isDraggingRef.current.startX;
      const deltaPct = (deltaX / barRect.width) * 100;
      if (Math.abs(deltaPct) >= 1) {
        handleDividerDrag(activeGroupId, isDraggingRef.current.dividerIndex, Math.round(deltaPct));
        isDraggingRef.current.startX = moveEvent.clientX;
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleStartDividerTouch = (e: React.TouchEvent, dividerIndex: number) => {
    const touch = e.touches[0];
    if (!touch) return;
    isDraggingRef.current = { dividerIndex, startX: touch.clientX };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!isDraggingRef.current || !barRef.current) return;
      const t = moveEvent.touches[0];
      if (!t) return;
      const barRect = barRef.current.getBoundingClientRect();
      if (barRect.width <= 0) return;
      const deltaX = t.clientX - isDraggingRef.current.startX;
      const deltaPct = (deltaX / barRect.width) * 100;
      if (Math.abs(deltaPct) >= 1) {
        handleDividerDrag(activeGroupId, isDraggingRef.current.dividerIndex, Math.round(deltaPct));
        isDraggingRef.current.startX = t.clientX;
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = null;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  const handleAddOutcome = (groupId: string) => {
    const group = rollGroups.find((g) => g.id === groupId);
    if (!group || group.entries.length >= 6) return;

    const newWeight = Math.max(5, Math.floor(100 / (group.entries.length + 1)));
    const entries = group.entries.map((e) => ({
      ...e,
      weight: Math.max(5, Math.floor((e.weight * (100 - newWeight)) / 100)),
    }));

    entries.push({
      id: `entry-${Date.now()}`,
      weight: newWeight,
      outcome: "New procedural event or complication...",
    });

    // Normalize to exactly 100
    const total = entries.reduce((s, e) => s + e.weight, 0);
    if (total !== 100) {
      entries[0].weight += 100 - total;
    }

    const updated = rollGroups.map((g) => (g.id === groupId ? { ...g, entries } : g));
    onUpdateGroups(updated);
  };

  const handleRemoveOutcome = (groupId: string, entryId: string) => {
    const group = rollGroups.find((g) => g.id === groupId);
    if (!group || group.entries.length <= 2) return;

    const remaining = group.entries.filter((e) => e.id !== entryId);
    // Redistribute weight to 100
    const currentTotal = remaining.reduce((s, e) => s + e.weight, 0);
    const scale = 100 / currentTotal;
    const normalized = remaining.map((e) => ({
      ...e,
      weight: Math.max(5, Math.round(e.weight * scale)),
    }));

    const finalSum = normalized.reduce((s, e) => s + e.weight, 0);
    if (finalSum !== 100) {
      normalized[0].weight += 100 - finalSum;
    }

    const updated = rollGroups.map((g) => (g.id === groupId ? { ...g, entries: normalized } : g));
    onUpdateGroups(updated);
  };

  const handleAddNewGroup = () => {
    const now = Date.now();
    const newGroup: ProceduralRollGroup = {
      id: `roll-custom-${now}`,
      name: "Environmental Hazard or Friction",
      triggerKeys: ["HAZARD", "ENVIRONMENT", "CROSSING"],
      settings: "Position: System | Depth: 0 | Order: 100 | Prevent-Recursion: On | Sticky: 4",
      entries: [
        { id: `ent-${now}-1`, weight: 30, outcome: "Clear passage with no delay or friction." },
        { id: `ent-${now}-2`, weight: 45, outcome: "Damp and poor footing slows movement; noise carries." },
        { id: `ent-${now}-3`, weight: 25, outcome: "Structural failure or toxic vent; damages gear or forces detour." },
      ],
    };
    const updated = [...rollGroups, newGroup];
    onUpdateGroups(updated);
    setActiveGroupId(newGroup.id);
  };

  const handleRemoveGroup = (groupId: string) => {
    if (rollGroups.length <= 1) return;
    const updated = rollGroups.filter((g) => g.id !== groupId);
    onUpdateGroups(updated);
    if (activeGroupId === groupId) {
      setActiveGroupId(updated[0]?.id || "");
    }
  };

  const handleSuggestRolls = async () => {
    try {
      setIsGeneratingSuggestions(true);
      const suggested = await suggestRollsApi({
        sparkText: sparkText || document.core?.title || "Scenario World",
      });
      if (suggested && suggested.length > 0) {
        onUpdateGroups(suggested);
        setActiveGroupId(suggested[0]?.id || "");
      }
    } catch (err) {
      console.error("Suggest rolls failed:", err);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Apparatus */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ink-soft)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30">
              <Dice5 size={18} />
            </span>
            <h2 className="text-xl font-manuscript font-bold text-[var(--ink)] tracking-tight">
              Procedural Roll Builder
            </h2>
            <span className="text-[10px] font-apparatus uppercase tracking-wider px-2 py-0.5 rounded border border-[var(--ink-soft)] bg-[var(--vellum-raised)] text-[var(--graphite)]">
              Anti-Positive Bias Engine
            </span>
          </div>
          <p className="text-xs font-manuscript text-[var(--graphite)] mt-1 max-w-2xl leading-relaxed">
            Weighted, mutually-exclusive lorebook groups operating as non-deterministic dice rollers.
            Counteracts the model&apos;s instinctive positive bias by strictly enforcing genuine mechanical costs and complications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSuggestRolls}
            disabled={isGeneratingSuggestions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-apparatus bg-[var(--vellum-raised)] border border-[var(--ink-soft)] text-[var(--ink)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all shadow-sm"
            title="Generate suggested roll groups tailored to this world"
          >
            <Wand2
              size={13}
              className={`text-[var(--gold)] ${
                isGeneratingSuggestions ? "animate-pulse" : ""
              }`}
            />
            <span>{isGeneratingSuggestions ? "Calibrating Tables..." : "Generate Setting Rolls"}</span>
          </button>

          <button
            type="button"
            onClick={handleAddNewGroup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-apparatus bg-[var(--ink)] text-[var(--vellum)] hover:opacity-90 transition-all shadow-sm font-medium"
          >
            <Plus size={13} />
            <span>New Roll Group</span>
          </button>
        </div>
      </div>

      {/* Group Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-[var(--ink-soft)]/60">
        {rollGroups.map((group, idx) => {
          const isActive = group.id === activeGroupId;
          const totalWeight = (group.entries || []).reduce((acc, e) => acc + e.weight, 0);
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setActiveGroupId(group.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-apparatus rounded-t-[2px] transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? "border-[var(--rubric)] bg-[var(--vellum-raised)] text-[var(--ink)] font-semibold shadow-xs"
                  : "border-transparent text-[var(--graphite)] hover:text-[var(--ink)] hover:bg-[var(--vellum-raised)]/40"
              }`}
            >
              <span className="font-mono-ui text-[10px] text-[var(--graphite)]">0{idx + 1}</span>
              <span>{group.name || "Untitled Group"}</span>
              <span
                className={`text-[9px] font-mono-ui px-1.5 py-0.2 rounded ${
                  totalWeight === 100
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                }`}
              >
                {totalWeight}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Group Editor */}
      {activeGroup && (
        <div className="p-5 rounded-[3px] border border-[var(--ink-soft)] bg-[var(--vellum-raised)] shadow-[var(--sheet-shadow)] space-y-6">
          {/* Group Metadata Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-6 space-y-1.5">
              <label className="block text-[11px] font-apparatus uppercase tracking-wider font-semibold text-[var(--graphite)]">
                Group Name
              </label>
              <input
                type="text"
                value={activeGroup.name}
                onChange={(e) => handleUpdateGroupName(activeGroup.id, e.target.value)}
                className="w-full px-3 py-1.5 rounded-[2px] text-sm font-manuscript font-bold text-[var(--ink)] bg-[var(--vellum)] border border-[var(--ink-soft)] focus:border-[var(--rubric)] focus:outline-none"
                placeholder="e.g. Tactical Action Outcome"
              />
            </div>

            <div className="md:col-span-5 space-y-1.5">
              <label className="block text-[11px] font-apparatus uppercase tracking-wider font-semibold text-[var(--graphite)]">
                Trigger Keywords (Comma-separated)
              </label>
              <input
                type="text"
                value={(activeGroup.triggerKeys || []).join(", ")}
                onChange={(e) => handleUpdateGroupKeys(activeGroup.id, e.target.value)}
                className="w-full px-3 py-1.5 rounded-[2px] text-xs font-mono-ui text-[var(--ink)] bg-[var(--vellum)] border border-[var(--ink-soft)] focus:border-[var(--rubric)] focus:outline-none"
                placeholder="CHECK, ATTEMPT, TACTICAL, STRIKE"
              />
            </div>

            <div className="md:col-span-1 flex items-center justify-end pt-6">
              {rollGroups.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveGroup(activeGroup.id)}
                  className="p-1.5 text-[var(--graphite)] hover:text-[var(--rubric)] hover:bg-[var(--rubric)]/10 rounded transition-all"
                  title="Delete this roll group"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Hand-Ruled Measuring Line Stacked Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-apparatus uppercase tracking-wider text-[11px] font-semibold text-[var(--graphite)]">
                  Hand-Ruled Probability Gauge
                </span>
                <span className="text-[10px] font-mono-ui text-[var(--graphite)] opacity-70">
                  (Drag dividers to adjust weights — strictly preserves 100% total)
                </span>
              </div>
              <div className="font-mono-ui text-xs font-semibold text-[var(--ink)]">
                Total: {(activeGroup.entries || []).reduce((s, e) => s + e.weight, 0)}%
              </div>
            </div>

            {/* The Horizontal Stacked Bar */}
            <div
              ref={barRef}
              className="relative w-full h-8 bg-[var(--vellum-deep)] rounded-[2px] border border-[var(--ink-soft)] p-0.5 flex overflow-hidden shadow-inner select-none"
            >
              {(activeGroup.entries || []).map((entry, idx) => {
                const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
                const widthPct = Math.max(5, entry.weight);
                const isNotLast = idx < (activeGroup.entries || []).length - 1;
                return (
                  <React.Fragment key={entry.id}>
                    <div
                      style={{ width: `${widthPct}%` }}
                      className={`h-full ${color.bg} ${color.text} relative flex items-center justify-center text-[10px] font-mono-ui font-semibold transition-all group overflow-hidden`}
                      title={`${entry.weight}%: ${entry.outcome}`}
                    >
                      <span className="truncate px-1 opacity-90 drop-shadow-xs">
                        {entry.weight}%
                      </span>
                    </div>
                    {isNotLast && (
                      <div
                        onMouseDown={(e) => handleStartDividerDrag(e, idx)}
                        onTouchStart={(e) => handleStartDividerTouch(e, idx)}
                        className="w-3 -mx-1.5 h-full cursor-col-resize z-10 flex items-center justify-center group/divider hover:bg-black/30 active:bg-black/45 transition-colors shrink-0"
                        title="Drag to adjust weights"
                      >
                        <div className="w-[2px] h-4 bg-white/80 rounded-full group-hover/divider:scale-y-125 transition-transform" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Segment Controls & Draggable Sliders */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
              {(activeGroup.entries || []).map((entry, idx) => {
                const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
                return (
                  <div
                    key={entry.id}
                    className="p-2 rounded-[2px] bg-[var(--vellum)] border border-[var(--ink-soft)] text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="font-mono-ui text-[11px] font-semibold">
                        #{idx + 1} ({entry.weight}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (idx > 0) handleDividerDrag(activeGroup.id, idx - 1, -5);
                          else if (activeGroup.entries.length > 1) handleDividerDrag(activeGroup.id, 0, 5);
                        }}
                        className="w-5 h-5 flex items-center justify-center font-mono-ui text-xs rounded border border-[var(--ink-soft)] hover:bg-[var(--vellum-raised)]"
                        title="Decrease weight by 5%"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (idx > 0) handleDividerDrag(activeGroup.id, idx - 1, 5);
                          else if (activeGroup.entries.length > 1) handleDividerDrag(activeGroup.id, 0, -5);
                        }}
                        className="w-5 h-5 flex items-center justify-center font-mono-ui text-xs rounded border border-[var(--ink-soft)] hover:bg-[var(--vellum-raised)]"
                        title="Increase weight by 5%"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roll It & Live Outcome Reveal */}
          <div className="p-4 rounded-[2px] border border-[var(--gold)]/30 bg-[var(--gold)]/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRoll(activeGroup)}
                  className="px-4 py-2 rounded-[2px] bg-[var(--gold)] text-[#1C1A17] font-apparatus font-bold text-xs flex items-center gap-2 hover:brightness-105 active:scale-98 transition-all shadow-sm"
                >
                  <Dice5 size={16} />
                  <span>Roll It (1d100)</span>
                </button>

                {lastRolls[activeGroup.id] && (
                  <span className="font-mono-ui text-xs font-semibold text-[var(--gold)] px-2 py-0.5 rounded bg-[var(--vellum-raised)] border border-[var(--gold)]/30">
                    Rolled: {lastRolls[activeGroup.id].rollNumber}
                  </span>
                )}
              </div>

              {lastRolls[activeGroup.id] ? (
                <div
                  key={lastRolls[activeGroup.id].timestamp}
                  className="mt-2 p-2.5 rounded-[2px] bg-[var(--vellum)] border-l-3 border-[var(--rubric)] text-xs font-manuscript text-[var(--ink)] leading-relaxed animate-in fade-in zoom-in-95 duration-300 shadow-xs"
                >
                  <span className="font-mono-ui uppercase text-[10px] text-[var(--rubric)] font-bold tracking-wider block mb-0.5">
                    Outcome Triggered (#{lastRolls[activeGroup.id].outcomeIndex + 1}):
                  </span>
                  {lastRolls[activeGroup.id].outcomeText}
                </div>
              ) : (
                <p className="text-[11px] font-manuscript italic text-[var(--graphite)] mt-1">
                  Click &apos;Roll It&apos; to test this dice group against its actual probabilities and trigger ink-bleed reveals.
                </p>
              )}
            </div>

            {/* Five-Bar Gate Tally Margin */}
            <div className="p-3 rounded-[2px] bg-[var(--vellum)] border border-[var(--ink-soft)] min-w-[200px] shrink-0">
              <span className="block text-[10px] font-apparatus uppercase tracking-wider font-semibold text-[var(--graphite)] mb-1.5">
                Roll History Tally
              </span>
              <div className="space-y-1.5">
                {(activeGroup.entries || []).map((_, eIdx) => {
                  const tallyCount = rollTallies[activeGroup.id]?.[eIdx] || 0;
                  const color = SEGMENT_COLORS[eIdx % SEGMENT_COLORS.length];
                  return (
                    <div key={eIdx} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.hex }} />
                        <span className="font-mono-ui text-[10px] text-[var(--graphite)]">#{eIdx + 1}</span>
                      </div>
                      <FiveBarTally count={tallyCount} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Outcomes List with Text Editors */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-apparatus uppercase tracking-wider font-semibold text-[var(--ink)]">
                Mutually-Exclusive Outcomes ({activeGroup.entries?.length || 0}/6)
              </h3>
              {activeGroup.entries && activeGroup.entries.length < 6 && (
                <button
                  type="button"
                  onClick={() => handleAddOutcome(activeGroup.id)}
                  className="text-xs font-apparatus text-[var(--rubric)] hover:underline flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add Outcome</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {(activeGroup.entries || []).map((entry, idx) => {
                const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
                return (
                  <div
                    key={entry.id}
                    className="p-3 rounded-[2px] bg-[var(--vellum)] border border-[var(--ink-soft)] flex items-start gap-3 transition-all focus-within:border-[var(--graphite)]"
                  >
                    <div className="flex flex-col items-center pt-1 shrink-0">
                      <span
                        className="w-3 h-3 rounded-full mb-1"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="font-mono-ui text-[10px] font-bold text-[var(--graphite)]">
                        #{idx + 1}
                      </span>
                      <span className="font-mono-ui text-[10px] text-[var(--ink)] font-semibold mt-1">
                        {entry.weight}%
                      </span>
                    </div>

                    <div className="flex-1">
                      <textarea
                        rows={2}
                        value={entry.outcome}
                        onChange={(e) => handleUpdateOutcomeText(activeGroup.id, entry.id, e.target.value)}
                        className="w-full text-xs font-manuscript text-[var(--ink)] bg-transparent border-0 focus:outline-none resize-y leading-relaxed"
                        placeholder="Describe the visceral outcome, material friction, or tactical complication..."
                      />
                    </div>

                    {activeGroup.entries.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOutcome(activeGroup.id, entry.id)}
                        className="p-1 text-[var(--graphite)] hover:text-[var(--rubric)] transition-all shrink-0"
                        title="Remove outcome"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fixed Settings Mono Block (Required by Frontend Specs) */}
          <div className="pt-2 border-t border-[var(--ink-soft)] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-apparatus uppercase tracking-wider text-[10px] font-semibold text-[var(--graphite)] flex items-center gap-1">
                <Info size={12} />
                Frontend Injection Parameters (Replicate in Frontend / SillyTavern)
              </span>

              <button
                type="button"
                onClick={() => handleCopySettings(activeGroup)}
                className="flex items-center gap-1 text-[11px] font-apparatus text-[var(--rubric)] hover:underline"
              >
                {copiedSettingsId === activeGroup.id ? (
                  <>
                    <Check size={12} className="text-emerald-600" />
                    <span className="text-emerald-600 font-medium">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy Settings</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-2.5 rounded-[2px] bg-[var(--vellum-deep)] border border-[var(--ink-soft)] font-mono text-[11px] text-[var(--ink)] select-all overflow-x-auto">
              {activeGroup.settings ||
                "Position: System | Depth: 0 | Order: 100 | Prevent-Recursion: On | Sticky: 4"}
            </div>
          </div>
        </div>
      )}

      {!activeGroup && (
        <div className="p-8 rounded-[3px] border border-[var(--ink-soft)] bg-[var(--vellum-raised)] shadow-[var(--sheet-shadow)]">
          <HandDrawnEmptyState
            sketchType="dice"
            headline="No Dice Calibrated"
            handwrittenNote="The tables sit unrolled. Calibrate setting rolls above to test procedural friction."
            actionButton={{
              label: "Generate Setting Rolls",
              onClick: handleSuggestRolls,
            }}
          />
        </div>
      )}
    </div>
  );
};
