import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { GenerationFailureNotice } from "../../src/components/GenerationFailureNotice";

test("failure notice explains preservation and offers recovery actions", () => {
  const html = renderToString(<GenerationFailureNotice
    message="The selected model timed out."
    onRetry={() => undefined}
    onOpenConnections={() => undefined}
  />);
  expect(html).toContain("The selected model timed out.");
  expect(html).toContain("Your existing work was preserved.");
  expect(html).toContain("Retry");
  expect(html).toContain("Connections");
});
