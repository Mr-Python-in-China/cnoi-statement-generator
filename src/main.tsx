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

console.debug("App started");
