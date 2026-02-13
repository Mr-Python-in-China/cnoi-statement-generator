import { Outlet } from "react-router";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { type FC } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";
import ErrorPage from "./errorPage";

import "./main.css";

const AppLayout = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <AntApp className="app">
        <Outlet />
      </AntApp>
    </ConfigProvider>
  );
};

export default AppLayout;

export const ErrorBoundary: FC = () => {
  const error = useRouteError();
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
