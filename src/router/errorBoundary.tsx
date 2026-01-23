import { type FC } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";
import ErrorPage from "./errorPage";

const ErrorBoundary: FC = () => {
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

export default ErrorBoundary;
