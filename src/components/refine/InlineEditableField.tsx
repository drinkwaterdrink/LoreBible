import React, { useState, useEffect, useRef } from "react";

interface InlineEditableFieldProps {
  id?: string;
  value: string;
  onCommit: (nextValue: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  label?: string;
  highlightFinding?: {
    offendingText: string;
    explanation: string;
  };
  onSelectFinding?: () => void;
}

export const InlineEditableField: React.FC<InlineEditableFieldProps> = ({
  id,
  value,
  onCommit,
  multiline = false,
  className = "",
  placeholder = "Click to write...",
  label,
  highlightFinding,
  onSelectFinding,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [justCommitted, setJustCommitted] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) {
        // Position cursor at end
        inputRef.current.selectionStart = inputRef.current.value.length;
        inputRef.current.selectionEnd = inputRef.current.value.length;
      }
    }
  }, [isEditing]);

  const handleCommit = () => {
    setIsEditing(false);
    if (currentValue !== value) {
      onCommit(currentValue);
      setJustCommitted(true);
      setTimeout(() => setJustCommitted(false), 600);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCommit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  // Render text with proofreader's soft ochre underline if finding matches
  const renderMarkedUpText = (text: string) => {
    if (!highlightFinding || !highlightFinding.offendingText) {
      return text;
    }
    const target = highlightFinding.offendingText;
    const parts = text.split(new RegExp(`(${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => {
      if (part.toLowerCase() === target.toLowerCase()) {
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onSelectFinding?.();
            }}
            className="border-b-2 border-dashed border-[var(--gold)] bg-[var(--gold)]/10 cursor-pointer text-[var(--ink)] transition-colors hover:bg-[var(--gold)]/20"
            title={`Proofreader: ${highlightFinding.explanation}`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (isEditing) {
    return (
      <div className="inline-block w-full">
        {label && (
          <span className="font-apparatus uppercase text-[9px] text-[var(--graphite)] block mb-0.5 select-none">
            {label}
          </span>
        )}
        {multiline ? (
          <textarea
            id={id}
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            rows={Math.max(2, Math.min(6, currentValue.split("\n").length + 1))}
            className="w-full bg-transparent font-hand text-xl text-[var(--ink-blue)] leading-snug p-1 border-b border-[var(--ink-blue)]/50 focus:outline-none resize-y"
            placeholder={placeholder}
          />
        ) : (
          <input
            id={id}
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent font-hand text-xl text-[var(--ink-blue)] leading-tight p-0.5 border-b border-[var(--ink-blue)]/50 focus:outline-none"
            placeholder={placeholder}
          />
        )}
        <div className="flex justify-between items-center text-[9px] font-apparatus text-[var(--graphite)] pt-1">
          <span>Inking in scribe hand (press Return or click away to commit)</span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleCommit();
            }}
            className="text-[var(--gold)] hover:text-[var(--ink)] font-semibold uppercase tracking-wider"
          >
            Commit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      onClick={() => setIsEditing(true)}
      title="Click to edit in place"
      className={`group cursor-text transition-colors rounded-[1px] hover:bg-[var(--vellum-raised)]/70 relative ${
        justCommitted ? "animate-ink-bleed" : ""
      } ${className}`}
    >
      {label && (
        <span className="font-apparatus uppercase text-[9px] text-[var(--graphite)] font-semibold block mb-0.5 select-none">
          {label}
        </span>
      )}
      <div className="inline">
        {renderMarkedUpText(value || placeholder)}
      </div>
      <span className="opacity-0 group-hover:opacity-40 text-[9px] font-apparatus uppercase tracking-wider text-[var(--graphite)] ml-2 inline-block select-none pointer-events-none">
        ✎
      </span>
    </div>
  );
};
