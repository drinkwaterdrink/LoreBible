import React from "react";
import { APP_VERSION } from "../version";

export function AppVersionBadge() {
  return <span
    aria-label={`LoreBible version ${APP_VERSION}`}
    className="font-mono-ui text-[8px] leading-none tracking-wide text-[var(--graphite)] opacity-70"
  >v{APP_VERSION}</span>;
}
