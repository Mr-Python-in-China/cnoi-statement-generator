import { route, type RouteConfig } from "@react-router/dev/routes";

export default [
  route("/", "./router/root/index.tsx"),
  route("/editor", "./router/editor/index.tsx"),
] satisfies RouteConfig;
