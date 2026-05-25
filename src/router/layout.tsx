import { Outlet } from "react-router";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { type FC } from "react";
import { isRouteErrorResponse } from "react-router";
import BackupReminder from "@/components/BackupReminder";
import ErrorPage from "./errorPage";
import RequestUserActionHolder from "@/components/RequestUserActionHolder";
import type { Route } from "./+types/layout";

import "./main.css";

const AppLayout: FC<Route.ComponentProps> = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <AntApp className="app">
        <BackupReminder />
        <Outlet />
        <RequestUserActionHolder />
      </AntApp>
    </ConfigProvider>
  );
};

export default AppLayout;

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
