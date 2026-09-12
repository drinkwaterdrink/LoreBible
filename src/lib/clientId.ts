interface BrowserCrypto {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
}

let fallbackCounter = 0;

function bytesToUuid(bytes: Uint8Array): string {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Create a browser-safe local identifier, including on non-secure LAN origins. */
export function createClientId(prefix: string, cryptoImpl: BrowserCrypto | undefined = globalThis.crypto): string {
  if (typeof cryptoImpl?.randomUUID === "function") return `${prefix}-${cryptoImpl.randomUUID()}`;
  if (typeof cryptoImpl?.getRandomValues === "function") {
    const bytes = cryptoImpl.getRandomValues(new Uint8Array(16));
    return `${prefix}-${bytesToUuid(bytes)}`;
  }
  fallbackCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${fallbackCounter.toString(36)}`;
}
