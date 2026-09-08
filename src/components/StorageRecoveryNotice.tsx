import React from "react";
import { ArchiveRestore, X } from "lucide-react";

interface StorageRecoveryNoticeProps {
  message: string;
  onDismiss: () => void;
}

export function StorageRecoveryNotice({ message, onDismiss }: StorageRecoveryNoticeProps) {
  return (
    <div role="alert" className="fixed bottom-4 left-1/2 z-[70] flex w-[min(92vw,42rem)] -translate-x-1/2 items-start gap-3 border border-[var(--rubric)] bg-[var(--vellum-raised)] p-3 shadow-xl">
      <ArchiveRestore size={18} className="mt-0.5 shrink-0 text-[var(--rubric)]" />
      <div className="min-w-0 flex-1 text-xs">
        <p className="font-manuscript text-[var(--ink)]">{message}</p>
        <p className="mt-1 text-[11px] italic text-[var(--graphite)]">Your current in-memory work remains available.</p>
      </div>
      <button type="button" onClick={onDismiss} className="btn-secondary flex shrink-0 items-center gap-1 px-2 py-1 text-[10px]">
        <X size={11} /> Dismiss
      </button>
    </div>
  );
}
