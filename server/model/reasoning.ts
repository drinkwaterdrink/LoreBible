import { appendBoundedReasoning } from "../../src/lib/reasoningBuffer.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function reasoningFromParts(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  let text = "";
  for (const part of value) {
    const item = asRecord(part);
    if (!item || (item.type !== "reasoning" && item.type !== "reasoning_content")) continue;
    if (typeof item.text === "string") text = appendBoundedReasoning(text, item.text).text;
    else if (typeof item.content === "string") text = appendBoundedReasoning(text, item.content).text;
  }
  return text || undefined;
}

export function normalizeProviderReasoning(payload: unknown): { text?: string; reasoningTokens?: number } {
  const root = asRecord(payload);
  const choices = Array.isArray(root?.choices) ? root.choices : [];
  const choice = asRecord(choices[0]);
  const message = asRecord(choice?.message);
  let text = typeof message?.reasoning === "string"
    ? message.reasoning
    : typeof message?.reasoning_content === "string"
      ? message.reasoning_content
      : reasoningFromParts(message?.content);

  if (!text && Array.isArray(message?.reasoning_details)) {
    text = message.reasoning_details.map((detail) => {
      const item = asRecord(detail);
      return typeof item?.text === "string" ? item.text : typeof item?.content === "string" ? item.content : "";
    }).join("") || undefined;
  }
  if (text) text = appendBoundedReasoning("", text).text;

  const usage = asRecord(root?.usage);
  const details = asRecord(usage?.completion_tokens_details);
  const reasoningTokens = typeof details?.reasoning_tokens === "number" && Number.isFinite(details.reasoning_tokens)
    ? details.reasoning_tokens
    : typeof usage?.reasoning_tokens === "number" && Number.isFinite(usage.reasoning_tokens)
      ? usage.reasoning_tokens
      : undefined;
  return { text, reasoningTokens };
}
