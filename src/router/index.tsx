import { createBrowserRouter } from "react-router";
import ErrorBoundary from "./errorBoundary";

const router = createBrowserRouter([
  {
    ErrorBoundary,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import("./root")).default,
        }),
      },
      {
        path: "editor/:documentId",
        lazy: async () => ({
          Component: (await import("./editor")).default,
        }),
      },
    ],
  },
]);

export default router;
