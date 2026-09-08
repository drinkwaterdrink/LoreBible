import { parseGenerationStreamEvent, type GenerationStreamEvent, type GenerationTerminalEvent } from "../contracts/generationProgress";

function readWithSignal(reader: ReadableStreamDefaultReader<Uint8Array>, signal?: AbortSignal): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (!signal) return reader.read();
  if (signal.aborted) return Promise.reject(signal.reason || new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason || new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    reader.read().then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function parseBlock(block: string): GenerationStreamEvent | null {
  const dataLines: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  return parseGenerationStreamEvent(JSON.parse(dataLines.join("\n")));
}

export async function consumeGenerationSse(
  response: Response,
  options: { signal?: AbortSignal; onEvent: (event: GenerationStreamEvent) => void },
): Promise<GenerationTerminalEvent> {
  if (!response.ok || !response.body) throw new Error(`Generation stream failed with HTTP ${response.status}.`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let terminal: GenerationTerminalEvent | null = null;
  try {
    while (!terminal) {
      const { done, value } = await readWithSignal(reader, options.signal);
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";
      for (const block of blocks) {
        const event = parseBlock(block);
        if (!event) continue;
        options.onEvent(event);
        if (event.type === "done" || event.type === "cancelled" || event.type === "error") {
          terminal = event;
          break;
        }
      }
    }
    if (!terminal) throw new Error("Generation stream ended before a terminal event.");
    return terminal;
  } finally {
    try { await reader.cancel(); } catch { /* stream may already be closed or aborted */ }
    try { reader.releaseLock(); } catch { /* reader may already be released */ }
  }
}
