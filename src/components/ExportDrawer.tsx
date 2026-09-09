import React, { useState } from "react";
import { LoreBibleDocument } from "../types";
import {
  generateMarkdownExport,
  generateJsonExport,
  generateLorebookExport,
  generateLumiverseWorldBookExport,
  generateCharacterCardExport,
  generateCharacterCardV3,
  generateCharXBundle,
  generatePlainTextBrief,
} from "../lib/exportGenerators";
import { X, Copy, Download, Check, FileText, Sparkles, Archive } from "lucide-react";

interface ExportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: LoreBibleDocument;
}

type ExportTabKey = "charx" | "characterCard" | "markdown" | "json" | "nativeLorebook" | "portableLorebook" | "brief";

export const ExportDrawer: React.FC<ExportDrawerProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  const [activeTab, setActiveTab] = useState<ExportTabKey>("charx");
  const [copied, setCopied] = useState(false);
  const [isPackagingCharx, setIsPackagingCharx] = useState(false);

  if (!isOpen) return null;

  const baseTitle = (document.core?.title || "scenario").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const charxPreviewJson = JSON.stringify(generateCharacterCardV3(document), null, 2);

  const contentMap: Record<ExportTabKey, { content: string; filename: string; mime: string; label: string; isBinary?: boolean }> = {
    charx: {
      content: charxPreviewJson,
      filename: `${baseTitle}.charx`,
      mime: "application/zip",
      label: "CharX (Lumiverse)",
      isBinary: true,
    },
    characterCard: {
      content: generateCharacterCardExport(document),
      filename: `${baseTitle}-character-card.json`,
      mime: "application/json",
      label: "Character Card (V2)",
    },
    markdown: {
      content: generateMarkdownExport(document),
      filename: `${baseTitle}.md`,
      mime: "text/markdown",
      label: "Markdown",
    },
    json: {
      content: generateJsonExport(document),
      filename: `${baseTitle}.json`,
      mime: "application/json",
      label: "Full JSON",
    },
    nativeLorebook: {
      content: generateLumiverseWorldBookExport(document),
      filename: `${baseTitle}-lumiverse-world-book.json`,
      mime: "application/json",
      label: "Lumiverse World Book",
    },
    portableLorebook: {
      content: generateLorebookExport(document),
      filename: `${baseTitle}-portable-lorebook.json`,
      mime: "application/json",
      label: "Portable Lorebook",
    },
    brief: {
      content: generatePlainTextBrief(document),
      filename: `${baseTitle}-brief.txt`,
      mime: "text/plain",
      label: "Plain-text brief",
    },
  };

  const currentItem = contentMap[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentItem.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (activeTab === "charx") {
      setIsPackagingCharx(true);
      try {
        const charxBlob = await generateCharXBundle(document);
        const url = URL.createObjectURL(charxBlob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = currentItem.filename;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to generate CharX bundle:", err);
      } finally {
        setIsPackagingCharx(false);
      }
      return;
    }

    const blob = new Blob([currentItem.content], { type: currentItem.mime });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = currentItem.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="export-drawer-container"
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn"
      onClick={onClose}
    >
      {/* Sliding Vellum Sheet Drawer */}
      <div
        id="export-drawer-sheet"
        className="w-full max-w-2xl bg-[var(--vellum)] border-l border-[var(--ink-soft)] shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-in-out relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--ink-soft)] bg-[var(--vellum-raised)] flex items-baseline justify-between">
          <div>
            <span className="font-apparatus uppercase text-[9px] tracking-widest text-[var(--graphite)] block font-semibold">
              Manuscript Dispatch · Export Drawer
            </span>
            <h2 className="font-manuscript font-semibold text-lg sm:text-xl text-[var(--ink)] leading-tight">
              {document.core.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--graphite)] hover:text-[var(--ink)] p-1.5 transition-colors rounded-[2px]"
            title="Close Drawer (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Paper Tabs along edge of drawer with horizontal scrolling on mobile */}
        <div className="flex border-b border-[var(--ink-soft)] px-3 sm:px-5 pt-2 bg-[var(--vellum-raised)] gap-1 overflow-x-auto no-scrollbar touch-pan-x select-none shrink-0">
          {(
            [
              { id: "charx", label: "CharX (Lumiverse)" },
              { id: "characterCard", label: "Character Card (V2)" },
              { id: "markdown", label: "Markdown" },
              { id: "json", label: "Full JSON" },
              { id: "nativeLorebook", label: "Lumiverse World Book" },
              { id: "portableLorebook", label: "Portable Lorebook" },
              { id: "brief", label: "Plain-Text Brief" },
            ] as { id: ExportTabKey; label: string }[]
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-apparatus uppercase tracking-wider rounded-t-[3px] border-t border-l border-r transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  isActive
                    ? "bg-[var(--vellum)] border-[var(--ink-soft)] text-[var(--ink)] font-semibold border-b-transparent shadow-xs -mb-[1px]"
                    : "bg-transparent border-transparent text-[var(--graphite)] hover:text-[var(--ink)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Format Specific Notice / Guidance */}
        <div className="px-4 sm:px-5 py-2.5 bg-[var(--vellum)] border-b border-[var(--ink-soft)]/60 text-xs font-manuscript flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <p className="text-[var(--graphite)] text-[11px] leading-snug flex-1">
            {activeTab === "charx" ? (
              <span className="italic flex items-center gap-1">
                <Sparkles size={12} className="text-[var(--gold)] shrink-0" />
                <span>
                  <strong>Lumiverse CharX Bundle:</strong> CharacterCardV3 specification with embedded lorebook inside a ready-to-import <code className="bg-[var(--vellum-raised)] px-1 py-0.5 rounded border border-[var(--ink-soft)]">.charx</code> ZIP archive.
                </span>
              </span>
            ) : activeTab === "nativeLorebook" ? (
              <span className="italic">
                *Native Lumiverse World Book: preserves the observed activation, placement, priority, recursion, timing, group, and vector fields. Structurally validated against supplied native schema evidence; verify runtime behavior with Lumiverse Dry Run and Diagnostics.
              </span>
            ) : activeTab === "portableLorebook" ? (
              <span className="italic">
                *Portable Lorebook: preserves focused content, keys, enabled state, order, and depth. Advanced native controls are not equivalent and are intentionally omitted; use the Lumiverse World Book for full fidelity.
              </span>
            ) : activeTab === "characterCard" ? (
              <span className="italic">
                *V2 Character Card JSON: non-volatile scenario architecture compatible with SillyTavern, Chub, and character platforms.
              </span>
            ) : activeTab === "markdown" ? (
              <span className="italic">
                *Complete, formatted typeset manuscript, suitable for documentation, scenario repositories, or paste.
              </span>
            ) : activeTab === "brief" ? (
              <span className="italic">
                *Human-readable pitch brief summarizing the core conflict, rules, user position, and cast.
              </span>
            ) : (
              <span className="italic">
                *Complete, unabridged LoreBibleDocument JSON blueprint.
              </span>
            )}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] hover:bg-[var(--vellum-deep)] rounded-[2px] text-xs font-apparatus uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check size={13} className="text-[var(--sage)]" /> : <Copy size={13} />}
              <span>{copied ? "Copied" : activeTab === "charx" ? "Copy card.json" : "Copy"}</span>
            </button>
            <button
              type="button"
              disabled={isPackagingCharx}
              onClick={handleDownload}
              className="px-3 py-1 bg-[var(--rubric)] text-[var(--vellum-raised)] hover:opacity-90 rounded-[2px] text-xs font-apparatus font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isPackagingCharx ? (
                <Archive size={13} className="animate-pulse text-[var(--gold)]" />
              ) : (
                <Download size={13} />
              )}
              <span>
                {isPackagingCharx
                  ? "Packaging..."
                  : activeTab === "charx"
                  ? "Download .charx"
                  : "Download"}
              </span>
            </button>
          </div>
        </div>

        {/* Live Mono Specimen Preview */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 bg-[var(--vellum)] font-mono-ui text-xs overscroll-contain">
          {activeTab === "charx" && (
            <div className="mb-2 p-2 bg-[var(--vellum-raised)] border border-[var(--gold)]/40 rounded-[2px] text-[10px] text-[var(--ink)] flex items-center justify-between">
              <span className="font-apparatus">
                Archive root: <strong>card.json</strong> (CharacterCardV3) + <strong>lumiverse-manifest.json</strong>
              </span>
              <span className="text-[var(--graphite)]">Bundle format</span>
            </div>
          )}
          <pre className="p-3 sm:p-4 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[2px] leading-relaxed text-[var(--ink)] whitespace-pre-wrap selection:bg-[var(--gold)]/20 shadow-inner overflow-x-auto text-[11px]">
            {currentItem.content}
          </pre>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-[var(--vellum-raised)] border-t border-[var(--ink-soft)] text-[10px] font-apparatus text-[var(--graphite)] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText size={12} />
            <span>{currentItem.filename}</span>
          </div>
          <span>
            {activeTab === "charx"
              ? "Lumiverse Bundle (.charx)"
              : `${currentItem.content.length.toLocaleString()} characters`}
          </span>
        </div>
      </div>
    </div>
  );
};
