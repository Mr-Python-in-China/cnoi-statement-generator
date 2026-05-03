import { redirect } from "react-router";
import type { Route } from "./+types/_docUuidInPath";

export async function clientLoader({ params }: Route.LoaderArgs) {
  throw redirect(
    "/editor?file=" + encodeURIComponent("browser:" + params.docId),
  );
}

export default function () {}
