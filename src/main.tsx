import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { RouterProvider } from "react-router";
import router from "./router";
import "./randomUuidPolyfill.ts";
import "./main.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <AntApp className="app">
        <RouterProvider router={router} />
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
