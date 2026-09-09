import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { AppVersionBadge } from "../../src/components/AppVersionBadge";

test("renders the compact v0.38 app version", () => {
  const html = renderToString(<AppVersionBadge />);
  expect(html.replace("<!-- -->", "")).toContain("v0.38");
  expect(html).toContain('aria-label="LoreBible version 0.38"');
});
