import type { Request, Response } from "express";
import type { GenerationStreamEvent, GenerationTask, GenerationTerminalEvent } from "../../src/contracts/generationProgress.js";

export function createRequestAbortSignal(req: Request, res: Response): { signal: AbortSignal; dispose(): void } {
  const controller = new AbortController();
  const abort = () => {
    if (!controller.signal.aborted) controller.abort(new DOMException("Client disconnected", "AbortError"));
  };
  const onResponseClose = () => { if (!res.writableEnded) abort(); };
  req.on("aborted", abort);
  res.on("close", onResponseClose);
  if (req.aborted) abort();
  return {
    signal: controller.signal,
    dispose() {
      req.off("aborted", abort);
      res.off("close", onResponseClose);
    },
  };
}

export function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason || new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); resolve(); }, ms);
    const onAbort = () => { clearTimeout(timeout); cleanup(); reject(signal.reason || new DOMException("Aborted", "AbortError")); };
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function createSseSession(res: Response, task: GenerationTask) {
  let finished = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: GenerationStreamEvent): boolean => {
    if (finished || res.writableEnded) return false;
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    return true;
  };
  const stopHeartbeat = () => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
  };
  return {
    get isFinished() { return finished; },
    send,
    startHeartbeat(ms = 10_000) {
      if (heartbeat || finished) return;
      heartbeat = setInterval(() => send({ type: "heartbeat", task }), ms);
    },
    finish(event: GenerationTerminalEvent) {
      if (finished) return;
      stopHeartbeat();
      send(event);
      finished = true;
      if (!res.writableEnded) res.end();
    },
    dispose() { stopHeartbeat(); },
  };
}
