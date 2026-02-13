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
        path: "editor/:documentId",
        file: "./router/editor/index.tsx",
      },
    ],
  },
] satisfies RouteConfig;
