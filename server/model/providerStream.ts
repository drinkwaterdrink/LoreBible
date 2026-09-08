import { appendBoundedReasoning } from "../../src/lib/reasoningBuffer.js";

export interface ProviderStreamUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  reasoning_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
}

export interface ProviderStreamHandlers {
  onContentDelta?: (delta: string) => void;
  onReasoningDelta?: (delta: string) => void;
  onUsage?: (usage: ProviderStreamUsage) => void;
  onProviderActivity?: () => void;
}

export interface ProviderStreamResult {
  text: string;
  reasoning?: string;
  usage?: ProviderStreamUsage;
  model?: string;
  finishReason?: string;
}

function textDelta(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((part) => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? (part as { text: string }).text : "").join("");
}

async function readWithSignal(reader: ReadableStreamDefaultReader<Uint8Array>, signal: AbortSignal) {
  if (signal.aborted) throw signal.reason || new DOMException("Cancelled", "AbortError");
  return await new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
    const onAbort = () => reject(signal.reason || new DOMException("Cancelled", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    reader.read().then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export async function consumeOpenAICompatibleStream(
  response: Response,
  handlers: ProviderStreamHandlers,
  signal: AbortSignal,
): Promise<ProviderStreamResult> {
  if (!response.body) throw new Error("The provider returned an empty streaming response.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let reasoning = "";
  let usage: ProviderStreamUsage | undefined;
  let model: string | undefined;
  let finishReason: string | undefined;
  let finished = false;

  const processFrame = (frame: string) => {
    const data = frame.split("\n").filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart()).join("\n").trim();
    if (!data) return;
    if (data === "[DONE]") { finished = true; return; }
    let payload: any;
    try { payload = JSON.parse(data); } catch { throw new Error("The provider returned a malformed streaming response."); }
    handlers.onProviderActivity?.();
    if (typeof payload?.model === "string") model = payload.model;
    if (payload?.usage && typeof payload.usage === "object") {
      usage = payload.usage;
      handlers.onUsage?.(usage);
    }
    const choice = Array.isArray(payload?.choices) ? payload.choices[0] : null;
    if (typeof choice?.finish_reason === "string") finishReason = choice.finish_reason;
    const delta = choice?.delta;
    const content = textDelta(delta?.content);
    if (content) { text += content; handlers.onContentDelta?.(content); }
    const reasoningDelta = typeof delta?.reasoning === "string" ? delta.reasoning : typeof delta?.reasoning_content === "string" ? delta.reasoning_content : "";
    if (reasoningDelta) {
      reasoning = appendBoundedReasoning(reasoning, reasoningDelta).text;
      handlers.onReasoningDelta?.(reasoningDelta);
    }
  };

  try {
    while (!finished) {
      const chunk = await readWithSignal(reader, signal);
      if (chunk.done) break;
      handlers.onProviderActivity?.();
      buffer += decoder.decode(chunk.value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        processFrame(frame);
        if (finished) break;
        boundary = buffer.indexOf("\n\n");
      }
    }
    buffer += decoder.decode();
    if (!finished && buffer.trim()) processFrame(buffer.replace(/\r\n/g, "\n"));
    return { text, reasoning: reasoning || undefined, usage, model, finishReason };
  } finally {
    try { await reader.cancel(); } catch {}
  }
}
