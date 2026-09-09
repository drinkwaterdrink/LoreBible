import { EventEmitter } from "node:events";
import { expect, test } from "bun:test";
import { abortableDelay, createRequestAbortSignal, createSseSession } from "../../server/generation/requestLifecycle";

test("request lifecycle aborts on a premature response close only", () => {
  const req = new EventEmitter() as any;
  req.aborted = false;
  const res = new EventEmitter() as any;
  res.writableEnded = false;
  const lifecycle = createRequestAbortSignal(req, res);
  res.emit("close");
  expect(lifecycle.signal.aborted).toBe(true);
  lifecycle.dispose();

  const normalReq = new EventEmitter() as any;
  normalReq.aborted = false;
  const normalRes = new EventEmitter() as any;
  normalRes.writableEnded = true;
  const normal = createRequestAbortSignal(normalReq, normalRes);
  normalRes.emit("close");
  expect(normal.signal.aborted).toBe(false);
  normal.dispose();
});

test("abortable delay stops immediately", async () => {
  const controller = new AbortController();
  const pending = abortableDelay(5000, controller.signal);
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
});

test("SSE session emits exactly one terminal event", () => {
  const writes: string[] = [];
  const res = {
    writableEnded: false,
    setHeader() {},
    flushHeaders() {},
    write(value: string) { writes.push(value); },
    end() { this.writableEnded = true; },
  } as any;
  const session = createSseSession(res, "forge");
  session.finish({ type: "done", task: "forge", result: {} });
  session.finish({ type: "error", task: "forge", message: "late" });
  expect(writes.filter((value) => value.includes("event: done"))).toHaveLength(1);
  expect(writes.some((value) => value.includes("event: error"))).toBe(false);
  expect(session.isFinished).toBe(true);
  expect(session.send({ type: "heartbeat", task: "forge" })).toBe(false);
  expect(session.send({ type: "section", task: "forge", key: "late", data: {} })).toBe(false);
  expect(writes).toHaveLength(1);
});

test("SSE cancellation is terminal and cannot be replaced by a late success", () => {
  const writes: string[] = [];
  const res = {
    writableEnded: false,
    setHeader() {},
    flushHeaders() {},
    write(value: string) { writes.push(value); },
    end() { this.writableEnded = true; },
  } as any;
  const session = createSseSession(res, "divergence");

  session.finish({ type: "cancelled", task: "divergence", message: "Stopped by user." });
  session.finish({ type: "done", task: "divergence", result: { takes: [] } });

  expect(writes.filter((value) => value.includes("event: cancelled"))).toHaveLength(1);
  expect(writes.some((value) => value.includes("event: done"))).toBe(false);
  expect(res.writableEnded).toBe(true);
});
