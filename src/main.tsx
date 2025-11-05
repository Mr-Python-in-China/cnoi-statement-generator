import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, App as AntApp } from "antd";
import "@ant-design/v5-patch-for-react-19";
import zhCN from "antd/locale/zh_CN";
import App from "./App.tsx";
import TypstInitStatusProvider from "./components/typstInitStatusProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={{ cssVar: true }}>
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
      f: 117,
      c: 131,
      e: 131,
      o: 116,
    },
    unsupported: true,
  });
});
