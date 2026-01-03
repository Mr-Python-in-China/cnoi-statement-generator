import { createBrowserRouter } from "react-router";

const router = createBrowserRouter([
  {
    path: "/",
    lazy: async () => ({
      Component: (await import("./root")).default,
    }),
  },
]);

export default router;
