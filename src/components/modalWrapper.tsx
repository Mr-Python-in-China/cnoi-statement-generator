import { useCallback, useMemo, useState, type ComponentType } from "react";

export type ModalHandler<R> = Readonly<{
  visible: boolean;
  hide(): void;
  resolve(value: R): void;
  reject(reason: unknown): void;
  resolveHide(value: R): void;
  rejectHide(reason: unknown): void;
  remove(): void;
}>;

export type ModalWrapper<P, R> = ComponentType<
  P & { modalHandler: ModalHandler<R> }
>;

export function createModal<P = void, R = unknown>(
  Component: ComponentType<P & { modalHandler: ModalHandler<R> }>,
): ModalWrapper<P, R> {
  return Component;
}

export function useModal<P, R>(Component: ModalWrapper<P, R>) {
  type InternalProps = P & {
    modalHandler: ModalHandler<R>;
    modalKey: string; // ensure React will remount the component when shown again
  };
  const [props, setProps] = useState<InternalProps>();
  const hide = useCallback(
    () =>
      setProps(
        (prev) =>
          prev && {
            ...prev,
            modalHandler: {
              ...prev.modalHandler,
              visible: false,
            },
          },
      ),
    [],
  );
  const controller = useMemo(
    () => ({
      show(props: P) {
        return new Promise<R>((resolve, reject) =>
          setProps({
            ...props,
            modalKey: crypto.randomUUID(),
            modalHandler: {
              visible: true,
              resolve,
              reject,
              hide,
              remove: () => setProps(undefined),
              resolveHide: (v) => {
                resolve(v);
                hide();
              },
              rejectHide: (v) => {
                reject(v);
                hide();
              },
            },
          }),
        );
      },
    }),
    [hide],
  );
  const contextHolder = props && <Component {...props} key={props.modalKey} />;
  return [controller, contextHolder] as const;
}
