import type { FC } from "react";

import type { Route } from "./+types/index";
import { docBodies, docTitles, matchDoc } from "./import";

export const loader = async ({ pattern }: Route.LoaderArgs) => {
  const typstDoc = matchDoc(pattern.slice("/docs".length));
  if (!typstDoc) throw new Response("Not found", { status: 404 });
  return { title: docTitles[typstDoc], body: await docBodies[typstDoc]() };
};

const Docs: FC<Route.ComponentProps> = ({ loaderData }) =>
  JSON.stringify(loaderData);

export default Docs;
