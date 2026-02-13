import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import "./randomUuidPolyfill.ts";

hydrateRoot(
  document,
  <StrictMode>
    <HydratedRouter />
  </StrictMode>,
);

import("browser-update").then(({ default: browserUpdate }) => {
  browserUpdate({
    required: {
      f: 88,
      c: 88,
      e: 88,
      o: 75,
      s: 16,
    },
    unsupported: true,
  });
});
