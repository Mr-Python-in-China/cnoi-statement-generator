import { useCallback, useMemo, useState, type ReactNode } from "react";

import Explorer, { type ExplorerResult, type ExplorerProps } from "./Explorer";

export type { ExplorerResult };

type OmitPropertyFromUnion<
  TUnion,
  TKey extends keyof TUnion,
> = TUnion extends infer T ? Omit<T, TKey> : never;

export type ExplorerShowProps = OmitPropertyFromUnion<ExplorerProps, "onClose">;
type Pending = ExplorerShowProps & {
  resolve: (data: ExplorerResult) => void;
  open: boolean;
  key: string; // 确保每次 show 都会创建一个新的 Explorer 实例，重置状态
};

export const useExplorer = () => {
  const [pending, setPending] = useState<Pending | null>(null);

  const show = useCallback(
    (props: ExplorerShowProps) =>
      new Promise<ExplorerResult>((resolve) => {
        setPending({
          ...props,
          resolve,
          open: true,
          key: crypto.randomUUID(),
        });
      }),
    [],
  );

  const handleClose = useCallback((data: ExplorerResult) => {
    setPending((prev) => {
      if (prev) prev.resolve(data);
      return (
        prev && {
          ...prev,
          open: false,
        }
      );
    });
  }, []);

  const ContextHolder: ReactNode = useMemo(
    () => (
      <>
        {pending ? (
          <Explorer
            {...(({ resolve: _resolve, ...rest }) => rest)(pending)}
            key={pending.key}
            onClose={handleClose}
          />
        ) : null}
      </>
    ),
    [pending, handleClose],
  );

  const res = useMemo(() => ({ show, ContextHolder }), [show, ContextHolder]);
  return res;
};

export default useExplorer;
