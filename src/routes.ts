import { route, type RouteConfig } from "@react-router/dev/routes";
import { glob } from "tinyglobby";

const docRoutes = (
  await glob("./**/*.typ", {
    cwd: "./docs",
    expandDirectories: false,
    extglob: false,
  })
).map((path) => {
  const r = path.split("/");
  r[r.length - 1] = r[r.length - 1].replace(/\.typ$/, "");
  if (r[r.length - 1] === "index") r.pop();
  return r.join("/");
});

export default [
  route("/", "./router/root/index.tsx"),
  route("/editor", "./router/editor/index.tsx"),
  ...docRoutes.map((path) =>
    route("/docs/" + path, `./router/docs/index.tsx`, {
      id: "docs/index?" + path,
    }),
  ),
] satisfies RouteConfig;
