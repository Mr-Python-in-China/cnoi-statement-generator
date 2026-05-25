import { layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  layout("./router/layout.tsx", [
    route("/", "./router/root/index.tsx"),
    route("/editor", "./router/editor/index.tsx"),
  ]),
] satisfies RouteConfig;
