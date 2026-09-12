import { expect, test } from "bun:test";
import { createClientId } from "../../src/lib/clientId";

test("client IDs work when a mobile browser does not expose crypto.randomUUID", () => {
  const cryptoWithoutRandomUuid = {
    getRandomValues(bytes: Uint8Array) {
      bytes.fill(7);
      return bytes;
    },
  };

  const id = createClientId("board", cryptoWithoutRandomUuid);
  expect(id).toMatch(/^board-[0-9a-f-]{36}$/);
});
