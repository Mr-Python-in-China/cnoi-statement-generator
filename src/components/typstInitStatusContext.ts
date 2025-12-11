import React from "react";
import CompilerInstance from "@/compiler";

export const TypstInitStatusContext = React.createContext<
  CompilerInstance["typstInitStatus"] | null
>(null);

export default function useTypstInitStatus() {
  const res = React.useContext(TypstInitStatusContext);
  if (res === null) throw new Error("TypstInitStatusContext is null");
  return res;
}
