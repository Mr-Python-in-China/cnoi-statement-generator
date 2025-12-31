import { useEffect, useState } from "react";
import useTemplateManager from "./templateManagerContext";
import type { PromiseStatus } from "@/compiler";

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
