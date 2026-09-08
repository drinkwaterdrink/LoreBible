import React, { useState } from "react";
import { DivergenceTake, GenerationSettings } from "../types";
import {
  Feather,
  Compass,
  ArrowRight,
  Check,
  AlertTriangle,
  Pencil,
  ChevronLeft,
  ChevronRight,
  History,
  X,
  Save,
  Sparkles,
  Sliders,
} from "lucide-react";
import { RuledLinesSkeleton } from "./RuledLinesSkeleton";
import { GenerationActivity, type GenerationActivityProps } from "./GenerationActivity";

interface DivergenceStageProps {
  takes: DivergenceTake[];
  selectedTakeId?: string;
  onSelectTake: (take: DivergenceTake) => void;
  onRerollAll: () => void;
  onPushFurther: (take: DivergenceTake, pushInstruction: string) => void;
  onRerollSingleTake?: (take: DivergenceTake) => Promise<void> | void;
  onSteerSingleTake?: (take: DivergenceTake, steerInstruction: string) => Promise<void> | void;
  onUpdateTake?: (updatedTake: DivergenceTake) => void;
  onSwitchTakeVersion?: (takeSlotId: string, versionIndex: number) => void;
  rerollingSingleId?: string | null;
  onProceed: () => void;
  isLoading: boolean;
  sparkText: string;
  divergenceError?: string | null;
  onRetry?: () => void;
  onOpenConnections?: () => void;
  settings?: GenerationSettings;
  onUpdateSettings?: (settings: GenerationSettings) => void;
  generationActivity?: GenerationActivityProps;
}

interface EditFormState {
  title: string;
  pitch: string;
  whatsStrange: string;
  genreTone: string;
  retainedNonNegotiables: string;
}

const STEER_SUGGESTIONS = [
  "More intimate & character-driven",
  "Heighten suspense & ticking clock",
  "Deepen personal relationships & stakes",
  "Accentuate strange or uncanny rules",
  "Focus on social friction & hidden motives",
  "Lighter, warmer, or more comedic tone",
  "Darker psychological undercurrent",
];

