import React, { useState, useEffect } from "react";
import {
  Entry,
  LoreBibleDocument,
  TestBenchMessage,
  GravityScores,
  VoiceCheckResult,
  OpeningAuditResult,
} from "../../types";
import { testBenchTurnApi, voiceCheckApi, openingAuditApi } from "../../services/geminiService";
import {
  Gauge,
  User,
  Send,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  MessageSquare,
  HelpCircle,
  Edit3,
  Check,
} from "lucide-react";
import { HandDrawnEmptyState } from "../HandDrawnEmptyState";
import { RuledLinesSkeleton } from "../RuledLinesSkeleton";

interface TestBenchEditorProps {
  document: LoreBibleDocument;
  onUpdateDocument: (doc: LoreBibleDocument) => void;
  sparkText?: string;
}

export const TestBenchEditor: React.FC<TestBenchEditorProps> = ({
  document,
  onUpdateDocument,
  sparkText,
}) => {
  const npcs = document.npcs || [];
  const [subTab, setSubTab] = useState<"simulation" | "voiceCheck" | "openingAudit">("simulation");

  // Simulation State
  const [selectedNpcId, setSelectedNpcId] = useState<string>(npcs[0]?.id || "");
  const [userInput, setUserInput] = useState<string>("");
  const [isTurnPending, setIsTurnPending] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<TestBenchMessage[]>([]);
  const [currentGravity, setCurrentGravity] = useState<GravityScores>({
    modelVoice: 12,
    protagonistGravity: 15,
    narrativeGravity: 20,
    convenienceGravity: 10,
    denialGravity: 10,
    diagnosticNotes: "Scenario anti-gravity instrumentation calibrated and active.",
  });

  // Voice Check State
  const [voiceNpcId, setVoiceNpcId] = useState<string>(npcs[0]?.id || "");
  const [voiceCheckResult, setVoiceCheckResult] = useState<VoiceCheckResult | null>(null);
  const [isVoiceCheckLoading, setIsVoiceCheckLoading] = useState<boolean>(false);

  // Opening Audit State
  const [openingText, setOpeningText] = useState<string>(document.opening?.firstMessage || "");
  const [auditResult, setAuditResult] = useState<OpeningAuditResult | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState<boolean>(false);
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);

  // Sync incoming opening message
  useEffect(() => {
    if (document.opening?.firstMessage && !openingText) {
      setOpeningText(document.opening.firstMessage);
    }
  }, [document.opening?.firstMessage]);

  const activeNpc = npcs.find((n) => n.id === selectedNpcId) || npcs[0];
  const activeVoiceNpc = npcs.find((n) => n.id === voiceNpcId) || npcs[0];

  // Run initial opening audit on mount if available
  useEffect(() => {
    if (openingText && !auditResult) {
      handleRunOpeningAudit();
    }
  }, []);

  const handleSendUserTurn = async (customPrompt?: string) => {
    const textToSend = (customPrompt || userInput).trim();
    if (!textToSend || !activeNpc || isTurnPending) return;

    const userMsg: TestBenchMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);
    setUserInput("");
    setIsTurnPending(true);

    try {
      const res = await testBenchTurnApi({
        npc: activeNpc,
        worldPhysics: document.worldPhysics,
        status: document.status,
        history: nextHistory,
        userInput: textToSend,
        sparkText: sparkText || document.core?.title,
      });

      const npcMsg: TestBenchMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "npc",
        content: res.reply,
        timestamp: new Date().toISOString(),
        gravity: res.gravity,
      };

      setChatHistory([...nextHistory, npcMsg]);
      setCurrentGravity(res.gravity);
    } catch (err) {
      console.error("Test bench turn failed:", err);
    } finally {
      setIsTurnPending(false);
    }
  };

  const handleRunVoiceCheck = async () => {
    if (!activeVoiceNpc || isVoiceCheckLoading) return;
    setIsVoiceCheckLoading(true);

    try {
      const npcName = activeVoiceNpc.fields?.name || "Character";
      // Generate sample dialogue lines based on character profile
      const sampleLines = [
        `"State your business, and keep your hands where I can see them."`,
        `"If you're looking for unearned sympathy, you've come to the wrong door."`,
        `"I could consider your request, but everything in this place carries an immediate price."`,
        `"Don't speak so loud. The walls here have ears, and neither of us needs the scrutiny."`,
        `"Make your decision before the window closes, or step aside."`,
      ];

      const res = await voiceCheckApi({
        lines: sampleLines,
        npcName,
        worldContext: document.core?.pitch || sparkText,
      });

      setVoiceCheckResult(res);
    } catch (err) {
      console.error("Voice check failed:", err);
    } finally {
      setIsVoiceCheckLoading(false);
    }
  };

  const handleRunOpeningAudit = async () => {
    if (!openingText.trim() || isAuditLoading) return;
    setIsAuditLoading(true);

    try {
      const res = await openingAuditApi({
        firstMessage: openingText,
        sparkText: document.core?.pitch || sparkText,
        rolePosition: document.user?.rolePosition,
      });
      setAuditResult(res);
    } catch (err) {
      console.error("Opening audit failed:", err);
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleSaveOpening = () => {
    if (!document.opening) return;
    const updated = {
      ...document,
      opening: {
        ...document.opening,
        firstMessage: openingText,
      },
    };
    onUpdateDocument(updated);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
    handleRunOpeningAudit();
  };

  const getGravityColor = (val: number) => {
    if (val < 25) return "bg-emerald-600 text-emerald-100";
    if (val < 50) return "bg-amber-600 text-amber-100";
    return "bg-[var(--rubric)] text-white";
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Apparatus */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ink-soft)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-[var(--ink-blue)]/15 text-[var(--ink-blue)] border border-[var(--ink-blue)]/30">
              <Gauge size={18} />
            </span>
            <h2 className="text-xl font-manuscript font-bold text-[var(--ink)] tracking-tight">
              Test Bench & Anti-Gravity Instrumentation
            </h2>
            <span className="text-[10px] font-apparatus uppercase tracking-wider px-2 py-0.5 rounded border border-[var(--ink-soft)] bg-[var(--vellum-raised)] text-[var(--graphite)]">
              Pre-Flight Validation
            </span>
          </div>
          <p className="text-xs font-manuscript text-[var(--graphite)] mt-1 max-w-2xl leading-relaxed">
            Stress-test your scenario before deployment. Verify NPC uncooperativeness, check against AI assistant clichés, and audit the opening message against the four cardinal sins.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 bg-[var(--vellum-deep)] p-1 rounded-[3px] border border-[var(--ink-soft)] text-xs font-apparatus">
          <button
            type="button"
            onClick={() => setSubTab("simulation")}
            className={`px-3 py-1.5 rounded-[2px] transition-all flex items-center gap-1.5 ${
              subTab === "simulation"
                ? "bg-[var(--vellum-raised)] text-[var(--ink)] font-semibold shadow-xs"
                : "text-[var(--graphite)] hover:text-[var(--ink)]"
            }`}
          >
            <MessageSquare size={13} />
            <span>Interactive Bench</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("voiceCheck")}
            className={`px-3 py-1.5 rounded-[2px] transition-all flex items-center gap-1.5 ${
              subTab === "voiceCheck"
                ? "bg-[var(--vellum-raised)] text-[var(--ink)] font-semibold shadow-xs"
                : "text-[var(--graphite)] hover:text-[var(--ink)]"
            }`}
          >
            <ShieldAlert size={13} />
            <span>NPC Voice Check</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("openingAudit")}
            className={`px-3 py-1.5 rounded-[2px] transition-all flex items-center gap-1.5 ${
              subTab === "openingAudit"
                ? "bg-[var(--vellum-raised)] text-[var(--ink)] font-semibold shadow-xs"
                : "text-[var(--graphite)] hover:text-[var(--ink)]"
            }`}
          >
            <FileSearch size={13} />
            <span>Opening Audit</span>
          </button>
        </div>
      </div>

      {/* 1. INTERACTIVE SIMULATION & GRAVITY READOUTS */}
      {subTab === "simulation" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Chat Canvas */}
          <div className="lg:col-span-8 p-5 rounded-[3px] border border-[var(--ink-soft)] bg-[var(--vellum-raised)] shadow-[var(--sheet-shadow)] space-y-4">
            {/* NPC Selector bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--ink-soft)]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-apparatus uppercase tracking-wider font-semibold text-[var(--graphite)]">
                  Active Interlocutor:
                </span>
                <select
                  value={selectedNpcId}
                  onChange={(e) => setSelectedNpcId(e.target.value)}
                  className="px-2.5 py-1 text-xs font-manuscript font-bold text-[var(--ink)] bg-[var(--vellum)] border border-[var(--ink-soft)] rounded-[2px] focus:outline-none focus:border-[var(--rubric)]"
                >
                  {npcs.map((npc) => (
                    <option key={npc.id} value={npc.id}>
                      {npc.fields?.name || npc.id} ({npc.fields?.role || "NPC"})
                    </option>
                  ))}
                </select>
              </div>

              {activeNpc && (
                <div className="text-[11px] font-manuscript italic text-[var(--graphite)]">
                  Wants: {activeNpc.fields?.wants || "Unknown"}
                </div>
              )}
            </div>

            {/* Conversation Messages */}
            <div className="min-h-[260px] max-h-[420px] overflow-y-auto space-y-3 pr-2">
              {chatHistory.length === 0 ? (
                <div className="py-4">
                  <HandDrawnEmptyState
                    sketchType="quill"
                    headline="The Proctor Waits"
                    handwrittenNote={`The room is cold. ${activeNpc?.fields?.name || "The character"} waits in silence behind the desk. Speak first to test their voice.`}
                  />
                </div>
              ) : (
                chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-[2px] text-xs leading-relaxed font-manuscript ${
                      msg.role === "user"
                        ? "bg-[var(--vellum)] border-l-2 border-[var(--ink-blue)] ml-6"
                        : "bg-[var(--vellum-deep)] border-l-2 border-[var(--rubric)] mr-6"
                    }`}
                  >
                    <div className="flex items-center justify-between font-apparatus uppercase text-[10px] font-semibold text-[var(--graphite)] mb-1">
                      <span>{msg.role === "user" ? "{{user}}" : activeNpc?.fields?.name || "NPC"}</span>
                      {msg.gravity && (
                        <span className="font-mono-ui text-[9px] px-1.5 py-0.2 rounded bg-[var(--ink-soft)]">
                          Model Voice: {msg.gravity.modelVoice}%
                        </span>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap text-[var(--ink)]">{msg.content}</div>
                  </div>
                ))
              )}

              {isTurnPending && (
                <div className="p-3 rounded-[2px] bg-[var(--vellum-deep)] mr-6">
                  <RuledLinesSkeleton
                    lines={2}
                    caption={`${activeNpc?.fields?.name || "NPC"} is evaluating your approach against their interests...`}
                  />
                </div>
              )}
            </div>

            {/* Quick Probe Suggestions */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--ink-soft)]">
              <span className="text-[10px] font-apparatus uppercase tracking-wider font-semibold text-[var(--graphite)] block">
                Tactical Probes (Test NPC Resistance):
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSendUserTurn("I present questionable credentials with an irregular seal.")}
                  className="px-2 py-1 text-[11px] font-manuscript rounded bg-[var(--vellum)] border border-[var(--ink-soft)] hover:border-[var(--graphite)] text-[var(--ink)]"
                >
                  &quot;Present questionable credentials&quot;
                </button>
                <button
                  type="button"
                  onClick={() => handleSendUserTurn("I offer an immediate private incentive to overlook protocol.")}
                  className="px-2 py-1 text-[11px] font-manuscript rounded bg-[var(--vellum)] border border-[var(--ink-soft)] hover:border-[var(--graphite)] text-[var(--ink)]"
                >
                  &quot;Attempt leverage / bribe&quot;
                </button>
                <button
                  type="button"
                  onClick={() => handleSendUserTurn("I ask about the unexpected incident that occurred just before I arrived.")}
                  className="px-2 py-1 text-[11px] font-manuscript rounded bg-[var(--vellum)] border border-[var(--ink-soft)] hover:border-[var(--graphite)] text-[var(--ink)]"
                >
                  &quot;Probe sensitive incident&quot;
                </button>
              </div>
            </div>

            {/* Input Controls */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendUserTurn();
                }}
                placeholder="Enter {{user}} action or spoken dialogue in quotes..."
                className="flex-1 px-3 py-2 rounded-[2px] text-xs font-manuscript text-[var(--ink)] bg-[var(--vellum)] border border-[var(--ink-soft)] focus:outline-none focus:border-[var(--rubric)]"
              />
              <button
                type="button"
                onClick={() => handleSendUserTurn()}
                disabled={isTurnPending || !userInput.trim()}
                className="px-4 py-2 rounded-[2px] text-xs font-apparatus font-bold bg-[var(--ink)] text-[var(--vellum)] hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>Probe</span>
              </button>
            </div>
          </div>

          {/* Right: Anti-Gravity Instrumentation Dashboard */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded-[3px] border border-[var(--ink-soft)] bg-[var(--vellum-raised)] shadow-[var(--sheet-shadow)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--ink-soft)] pb-2.5">
                <span className="font-apparatus uppercase tracking-wider text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                  <Gauge size={14} className="text-[var(--rubric)]" />
                  Anti-Gravity Telemetry
                </span>
                <span className="text-[9px] font-mono-ui uppercase px-1.5 py-0.5 rounded bg-[var(--sage)]/20 text-[var(--sage)] font-semibold">
                  Live Feed
                </span>
              </div>

              {/* 5 Gravity Attractors */}
              <div className="space-y-3 text-xs">
                {/* 1. Model Voice */}
                <div className="space-y-1">
                  <div className="flex justify-between font-apparatus text-[11px]">
                    <span className="text-[var(--ink)] font-semibold">1. Model Voice</span>
                    <span className="font-mono-ui">{currentGravity.modelVoice}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--vellum-deep)] overflow-hidden border border-[var(--ink-soft)]">
                    <div
                      className={`h-full transition-all duration-500 ${getGravityColor(currentGravity.modelVoice)}`}
                      style={{ width: `${currentGravity.modelVoice}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-manuscript text-[var(--graphite)]">
                    Generic assistant phrasing / helpfulness drift
                  </span>
                </div>

                {/* 2. Protagonist Gravity */}
                <div className="space-y-1">
                  <div className="flex justify-between font-apparatus text-[11px]">
                    <span className="text-[var(--ink)] font-semibold">2. Protagonist Gravity</span>
                    <span className="font-mono-ui">{currentGravity.protagonistGravity}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--vellum-deep)] overflow-hidden border border-[var(--ink-soft)]">
                    <div
                      className={`h-full transition-all duration-500 ${getGravityColor(currentGravity.protagonistGravity)}`}
                      style={{ width: `${currentGravity.protagonistGravity}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-manuscript text-[var(--graphite)]">
                    Unearned deference or special chosen-one treatment
                  </span>
                </div>

                {/* 3. Narrative Gravity */}
                <div className="space-y-1">
                  <div className="flex justify-between font-apparatus text-[11px]">
                    <span className="text-[var(--ink)] font-semibold">3. Narrative Gravity</span>
                    <span className="font-mono-ui">{currentGravity.narrativeGravity}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--vellum-deep)] overflow-hidden border border-[var(--ink-soft)]">
                    <div
                      className={`h-full transition-all duration-500 ${getGravityColor(currentGravity.narrativeGravity)}`}
                      style={{ width: `${currentGravity.narrativeGravity}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-manuscript text-[var(--graphite)]">
                    Cinematic grandiosity displacing tactile mundanity
                  </span>
                </div>

                {/* 4. Convenience Gravity */}
                <div className="space-y-1">
                  <div className="flex justify-between font-apparatus text-[11px]">
                    <span className="text-[var(--ink)] font-semibold">4. Convenience Gravity</span>
                    <span className="font-mono-ui">{currentGravity.convenienceGravity}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--vellum-deep)] overflow-hidden border border-[var(--ink-soft)]">
                    <div
                      className={`h-full transition-all duration-500 ${getGravityColor(currentGravity.convenienceGravity)}`}
                      style={{ width: `${currentGravity.convenienceGravity}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-manuscript text-[var(--graphite)]">
                    Unbolted doors, free answers, or cost-free assistance
                  </span>
                </div>

                {/* 5. Denial Gravity */}
                <div className="space-y-1">
                  <div className="flex justify-between font-apparatus text-[11px]">
                    <span className="text-[var(--ink)] font-semibold">5. Denial Gravity</span>
                    <span className="font-mono-ui">{currentGravity.denialGravity}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--vellum-deep)] overflow-hidden border border-[var(--ink-soft)]">
                    <div
                      className={`h-full transition-all duration-500 ${getGravityColor(currentGravity.denialGravity)}`}
                      style={{ width: `${currentGravity.denialGravity}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-manuscript text-[var(--graphite)]">
                    Minimizing established world dangers or physical ceiling
                  </span>
                </div>
              </div>

              {/* Diagnostic Notes */}
              <div className="p-3 rounded-[2px] bg-[var(--vellum)] border border-[var(--ink-soft)] text-xs font-manuscript text-[var(--ink)] space-y-1">
                <span className="font-apparatus uppercase text-[9px] font-bold text-[var(--rubric)] tracking-wider block">
                  Auditor Diagnostic:
                </span>
                <p className="leading-relaxed italic">{currentGravity.diagnosticNotes}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. NPC VOICE CHECK (ASSISTANT DRIFT SCRUTINY) */}
      {subTab === "voiceCheck" && (
        <div className="p-5 rounded-[3px] border border-[var(--ink-soft)] bg-[var(--vellum-raised)] shadow-[var(--sheet-shadow)] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ink-soft)] pb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-apparatus uppercase tracking-wider font-semibold text-[var(--graphite)]">
                Scrutinize NPC:
              </span>
              <select
                value={voiceNpcId}
                onChange={(e) => setVoiceNpcId(e.target.value)}
                className="px-3 py-1.5 text-xs font-manuscript font-bold text-[var(--ink)] bg-[var(--vellum)] border border-[var(--ink-soft)] rounded-[2px] focus:outline-none focus:border-[var(--rubric)]"
              >
                {npcs.map((npc) => (
                  <option key={npc.id} value={npc.id}>
                    {npc.fields?.name || npc.id} ({npc.fields?.role || "NPC"})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleRunVoiceCheck}
              disabled={isVoiceCheckLoading}
              className="px-4 py-1.5 rounded-[2px] text-xs font-apparatus font-bold bg-[var(--ink)] text-[var(--vellum)] hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-2"
            >
              <Sparkles
                size={13}
                className={`text-[var(--gold)] ${
                  isVoiceCheckLoading ? "animate-pulse" : ""
                }`}
              />
              <span>{isVoiceCheckLoading ? "Evaluating Voice..." : "Run 5-Line Voice Check"}</span>
            </button>
          </div>

          {voiceCheckResult ? (
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className="p-4 rounded-[2px] bg-[var(--vellum)] border border-[var(--ink-soft)] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-apparatus uppercase tracking-wider text-[10px] font-bold text-[var(--graphite)] block">
                    Voice Authenticity Rating:
                  </span>
                  <p className="text-xs font-manuscript text-[var(--ink)] mt-0.5">
                    {voiceCheckResult.summary}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono-ui font-bold text-[var(--rubric)]">
                    {voiceCheckResult.overallScore}
                  </span>
                  <span className="text-xs font-apparatus text-[var(--graphite)]">/ 100</span>
                </div>
              </div>

              {/* 5 Lines with Proofreader Margin Markings */}
              <div className="space-y-3">
                <span className="text-xs font-apparatus uppercase tracking-wider font-semibold text-[var(--ink)] block">
                  Line-by-Line Scrutiny
                </span>

                {voiceCheckResult.lines.map((line, idx) => (
                  <div
                    key={line.id}
                    className={`p-3.5 rounded-[2px] border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-manuscript ${
                      line.isGenericAssistant
                        ? "bg-[var(--rubric)]/5 border-[var(--rubric)]/40 text-[var(--ink)]"
                        : "bg-[var(--vellum)] border-[var(--ink-soft)] text-[var(--ink)]"
                    }`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 font-apparatus uppercase text-[10px] font-semibold text-[var(--graphite)]">
                        <span>Line {idx + 1}</span>
                        {line.isGenericAssistant ? (
                          <span className="px-1.5 py-0.2 rounded bg-[var(--rubric)] text-white text-[9px]">
                            Assistant Cliché Flagged
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 text-[9px]">
                            Grounded Voice
                          </span>
                        )}
                      </div>
                      <p className="italic text-sm text-[var(--ink)]">{line.text}</p>
                    </div>

                    {/* Proofreader margin note */}
                    <div className="md:max-w-xs p-2 rounded-[2px] bg-[var(--vellum-raised)] border border-[var(--ink-soft)] text-[11px] font-manuscript">
                      <span className="font-hand text-[var(--ink-blue)] font-bold block mb-0.5">
                        Proofreader Note:
                      </span>
                      <p className="text-[var(--graphite)]">{line.proofreaderNote}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6">
              <HandDrawnEmptyState
                sketchType="marginalia"
                headline="5-Line Voice Check"
                handwrittenNote={`Generate five authentic dialogue probes from ${activeVoiceNpc?.fields?.name || "this character"} and audit them for assistant clichés.`}
                actionButton={{
                  label: "Run Voice Check",
                  onClick: handleRunVoiceCheck,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 3. OPENING MESSAGE AUDIT (4 CARDINAL SINS CHECK) */}
      {subTab === "openingAudit" && (
        <div className="p-5 rounded-[3px] border border-[var(--ink-soft)] bg-[var(--vellum-raised)] shadow-[var(--sheet-shadow)] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--ink-soft)] pb-3">
            <div>
              <h3 className="text-sm font-manuscript font-bold text-[var(--ink)]">
                Opening Message Audit & Refinement
              </h3>
              <p className="text-xs font-manuscript text-[var(--graphite)]">
                Guarantees the first message opens in media res, avoids describing &#123;&#123;user&#125;&#125;&apos;s thoughts/feelings, and ends on tension rather than conversational questions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunOpeningAudit}
                disabled={isAuditLoading}
                className="px-3.5 py-1.5 rounded-[2px] text-xs font-apparatus font-bold bg-[var(--ink)] text-[var(--vellum)] hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                <FileSearch
                  size={13}
                  className={`text-[var(--gold)] ${
                    isAuditLoading ? "animate-pulse" : ""
                  }`}
                />
                <span>{isAuditLoading ? "Auditing Opening..." : "Audit Opening"}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveOpening}
                className="px-3.5 py-1.5 rounded-[2px] text-xs font-apparatus bg-[var(--vellum-raised)] border border-[var(--ink-soft)] hover:border-[var(--rubric)] text-[var(--ink)] transition-all flex items-center gap-1.5"
              >
                {isSavedNotice ? <Check size={13} className="text-emerald-600" /> : <Edit3 size={13} />}
                <span>{isSavedNotice ? "Saved!" : "Save & Re-Audit"}</span>
              </button>
            </div>
          </div>

          {/* Audit Status Banner */}
          {auditResult && (
            <div
              className={`p-4 rounded-[2px] border flex flex-wrap items-center justify-between gap-4 ${
                auditResult.passed
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                  : "bg-[var(--rubric)]/10 border-[var(--rubric)]/30 text-[var(--rubric)]"
              }`}
            >
              <div className="flex items-center gap-3">
                {auditResult.passed ? (
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle size={20} className="text-[var(--rubric)] shrink-0" />
                )}
                <div>
                  <span className="font-apparatus uppercase tracking-wider text-[11px] font-bold block">
                    {auditResult.passed ? "All Cardinal Sins Resolved (PASS)" : "Cardinal Sins Flagged in Opening"}
                  </span>
                  <p className="text-xs font-manuscript mt-0.5 text-[var(--ink)]">
                    {auditResult.overallCritique}
                  </p>
                </div>
              </div>

              <div className="font-mono-ui text-xs font-bold text-[var(--ink)]">
                Word Count: {auditResult.wordCount} words
              </div>
            </div>
          )}

          {/* The 4 Cardinal Sins Breakdown */}
          {auditResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {auditResult.sins.map((sin) => (
                <div
                  key={sin.id}
                  className={`p-3.5 rounded-[2px] border space-y-2 text-xs font-manuscript ${
                    sin.flagged
                      ? "bg-[var(--rubric)]/5 border-[var(--rubric)]/40"
                      : "bg-[var(--vellum)] border-[var(--ink-soft)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-apparatus uppercase text-[10px] font-bold text-[var(--ink)]">
                      {sin.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono-ui px-1.5 py-0.2 rounded font-semibold ${
                        sin.flagged ? "bg-[var(--rubric)] text-white" : "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {sin.flagged ? "VIOLATION" : "CLEAN"}
                    </span>
                  </div>

                  <p className="text-[var(--graphite)] text-[11px] leading-relaxed">
                    {sin.explanation}
                  </p>

                  {sin.quote && (
                    <div className="p-2 rounded-[2px] bg-[var(--vellum-raised)] border border-[var(--ink-soft)] text-[11px] italic text-[var(--rubric)]">
                      &quot;{sin.quote}&quot;
                    </div>
                  )}

                  <div className="pt-1 text-[11px] text-[var(--ink)] border-t border-[var(--ink-soft)]/50">
                    <span className="font-apparatus uppercase text-[9px] font-semibold text-[var(--graphite)] block">
                      Remedy Guidance:
                    </span>
                    {sin.remedy}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Editable First Message Canvas */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-apparatus uppercase tracking-wider font-semibold text-[var(--graphite)]">
                Opening Message Prose (Editable)
              </label>
              <span className="text-[10px] font-mono-ui text-[var(--graphite)]">
                Macro: Use {"{{user}}"} for the player character
              </span>
            </div>

            <textarea
              rows={8}
              value={openingText}
              onChange={(e) => setOpeningText(e.target.value)}
              className="w-full p-4 rounded-[2px] text-xs sm:text-sm font-manuscript text-[var(--ink)] bg-[var(--vellum)] border border-[var(--ink-soft)] focus:outline-none focus:border-[var(--rubric)] leading-relaxed resize-y"
              placeholder="Start in media res: an unexpected sound, a tense threshold, an interlocutor demanding answers..."
            />
          </div>
        </div>
      )}
    </div>
  );
};
