import TemplateManager from "@/templateManager";
import { createContext, useContext } from "react";

export const TemplateManagerContext = createContext<TemplateManager | null>(
  new TemplateManager("cnoi"),
);

export default function useTemplateManager() {
  const res = useContext(TemplateManagerContext);
  if (res === null) throw new Error("TemplateManagerContext is null");
  return res;
}
