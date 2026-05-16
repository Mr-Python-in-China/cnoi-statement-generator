import type { RouteConfig } from "@react-router/dev/routes";

export default [
  {
    path: "/",
    file: "./router/layout.tsx",
    children: [
      {
        index: true,
        file: "./router/root/index.tsx",
      },
      {
        path: "editor",
        file: "./router/editor/index.tsx",
      },
      {
        path: "editor/:docId",
        file: "./router/editor/_docUuidInPath.tsx",
      },
    ],
  },
] satisfies RouteConfig;
