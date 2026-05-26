import { useEffect, useState } from "react";

import type { PromiseStatus } from "@/compiler";

import useTemplateManager from "./templateManagerContext";

export default function useCompilerReadyState(): PromiseStatus {
  const { compiler } = useTemplateManager();
  const [ready, setReady] = useState<PromiseStatus>(compiler.typstInitStatus);
  useEffect(() => {
    let mounted = true;
    compiler.typstInitPromise.then(
      () => {
        if (mounted) setReady("fulfilled");
      },
      () => {
        if (mounted) setReady("rejected");
      },
    );
    return () => {
      mounted = false;
    };
  }, [compiler.typstInitPromise]);
  return ready;
}
