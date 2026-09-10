import React, { useState } from "react";
import type { SavedLoreBibleProjectV2 } from "../lib/projectPersistence";
import { restoredProjectStages } from "../lib/projectWorkspace";
import { X, Copy, Trash2, Edit2, Check, Calendar, ExternalLink, Network } from "lucide-react";
import type { PreparedProjectGraphSummary } from "../services/projectGraphService";
import { HandDrawnEmptyState } from "./HandDrawnEmptyState";

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedProjects: SavedLoreBibleProjectV2[];
  onLoadProject: (project: SavedLoreBibleProjectV2) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (project: SavedLoreBibleProjectV2) => void;
  onRenameProject: (id: string, newTitle: string) => void;
  currentDocumentId?: string;
  preparedGraphs?: PreparedProjectGraphSummary[];
  preparingProjectId?: string | null;
  onPrepareGraph?: (project: SavedLoreBibleProjectV2) => void;
  onOpenGraph?: (graphId: string) => void;
}

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  onClose,
  savedProjects,
  onLoadProject,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  currentDocumentId,
  preparedGraphs = [], preparingProjectId, onPrepareGraph, onOpenGraph,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  if (!isOpen) return null;

  const handleStartRename = (id: string, title: string) => {
    setEditingId(id);
    setRenameText(title);
  };

  const handleSaveRename = (id: string) => {
    if (renameText.trim()) {
      onRenameProject(id, renameText.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      id="vault-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-x-hidden"
      onClick={onClose}
    >
      <div
        id="vault-modal-sheet"
        className="w-full max-w-2xl manuscript-sheet bg-[var(--vellum)] max-h-[90vh] max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden rounded-[2px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-[var(--ink-soft)] shrink-0 bg-[var(--vellum-raised)]">
          <div>
            <span className="text-[10px] font-apparatus font-semibold uppercase tracking-widest text-[var(--graphite)]">
              Manuscript Archive
            </span>
            <h2 className="text-lg sm:text-xl font-manuscript font-semibold text-[var(--ink)]">
              The Vault
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--graphite)] hover:text-[var(--ink)] p-1.5 rounded transition-colors"
            title="Close Vault"
          >
            <X size={18} />
          </button>
        </div>

        {/* List of stacked paper sheets */}
        <div className="p-3 sm:p-6 overflow-y-auto overflow-x-hidden space-y-3 sm:space-y-4 flex-1 min-h-0 overscroll-contain">
          {savedProjects.length === 0 ? (
            <div className="py-8">
              <HandDrawnEmptyState
                sketchType="codex"
                headline="Archive Shelves Empty"
                handwrittenNote="The drawers sit awaiting ink. Draft a scenario at the writing desk to preserve your first manuscript."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {savedProjects.map((project) => {
                const item = project.document;
                const restoredStages = restoredProjectStages(project);
                const isCurrent = item.id === currentDocumentId;
                const isEditing = editingId === item.id;
                const genre = item.core?.genreTone || item.chosenTake?.genreTone || "Unclassified";
                const preparedGraph = preparedGraphs.find((graph) => graph.legacyDocumentId === item.id);

                return (
                  <div
                    key={item.id}
                    id={`vault-item-${item.id}`}
                    className={`p-3.5 sm:p-4 border rounded-[2px] transition-all relative group bg-[var(--vellum-raised)] overflow-hidden ${
                      isCurrent
                        ? "border-[var(--rubric)] shadow-xs ring-1 ring-[var(--rubric)]/20"
                        : "border-[var(--ink-soft)] hover:border-[var(--graphite)] hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="text"
                            value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            className="input-underline text-sm font-manuscript font-semibold w-full py-0.5"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(item.id)}
                            className="text-[var(--rubric)] p-1 shrink-0"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-manuscript font-semibold text-sm sm:text-base text-[var(--ink)] truncate flex-1 min-w-0">
                          {item.core?.title || item.title || "Untitled Scenario"}
                        </h3>
                      )}

                      <span className="text-[10px] font-mono-ui text-[var(--graphite)] shrink-0 flex items-center gap-1 pt-0.5">
                        <Calendar size={10} />
                        {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="font-manuscript text-xs text-[var(--ink)] line-clamp-2 italic mb-2.5">
                      “{item.core?.pitch || item.chosenTake?.pitch || item.sparkText}”
                    </p>

                    {/* Metadata tags row */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="lore-key-tag text-[9px] truncate max-w-full">
                        {genre}
                      </span>
                      {item.physics?.density && (
                        <span className="text-[10px] font-mono-ui text-[var(--graphite)]">
                          · {item.physics.density} World
                        </span>
                      )}
                      <span
                        aria-label={`Stage ${restoredStages.currentStage}, unlocked through ${restoredStages.maxUnlockedStage}`}
                        className="text-[10px] font-mono-ui text-[var(--graphite)]"
                      >
                        Stage {restoredStages.currentStage} · Unlocked through {restoredStages.maxUnlockedStage}
                      </span>
                    </div>

                    {/* Action buttons row with responsive wrap */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-[var(--ink-soft)]/40 text-[11px]">
                      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
                        <button
                          type="button"
                          onClick={() => handleStartRename(item.id, item.core?.title || item.title)}
                          className="text-[var(--graphite)] hover:text-[var(--ink)] flex items-center gap-1 font-apparatus py-1 px-1.5 rounded transition-colors cursor-pointer shrink-0"
                          title="Rename scenario"
                        >
                          <Edit2 size={12} />
                          <span>Rename</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDuplicateProject(project)}
                          className="text-[var(--graphite)] hover:text-[var(--ink)] flex items-center gap-1 font-apparatus py-1 px-1.5 rounded transition-colors cursor-pointer shrink-0"
                          title="Duplicate manuscript"
                        >
                          <Copy size={12} />
                          <span>Duplicate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteProject(item.id)}
                          className="text-[var(--graphite)] hover:text-[var(--rubric)] flex items-center gap-1 font-apparatus py-1 px-1.5 rounded transition-colors cursor-pointer shrink-0"
                          title="Delete manuscript"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                        <button type="button" disabled={preparingProjectId===item.id} onClick={()=>preparedGraph?onOpenGraph?.(preparedGraph.id):onPrepareGraph?.(project)} className="text-[var(--rubric)] flex items-center gap-1 font-apparatus py-1 px-1.5 rounded shrink-0" title="Opt-in Project Graph beta">
                          <Network size={12}/><span>{preparingProjectId===item.id?"Preparing…":preparedGraph?`Open Graph r${preparedGraph.revision}`:"Prepare Graph (Beta)"}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onLoadProject(project);
                          onClose();
                        }}
                        className="btn-primary text-xs py-1.5 px-3.5 flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-xs cursor-pointer w-full sm:w-auto"
                      >
                        <ExternalLink size={12} />
                        <span>Open Sheet</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--ink-soft)] bg-[var(--vellum-deep)]/50 flex justify-between items-center text-xs text-[var(--graphite)]">
          <span className="font-manuscript italic">
            Saved automatically in local storage.
          </span>
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
