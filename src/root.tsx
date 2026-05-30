import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import type { FC, ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { isRouteErrorResponse } from "react-router";

import type { Route } from "./+types/root";
import RequestUserActionHolder from "./components/RequestUserActionHolder";
import ErrorPage from "./router/errorPage";

import "./main.css";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="在浏览器中通过 markdown 高效生成 NOI 官方风格题面，可用于模拟赛等。"
        />
        <meta
          name="keywords"
          content="CNOI,NOI,OI,题面生成器,题面,模拟赛,Markdown,Typst,信息学,竞赛"
        />
        <meta name="author" content="MrPython" />
        <title>CNOI statement generator</title>
        <Meta />
        <Links />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

const Root: FC = () => (
  <ConfigProvider locale={zhCN}>
    <AntApp className="app">
      <Outlet />
      <RequestUserActionHolder />
    </AntApp>
  </ConfigProvider>
);

export default Root;

export const ErrorBoundary: FC<Route.ErrorBoundaryProps> = ({ error }) => {
  return (
    <ErrorPage>
      {isRouteErrorResponse(error)
        ? error.status === 404
          ? "页面不存在"
          : error.status + " " + error.statusText
        : error instanceof Error
          ? "出现错误：" + error.message
          : "未知错误"}
    </ErrorPage>
  );
};
