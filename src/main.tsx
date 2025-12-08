import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import App from "./App.tsx";
import TypstInitStatusProvider from "./components/typstInitStatusProvider.tsx";

// Polyfill for crypto.randomUUID in insecure contexts
if (!("randomUUID" in crypto))
  // https://stackoverflow.com/a/2117523/2800218
  // LICENSE: https://creativecommons.org/licenses/by-sa/4.0/legalcode
  // @ts-expect-error pollyfill
  crypto.randomUUID = function randomUUID() {
    // @ts-expect-error pollyfill
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16),
    );
  };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <TypstInitStatusProvider>
          <App />
        </TypstInitStatusProvider>
      </AntApp>
    </ConfigProvider>
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
