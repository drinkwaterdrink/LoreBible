import React, { useState, useMemo } from "react";
import { Entry, LoreBibleDocument } from "../../types";
import { Clock, AlertTriangle, ShieldAlert, Sparkles, Plus, ArrowRight } from "lucide-react";

interface PressureMapProps {
  document: LoreBibleDocument;
  onUpdateDocument: (updated: LoreBibleDocument) => void;
  onSelectEntry: (entry: Entry) => void;
}

type ImminenceZone = "immediate" | "rising" | "simmering" | "horizon";

interface PressureChip {
  id: string;
  title: string;
  detail: string;
  zone: ImminenceZone;
  type: "pressure" | "clock" | "speedBump" | "core";
  rawEntry?: Entry;
  clockText?: string;
}

export const PressureMap: React.FC<PressureMapProps> = ({
  document,
  onUpdateDocument,
  onSelectEntry,
}) => {
  // Store custom urgency zones for items if customized, initialized from document
  const [customZones, setCustomZones] = useState<Record<string, ImminenceZone>>({});
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  const [draggedChipId, setDraggedChipId] = useState<string | null>(null);

  // New Pressure Chip Form State
  const [isAddingPressure, setIsAddingPressure] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [newZone, setNewZone] = useState<ImminenceZone>("immediate");
  const [newType, setNewType] = useState<PressureChip["type"]>("pressure");

  // Collect all pressures, clocks, and speed bumps into a unified list
  const chips: PressureChip[] = useMemo(() => {
    const list: PressureChip[] = [];

    // 1. Core Pressure
    if (document.core.thePressure) {
      const id = "core-pressure";
      list.push({
        id,
        title: "Core Dilemma Pressure",
        detail: document.core.thePressure,
        zone: customZones[id] || "immediate",
        type: "core",
      });
    }

    // 2. Central Conflict Clock
    if (document.conflict.clock) {
      const id = "conflict-clock";
      list.push({
        id,
        title: "Countdown Clock",
        detail: document.conflict.clock,
        zone: customZones[id] || "rising",
        type: "clock",
        clockText: document.conflict.clock,
      });
    }

    // 3. Conflict Speed Bumps
    if (document.conflict.speedBumps) {
      const bumps = Array.isArray(document.conflict.speedBumps)
        ? document.conflict.speedBumps
        : [document.conflict.speedBumps];

      bumps.forEach((bumpText, idx) => {
        if (!bumpText) return;
        const id = `speedbump-${idx}`;
        list.push({
          id,
          title: `Speed Bump ${idx + 1}`,
          detail: bumpText,
          zone: customZones[id] || "simmering",
          type: "speedBump",
        });
      });
    }

    // 4. Pressures in Motion array
    if (document.pressures) {
      document.pressures.forEach((p, idx) => {
        const id = p.id || `pressure-${idx}`;
        const title = p.fields.force || p.fields.name || `Pressure ${idx + 1}`;
        const detail = Object.values(p.fields).filter(v => typeof v === "string" && v !== title).join(" · ");
        const scope = (p.fields.scope || "").toLowerCase();

        // Default heuristic if not yet customized
        let defaultZone: ImminenceZone = "simmering";
        if (scope.includes("personal") || idx === 0) defaultZone = "immediate";
        else if (scope.includes("factional") || idx === 1) defaultZone = "rising";
        else if (scope.includes("structural")) defaultZone = "horizon";

        list.push({
          id,
          title,
          detail: detail || "Forces operating independent of player motion",
          zone: customZones[id] || defaultZone,
          type: "pressure",
          rawEntry: p,
          clockText: p.fields.clock,
        });
      });
    }

    return list;
  }, [document.core, document.conflict, document.pressures, customZones]);

  // At-a-glance Tension Diagnostic Calculation
  const tensionDiagnostic = useMemo(() => {
    const total = chips.length;
    if (total === 0) {
      return {
        label: "Pacing Unseeded",
        verdict: "neutral",
        advice: "No pressures currently staged. Add forces in motion to test live tension.",
        breakdown: { immediate: 0, rising: 0, simmering: 0, horizon: 0 },
      };
    }

    const counts = {
      immediate: chips.filter((c) => c.zone === "immediate").length,
      rising: chips.filter((c) => c.zone === "rising").length,
      simmering: chips.filter((c) => c.zone === "simmering").length,
      horizon: chips.filter((c) => c.zone === "horizon").length,
    };

    const immediateRatio = counts.immediate / total;

    if (immediateRatio >= 0.55 && total >= 3) {
      return {
        label: "Front-Loaded Scenario",
        verdict: "warning",
        advice:
          "High immediate panic with risk of rapid burnout. Recommend dragging 1–2 chips into Simmering or Horizon to allow sustained tension without early exhaustion.",
        breakdown: counts,
      };
    } else if (counts.immediate === 0) {
      return {
        label: "Under-Pressured Opening",
        verdict: "warning",
        advice:
          "Lacks immediate friction for the opening scene. Drag a clock or pressure chip into 'Immediate' to give the player something to react to right now.",
        breakdown: counts,
      };
    } else {
      return {
        label: "Evenly Distributed Tension",
        verdict: "balanced",
        advice:
          "Forces in motion are well-calibrated. Immediate sparks give initial motion while structural countdowns linger in the background without forcing sudden resolution.",
        breakdown: counts,
      };
    }
  }, [chips]);

  // Handle Drag & Drop to change zone
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedChipId(id);
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (zone: ImminenceZone) => {
    if (!draggedChipId) return;

    setCustomZones((prev) => ({
      ...prev,
      [draggedChipId]: zone,
    }));

    // If it's a real pressure entry in document, update its scope/imminence tag
    const chip = chips.find((c) => c.id === draggedChipId);
    if (chip && chip.rawEntry && document.pressures) {
      const updatedPressures = document.pressures.map((p) => {
        if (p.id === chip.rawEntry?.id) {
          return {
            ...p,
            fields: {
              ...p.fields,
              scope: zone === "immediate" ? "personal" : zone === "rising" ? "factional" : "structural",
              clock: zone === "immediate" ? "Next turn / Hours" : zone === "rising" ? "Days" : "Weeks",
            },
          };
        }
        return p;
      });
      onUpdateDocument({
        ...document,
        pressures: updatedPressures,
      });
    }

    setDraggedChipId(null);
  };

  // Add new pressure chip
  const handleAddPressure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newId = `custom-pressure-${Date.now()}`;
    const newEntry: Entry = {
      id: newId,
      fields: {
        force: newTitle.trim(),
        name: newTitle.trim(),
        scope: newZone === "immediate" ? "personal" : newZone === "rising" ? "factional" : "structural",
        clock: newZone === "immediate" ? "Next 12 Hours" : newZone === "rising" ? "24–48 Hours" : "Weeks",
        detail: newDetail.trim() || "Unfolding tension",
      },
      keys: [newTitle.trim()],
      permanence: "C",
      locked: false,
    };

    setCustomZones((prev) => ({
      ...prev,
      [newId]: newZone,
    }));

    onUpdateDocument({
      ...document,
      pressures: [...(document.pressures || []), newEntry],
    });

    setIsAddingPressure(false);
    setNewTitle("");
    setNewDetail("");
  };

  const zoneConfigs: { id: ImminenceZone; label: string; sub: string; color: string }[] = [
    {
      id: "immediate",
      label: "Immediate Friction",
      sub: "0–12 Hours · Next turn / In the room",
      color: "var(--rubric)",
    },
    {
      id: "rising",
      label: "Rising Alarm",
      sub: "24–48 Hours · Next scene countdown",
      color: "var(--gold)",
    },
    {
      id: "simmering",
      label: "Simmering Pressure",
      sub: "Days · Factional & Social friction",
      color: "var(--ink-blue)",
    },
    {
      id: "horizon",
      label: "Deep Horizon",
      sub: "Weeks · Structural & World clock",
      color: "var(--graphite)",
    },
  ];

  return (
    <div
      id="pressure-map-workspace"
      className="w-full bg-[var(--vellum)] border border-[var(--ink-soft)] rounded-[2px] overflow-hidden flex flex-col font-manuscript select-none"
    >
      {/* Header & Tension Diagnostic Strip */}
      <div className="p-4 border-b border-[var(--ink-soft)] bg-[var(--vellum-raised)]/90 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-apparatus uppercase text-[9px] tracking-widest text-[var(--graphite)] block font-semibold">
            Visual Pacing Tool · Imminence Timeline
          </span>
          <h3 className="font-manuscript font-semibold text-lg text-[var(--ink)] leading-tight">
            The Pressure Map
          </h3>
          <p className="font-manuscript italic text-xs text-[var(--rubric)] mt-0.5">
            "forces in motion, not a plan."
          </p>
        </div>

        {/* Tension Balance Diagnostic Readout */}
        <div
          className={`px-3 py-2 rounded-[2px] border text-xs max-w-md ${
            tensionDiagnostic.verdict === "warning"
              ? "bg-[var(--gold)]/10 border-[var(--gold)]/60 text-[var(--ink)]"
              : "bg-[var(--vellum-raised)] border-[var(--ink-soft)] text-[var(--ink)]"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-apparatus uppercase font-semibold text-[10px] tracking-wider flex items-center gap-1">
              <Sparkles size={11} className="text-[var(--gold)]" />
              {tensionDiagnostic.label}
            </span>
            <span className="text-[10px] text-[var(--graphite)] font-apparatus">
              {chips.length} Active Forces
            </span>
          </div>
          <p className="text-[11px] leading-snug font-manuscript text-[var(--graphite)]">
            {tensionDiagnostic.advice}
          </p>
        </div>

        {/* Add Pressure Chip Button */}
        <button
          type="button"
          onClick={() => setIsAddingPressure(!isAddingPressure)}
          className="px-3 py-1.5 text-xs font-apparatus font-semibold uppercase tracking-wider text-[var(--vellum-raised)] bg-[var(--rubric)] hover:opacity-90 rounded-[2px] transition-all shadow-xs cursor-pointer flex items-center gap-1"
        >
          <Plus size={13} />
          <span>Stage Pressure</span>
        </button>
      </div>

      {/* Hand-Ruled Timeline Ruler with Tick Marks */}
      <div className="relative pt-4 sm:pt-6 pb-2 px-4 sm:px-6 bg-[var(--vellum-deep)]/20 border-b border-[var(--ink-soft)] overflow-x-auto no-scrollbar touch-pan-x">
        <div className="min-w-[480px]">
          {/* Hand-Ruled Ink Line across the sheet */}
          <div className="relative h-10 flex items-center justify-between border-t-2 border-b border-[var(--ink)]">
            {/* Tick marks along ruler */}
            {Array.from({ length: 41 }).map((_, i) => (
              <div
                key={i}
                className={`w-[1px] bg-[var(--ink)]/40 ${
                  i % 10 === 0
                    ? "h-4 bg-[var(--ink)]"
                    : i % 5 === 0
                    ? "h-2.5 bg-[var(--ink)]/70"
                    : "h-1.5"
                }`}
              />
            ))}
          </div>

          {/* Imminence Zone Labels along ruler */}
          <div className="grid grid-cols-4 pt-2 text-center text-xs font-apparatus">
            {zoneConfigs.map((z) => (
              <div key={z.id} className="px-2">
                <span
                  className="uppercase tracking-wider font-semibold text-[10px] block"
                  style={{ color: z.color }}
                >
                  {z.label}
                </span>
                <span className="text-[9px] text-[var(--graphite)] italic font-manuscript">
                  {z.sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Drag & Drop Columns (Paper Chips Lanes) */}
      <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--ink-soft)] min-h-[460px] bg-[var(--vellum)]">
        {zoneConfigs.map((zone) => {
          const zoneChips = chips.filter((c) => c.zone === zone.id);

          return (
            <div
              key={zone.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(zone.id)}
              className="p-4 flex flex-col gap-3 min-h-[380px] transition-colors duration-150 relative hover:bg-[var(--vellum-raised)]/40"
            >
              <div className="flex items-center justify-between border-b border-[var(--ink-soft)] pb-1.5">
                <span className="text-[10px] font-apparatus uppercase font-semibold text-[var(--graphite)]">
                  {zoneChips.length} {zoneChips.length === 1 ? "force" : "forces"}
                </span>
                <span className="text-[10px] font-hand text-[var(--ink-blue)]">
                  drop to change imminence
                </span>
              </div>

              {/* Draggable Paper Chips */}
              <div className="flex-1 space-y-2.5">
                {zoneChips.map((chip) => {
                  const isSelected = selectedChipId === chip.id;

                  return (
                    <div
                      key={chip.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, chip.id)}
                      onClick={() => {
                        setSelectedChipId(chip.id);
                        if (chip.rawEntry) onSelectEntry(chip.rawEntry);
                      }}
                      className={`p-3 bg-[var(--vellum-raised)] border rounded-[2px] shadow-xs cursor-grab active:cursor-grabbing transition-all transform hover:-translate-y-0.5 relative select-none ${
                        isSelected
                          ? "border-[var(--rubric)] ring-1 ring-[var(--rubric)] shadow-md"
                          : "border-[var(--ink-soft)] hover:border-[var(--ink)]"
                      }`}
                      style={{
                        borderLeftWidth: 4,
                        borderLeftColor:
                          chip.type === "clock"
                            ? "var(--rubric)"
                            : chip.type === "core"
                            ? "var(--gold)"
                            : chip.type === "speedBump"
                            ? "var(--ink-blue)"
                            : "var(--graphite)",
                      }}
                    >
                      {/* Chip Tag & Clock Badge */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-apparatus uppercase text-[8px] font-semibold tracking-wider text-[var(--graphite)] flex items-center gap-1">
                          {chip.type === "clock" && <Clock size={10} className="text-[var(--rubric)]" />}
                          {chip.type === "speedBump" && <AlertTriangle size={10} className="text-[var(--ink-blue)]" />}
                          {chip.type === "core" && <ShieldAlert size={10} className="text-[var(--gold)]" />}
                          {chip.type.toUpperCase()}
                        </span>

                        {chip.clockText && (
                          <span className="font-apparatus text-[8.5px] px-1.5 py-0.5 rounded-[2px] bg-[var(--vellum-deep)] text-[var(--ink)] font-semibold">
                            {String(chip.clockText).slice(0, 18)}
                          </span>
                        )}
                      </div>

                      {/* Chip Title in typeset print */}
                      <h4 className="font-manuscript font-semibold text-sm text-[var(--ink)] leading-snug">
                        {chip.title}
                      </h4>

                      {/* Detail in manuscript serif */}
                      <p className="font-manuscript text-xs text-[var(--graphite)] leading-relaxed mt-1 line-clamp-3">
                        {chip.detail}
                      </p>

                      {/* Prompt guidance indicator */}
                      <div className="mt-2 pt-1 border-t border-[var(--ink-soft)]/50 flex justify-between items-center text-[9px] font-hand text-[var(--ink-blue)]">
                        <span>arranges by urgency</span>
                        <ArrowRight size={10} />
                      </div>
                    </div>
                  );
                })}

                {zoneChips.length === 0 && (
                  <div className="h-32 border border-dashed border-[var(--ink-soft)] rounded-[2px] flex items-center justify-center p-4 text-center">
                    <span className="font-manuscript italic text-xs text-[var(--graphite)]">
                      No forces in this horizon. Drag chips here to rebalance pacing.
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD PRESSURE CHIP MODAL */}
      {isAddingPressure && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddingPressure(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--vellum)] border border-[var(--ink-soft)] rounded-[2px] p-6 shadow-2xl space-y-4 font-manuscript animate-ink-bleed"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--ink-soft)] pb-2 flex justify-between items-baseline">
              <h3 className="font-manuscript font-semibold text-lg text-[var(--ink)]">
                Stage Pressure in Motion
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingPressure(false)}
                className="text-[10px] font-apparatus uppercase text-[var(--graphite)] hover:text-[var(--ink)]"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleAddPressure} className="space-y-4 text-xs">
              <div>
                <label className="font-apparatus uppercase text-[8.5px] text-[var(--graphite)] block mb-1">
                  Force Name / Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. City Guard curfew countdown..."
                  className="w-full p-2 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[1px] font-hand text-lg text-[var(--ink-blue)] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-apparatus uppercase text-[8.5px] text-[var(--graphite)] block mb-1">
                  Initial Imminence Horizon
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {zoneConfigs.map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setNewZone(z.id)}
                      className={`p-2 rounded-[2px] border text-left text-xs font-apparatus uppercase tracking-wider transition-all cursor-pointer ${
                        newZone === z.id
                          ? "bg-[var(--vellum-raised)] border-[var(--ink)] text-[var(--ink)] font-semibold shadow-xs"
                          : "border-[var(--ink-soft)] text-[var(--graphite)]"
                      }`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-apparatus uppercase text-[8.5px] text-[var(--graphite)] block mb-1">
                  Force Dynamics & Clock
                </label>
                <textarea
                  value={newDetail}
                  onChange={(e) => setNewDetail(e.target.value)}
                  rows={3}
                  placeholder="What proceeds on its own timeline regardless of whether the player is in the room?"
                  className="w-full p-2 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[1px] text-xs font-manuscript text-[var(--ink)]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingPressure(false)}
                  className="px-3 py-1 text-xs font-apparatus uppercase text-[var(--graphite)] hover:text-[var(--ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-apparatus font-semibold uppercase tracking-wider text-[var(--vellum-raised)] bg-[var(--rubric)] hover:opacity-90 rounded-[2px] transition-all shadow-xs cursor-pointer"
                >
                  Stage on Map
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