export const DivergenceStage: React.FC<DivergenceStageProps> = ({
  takes,
  selectedTakeId,
  onSelectTake,
  onRerollAll,
  onPushFurther,
  onRerollSingleTake,
  onSteerSingleTake,
  onUpdateTake,
  onSwitchTakeVersion,
  rerollingSingleId,
  onProceed,
  isLoading,
  sparkText,
  divergenceError,
  onRetry,
  onOpenConnections,
  settings,
  onUpdateSettings: _onUpdateSettings,
  generationActivity,
}) => {
  // Push further across all 4 (original branch)
  const [pushingTakeId, setPushingTakeId] = useState<string | null>(null);
  const [pushText, setPushText] = useState("");

  // Individual angle steer drawer
  const [steeringTakeId, setSteeringTakeId] = useState<string | null>(null);
  const [steerText, setSteerText] = useState("");

  // Individual angle edit mode
  const [editingTakeId, setEditingTakeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    title: "",
    pitch: "",
    whatsStrange: "",
    genreTone: "",
    retainedNonNegotiables: "",
  });

  const handleOpenPush = (takeId: string) => {
    setPushingTakeId(takeId);
    setPushText("");
    setSteeringTakeId(null);
    setEditingTakeId(null);
  };

  const handleConfirmPush = (take: DivergenceTake) => {
    if (!pushText.trim()) return;
    onPushFurther(take, pushText.trim());
    setPushingTakeId(null);
    setPushText("");
  };

  const handleOpenSteer = (take: DivergenceTake) => {
    if (steeringTakeId === take.id) {
      setSteeringTakeId(null);
      setSteerText("");
    } else {
      setSteeringTakeId(take.id);
      setSteerText("");
      setPushingTakeId(null);
      setEditingTakeId(null);
    }
  };

  const handleConfirmSteer = (take: DivergenceTake) => {
    if (!steerText.trim() || !onSteerSingleTake) return;
    onSteerSingleTake(take, steerText.trim());
    setSteeringTakeId(null);
    setSteerText("");
  };

  const handleOpenEdit = (take: DivergenceTake) => {
    if (editingTakeId === take.id) {
      setEditingTakeId(null);
    } else {
      setEditingTakeId(take.id);
      setEditForm({
        title: take.title,
        pitch: take.pitch,
        whatsStrange: take.whatsStrange,
        genreTone: take.genreTone,
        retainedNonNegotiables: take.retainedNonNegotiables?.join(", ") || "",
      });
      setSteeringTakeId(null);
      setPushingTakeId(null);
    }
  };

  const handleSaveEdit = (take: DivergenceTake) => {
    if (!onUpdateTake) return;
    const retainedList = editForm.retainedNonNegotiables
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: DivergenceTake = {
      ...take,
      title: editForm.title.trim() || take.title,
      pitch: editForm.pitch.trim() || take.pitch,
      whatsStrange: editForm.whatsStrange.trim() || take.whatsStrange,
      genreTone: editForm.genreTone.trim() || take.genreTone,
      retainedNonNegotiables: retainedList.length > 0 ? retainedList : take.retainedNonNegotiables,
      isEdited: true,
    };

    onUpdateTake(updated);
    setEditingTakeId(null);
  };

  const selectedTake = takes.find((t) => t.id === selectedTakeId);

  return (
    <div id="divergence-stage-container" className="py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[var(--ink-soft)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-apparatus font-semibold uppercase tracking-widest text-[var(--graphite)]">
              Stage 02 · Divergence
            </span>
            {settings && (
              <span className="text-[9px] font-mono-ui px-1.5 py-0.2 rounded bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30 font-semibold">
                {settings.quality} · {settings.divergenceMode}
                {settings.authorFlavor.mode !== "Off" && " · Flavor Active"}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-manuscript font-normal text-[var(--ink)] mt-1">
            Four angles on the premise.
          </h2>
          <p className="text-xs text-[var(--graphite)] font-manuscript mt-1 max-w-[65ch]">
            Reroll or steer individual angles, edit details directly, or browse previous versions. Your core non-negotiables remain anchored.
          </p>
        </div>

        <button
          id="reroll-all-divergence-btn"
          type="button"
          onClick={isLoading ? generationActivity?.onCancel : onRerollAll}
          disabled={!!rerollingSingleId}
          className="btn-secondary flex items-center gap-1.5 self-start shrink-0 cursor-pointer disabled:opacity-50"
          title="Reroll all four angles together"
        >
          <Feather size={12} className={isLoading ? "text-[var(--rubric)] animate-pulse" : ""} />
          <span>{isLoading ? "Cancel Generation" : "Reroll All Angles"}</span>
        </button>
      </div>

      {generationActivity && <GenerationActivity {...generationActivity} />}

      {/* Error Banner if Divergence generation failed */}
      {divergenceError && (
        <div className="p-4 border border-[var(--rubric)] bg-[var(--vellum-raised)] rounded-[2px] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-[var(--rubric)] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-apparatus uppercase tracking-wider font-semibold text-[var(--rubric)]">
                Divergence Operation Interrupted
              </h4>
              <p className="text-xs font-manuscript text-[var(--ink)] mt-1">
                {divergenceError}
              </p>
              <p className="text-[11px] font-manuscript italic text-[var(--graphite)] mt-0.5">
                Previous versions and takes remain safe. You can retry the request.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isLoading}
              className="btn-primary text-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Feather size={12} className={isLoading ? "text-[var(--rubric)] animate-pulse" : ""} />
              <span>Retry Generation</span>
            </button>
          )}
          {onOpenConnections && <button type="button" onClick={onOpenConnections} className="btn-secondary text-xs cursor-pointer">Connections</button>}
          </div>
        </div>
      )}

      {/* Anchor Spark snippet */}
      <div className="py-2 px-3 border-l-2 border-[var(--rubric)] bg-[var(--vellum)]/60 text-xs">
        <span className="text-[9px] uppercase tracking-wider text-[var(--graphite)] block font-apparatus">
          Anchor Spark
        </span>
        <p className="font-hand text-lg text-[var(--ink-blue)] leading-snug truncate">
          “{sparkText}”
        </p>
      </div>

      {/* The 4 Competing Angles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {takes.map((take) => {
          const isSelected = selectedTakeId === take.id;
          const isPushing = pushingTakeId === take.id;
          const isSteering = steeringTakeId === take.id;
          const isEditing = editingTakeId === take.id;
          const isRerollingThis = rerollingSingleId === take.id;

          const versions = take.versions && take.versions.length > 0 ? take.versions : [take];
          const currentVerIdx = typeof take.versionIndex === "number" ? take.versionIndex : versions.length - 1;
          const totalVersions = versions.length;

          return (
            <div
              key={take.id}
              id={`divergence-card-${take.id}`}
              className={`manuscript-sheet p-5 flex flex-col justify-between transition-all relative ${
                isSelected
                  ? "border-[var(--rubric)] ring-1 ring-[var(--rubric)] bg-[var(--vellum-raised)]"
                  : "hover:border-[var(--graphite)] hover:bg-[var(--vellum-raised)]"
              }`}
            >
              {/* Subtle Loading Overlay for Single-Angle Operations */}
              {isRerollingThis && (
                <div className="absolute inset-0 bg-[var(--vellum)]/90 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center p-6 text-center rounded-[2px]">
                  <RuledLinesSkeleton lines={3} caption="Recalibrating angle against world logic..." />
                </div>
              )}

              {/* CARD TOP BAR: Angle Badge, Version History Navigator, and Quick Tools */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest font-apparatus text-[var(--rubric)] font-semibold">
                      § {take.angle} Angle
                    </span>
                    {take.isEdited && (
                      <span className="text-[9px] font-apparatus uppercase tracking-wider px-1.5 py-0.2 rounded bg-[var(--ink-soft)] text-[var(--graphite)]">
                        Edited
                      </span>
                    )}
                    {take.steerNote && (
                      <span
                        className="text-[9px] font-apparatus uppercase tracking-wider px-1.5 py-0.2 rounded bg-[var(--rubric)]/10 text-[var(--rubric)] truncate max-w-[140px]"
                        title={`Steered: "${take.steerNote}"`}
                      >
                        Steered
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {take.authorFlavorName && (
                      <span className="text-[9px] font-apparatus px-1.5 py-0.2 rounded bg-[var(--ink-blue)]/15 text-[var(--ink-blue)] font-semibold border border-[var(--ink-blue)]/30">
                        {take.authorFlavorName}
                      </span>
                    )}
                    <span className="lore-key-tag shrink-0">
                      {take.genreTone}
                    </span>
                  </div>
                </div>

                {/* VERSION HISTORY NAVIGATOR BAR */}
                <div className="flex items-center justify-between py-1.5 px-2 bg-[var(--vellum-raised)]/60 border border-[var(--ink-soft)] rounded-[2px] mb-3 text-[10px]">
                  <div className="flex items-center gap-1.5 text-[var(--graphite)] font-apparatus">
                    <History size={11} className="text-[var(--rubric)]" />
                    <span>
                      Version <strong className="text-[var(--ink)]">{currentVerIdx + 1}</strong> of {totalVersions}
                    </span>
                  </div>

                  {/* Version Pill Buttons & Prev/Next Arrows */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSwitchTakeVersion && onSwitchTakeVersion(take.id, currentVerIdx - 1)}
                      disabled={currentVerIdx <= 0 || isRerollingThis}
                      className="p-1 rounded hover:bg-[var(--vellum)] text-[var(--graphite)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                      title="View previous version"
                    >
                      <ChevronLeft size={12} />
                    </button>

                    {/* Version Pills */}
                    <div className="flex items-center gap-1 px-1">
                      {versions.map((ver, vIdx) => {
                        const isCurrentPill = vIdx === currentVerIdx;
                        return (
                          <button
                            key={ver.id || vIdx}
                            type="button"
                            onClick={() => onSwitchTakeVersion && onSwitchTakeVersion(take.id, vIdx)}
                            className={`px-1.5 py-0.5 rounded-[2px] font-mono-ui text-[9px] transition-colors cursor-pointer ${
                              isCurrentPill
                                ? "bg-[var(--rubric)] text-white font-bold"
                                : "text-[var(--graphite)] hover:text-[var(--ink)] bg-[var(--vellum)] hover:bg-[var(--ink-soft)]"
                            }`}
                            title={`Jump to v${vIdx + 1}${ver.steerNote ? ` (Steered: ${ver.steerNote})` : ""}${ver.isEdited ? " (Edited)" : ""}`}
                          >
                            v{vIdx + 1}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSwitchTakeVersion && onSwitchTakeVersion(take.id, currentVerIdx + 1)}
                      disabled={currentVerIdx >= totalVersions - 1 || isRerollingThis}
                      className="p-1 rounded hover:bg-[var(--vellum)] text-[var(--graphite)] hover:text-[var(--ink)] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                      title="View next version"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>

                {/* INDIVIDUAL CONTROLS BAR: REROLL, STEER, EDIT */}
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  {onRerollSingleTake && (
                    <button
                      type="button"
                      onClick={() => onRerollSingleTake(take)}
                      disabled={isRerollingThis || isLoading}
                      className="px-2 py-1 text-[10px] font-apparatus uppercase tracking-wider rounded-[2px] border border-[var(--ink-soft)] hover:border-[var(--graphite)] hover:text-[var(--ink)] text-[var(--graphite)] bg-[var(--vellum)] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Reroll only this individual angle"
                    >
                      <Feather size={10} className={isRerollingThis ? "text-[var(--rubric)] animate-pulse" : ""} />
                      <span>{isRerollingThis ? "Inking..." : "Reroll Angle"}</span>
                    </button>
                  )}

                  {onSteerSingleTake && (
                    <button
                      type="button"
                      onClick={() => handleOpenSteer(take)}
                      disabled={isRerollingThis || isLoading}
                      className={`px-2 py-1 text-[10px] font-apparatus uppercase tracking-wider rounded-[2px] border flex items-center gap-1 transition-colors cursor-pointer ${
                        isSteering
                          ? "border-[var(--rubric)] text-[var(--rubric)] bg-[var(--vellum-raised)] font-semibold"
                          : "border-[var(--ink-soft)] hover:border-[var(--graphite)] hover:text-[var(--ink)] text-[var(--graphite)] bg-[var(--vellum)]"
                      }`}
                      title="Steer this angle with a custom prompt instruction"
                    >
                      <Compass size={10} />
                      <span>Steer</span>
                    </button>
                  )}

                  {onUpdateTake && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(take)}
                      disabled={isRerollingThis || isLoading}
                      className={`px-2 py-1 text-[10px] font-apparatus uppercase tracking-wider rounded-[2px] border flex items-center gap-1 transition-colors cursor-pointer ${
                        isEditing
                          ? "border-[var(--rubric)] text-[var(--rubric)] bg-[var(--vellum-raised)] font-semibold"
                          : "border-[var(--ink-soft)] hover:border-[var(--graphite)] hover:text-[var(--ink)] text-[var(--graphite)] bg-[var(--vellum)]"
                      }`}
                      title="Directly edit title, pitch, and strange rules"
                    >
                      <Pencil size={10} />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {/* INLINE STEER DRAWER */}
                {isSteering && (
                  <div className="p-3 mb-3 border border-[var(--rubric)]/60 rounded-[2px] bg-[var(--vellum)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--rubric)] font-apparatus font-semibold flex items-center gap-1">
                        <Compass size={11} />
                        Steer This Angle
                      </span>
                      <button
                        type="button"
                        onClick={() => setSteeringTakeId(null)}
                        className="text-[var(--graphite)] hover:text-[var(--ink)] p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <p className="text-[11px] text-[var(--graphite)] font-manuscript">
                      Provide a creative steer or emphasis to pivot this angle. Previous versions will be saved in your history.
                    </p>

                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap gap-1">
                      {STEER_SUGGESTIONS.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setSteerText(sug)}
                          className="text-[9px] font-apparatus px-1.5 py-0.5 rounded border border-[var(--ink-soft)] hover:border-[var(--rubric)] text-[var(--graphite)] hover:text-[var(--ink)] bg-[var(--vellum-raised)] cursor-pointer"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={steerText}
                      onChange={(e) => setSteerText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && steerText.trim()) {
                          handleConfirmSteer(take);
                        }
                      }}
                      placeholder="e.g. emphasize the mechanical clockwork rules and personal debt"
                      className="w-full text-xs font-hand text-[var(--ink-blue)] input-underline py-1"
                      autoFocus
                    />

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSteeringTakeId(null)}
                        className="btn-secondary text-[10px] py-1 px-2.5 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmSteer(take)}
                        disabled={!steerText.trim() || isRerollingThis}
                        className="btn-primary text-[10px] py-1 px-2.5 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles size={11} />
                        <span>Apply Steer</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* INLINE EDIT FORM */}
                {isEditing ? (
                  <div className="p-3 mb-3 border border-[var(--rubric)] rounded-[2px] bg-[var(--vellum)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--rubric)] font-apparatus font-semibold flex items-center gap-1">
                        <Pencil size={11} />
                        Edit Angle Details
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingTakeId(null)}
                        className="text-[var(--graphite)] hover:text-[var(--ink)] p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block">
                        Title
                      </label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full text-sm font-manuscript font-semibold input-underline py-0.5 text-[var(--ink)]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block">
                        Pitch (Single Loaded Sentence)
                      </label>
                      <textarea
                        rows={3}
                        value={editForm.pitch}
                        onChange={(e) => setEditForm({ ...editForm, pitch: e.target.value })}
                        className="w-full text-xs font-manuscript input-underline py-1 text-[var(--ink)] resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block">
                        What&apos;s Strange Here
                      </label>
                      <textarea
                        rows={2}
                        value={editForm.whatsStrange}
                        onChange={(e) => setEditForm({ ...editForm, whatsStrange: e.target.value })}
                        className="w-full text-xs font-manuscript italic input-underline py-1 text-[var(--ink)] resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block">
                          Genre / Tone Tag
                        </label>
                        <input
                          type="text"
                          value={editForm.genreTone}
                          onChange={(e) => setEditForm({ ...editForm, genreTone: e.target.value })}
                          className="w-full text-xs font-apparatus input-underline py-0.5 text-[var(--ink)]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block">
                          Retained Anchors
                        </label>
                        <input
                          type="text"
                          value={editForm.retainedNonNegotiables}
                          onChange={(e) => setEditForm({ ...editForm, retainedNonNegotiables: e.target.value })}
                          placeholder="comma separated"
                          className="w-full text-xs font-mono-ui input-underline py-0.5 text-[var(--ink)]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--ink-soft)]">
                      <button
                        type="button"
                        onClick={() => setEditingTakeId(null)}
                        className="btn-secondary text-[10px] py-1 px-2.5 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(take)}
                        className="btn-primary text-[10px] py-1 px-2.5 flex items-center gap-1 cursor-pointer"
                      >
                        <Save size={11} />
                        <span>Save as New Version</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* NORMAL CARD CONTENT VIEW */
                  <>
                    <h3 className="text-lg font-manuscript font-semibold text-[var(--ink)] mb-2 min-h-[3.2rem] leading-snug line-clamp-2">
                      {take.title}
                    </h3>

                    <p className="text-xs font-manuscript text-[var(--ink)] leading-relaxed mb-3">
                      {take.pitch}
                    </p>

                    {/* What's Strange */}
                    <div className="pt-2.5 pb-2 border-t border-[var(--ink-soft)] text-xs font-manuscript text-[var(--graphite)]">
                      <span className="text-[9px] uppercase tracking-wider font-apparatus text-[var(--graphite)] block mb-0.5">
                        What&apos;s Strange Here
                      </span>
                      <p className="italic leading-snug text-[var(--ink)]">
                        “{take.whatsStrange}”
                      </p>
                    </div>

                    {take.steerNote && (
                      <div className="mt-1 pt-1 text-[10px] font-manuscript text-[var(--rubric)] italic">
                        ↳ Steer applied: “{take.steerNote}”
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* CARD BOTTOM: Fidelity Line & Commitment Affordance */}
              <div className="mt-4 pt-3 border-t border-[var(--ink-soft)] space-y-3">
                {/* Fidelity Line */}
                <div className="text-[10px] text-[var(--graphite)] flex items-center gap-1 font-mono-ui">
                  <span className="text-[var(--sage)] font-semibold">Retains:</span>
                  <span className="truncate">
                    {take.retainedNonNegotiables?.join(", ") || "all non-negotiables"}
                  </span>
                </div>

                {/* Push Further handwriting drawer if open (original branch) */}
                {isPushing ? (
                  <div className="p-2.5 border border-[var(--ink-soft)] rounded-[2px] bg-[var(--vellum)] space-y-2">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--graphite)] block font-apparatus">
                      Push direction across 4 new variations:
                    </span>
                    <input
                      type="text"
                      value={pushText}
                      onChange={(e) => setPushText(e.target.value)}
                      placeholder="e.g. make the corruption smaller and more personal"
                      className="w-full text-sm font-hand text-[var(--ink-blue)] input-underline py-0.5"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPushingTakeId(null)}
                        className="btn-secondary text-[9px] py-1 px-2 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmPush(take)}
                        className="btn-primary text-[9px] py-1 px-2 cursor-pointer"
                      >
                        Branch 4 Variations
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Card Footer Commitment Affordance */
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      id={`choose-take-btn-${take.id}`}
                      onClick={() => onSelectTake(take)}
                      className={`btn-primary text-xs flex items-center gap-1.5 cursor-pointer ${
                        isSelected ? "bg-[var(--rubric)] text-white" : ""
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check size={12} />
                          <span>Chosen Take</span>
                        </>
                      ) : (
                        <span>Choose this</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenPush(take.id)}
                      className="btn-tertiary text-xs cursor-pointer"
                      title="Generate 4 variations pushing this take in a specific direction"
                    >
                      Branch 4 →
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage Proceed Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 border-t border-[var(--ink-soft)]">
        <div>
          {selectedTake ? (
            <span className="text-xs text-[var(--ink)] font-manuscript">
              Adopted title: <strong className="italic text-[var(--rubric)]">{selectedTake.title}</strong>
              {selectedTake.versionIndex !== undefined && (
                <span className="text-[10px] text-[var(--graphite)] ml-1.5 font-apparatus">
                  (Version {(selectedTake.versionIndex ?? 0) + 1})
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs text-[var(--graphite)]">
              Choose one take to establish the working manuscript and configure physics.
            </span>
          )}
        </div>

        <button
          id="proceed-to-physics-btn"
          type="button"
          disabled={!selectedTakeId || isLoading}
          onClick={onProceed}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed self-end sm:self-auto cursor-pointer"
        >
          <span>Calibrate Physics</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
