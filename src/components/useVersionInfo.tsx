import { useCallback, useMemo, useState } from "react";
import { VersionInfoModal } from "./VersionInfo";

export function useVersionInfo() {
  const [isOpen, setIsOpen] = useState(false);

  const show = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const contextHolder = useMemo(
    () => <VersionInfoModal open={isOpen} onClose={close} />,
    [isOpen, close],
  );

  return {
    show,
    close,
    contextHolder,
  };
}
