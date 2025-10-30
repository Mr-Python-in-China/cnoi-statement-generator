import React from "react";
import { typstInitStatus } from "@/compiler";

export const TypstInitStatusContext =
  React.createContext<typeof typstInitStatus>(typstInitStatus);

export default function useTypstInitStatus() {
  return React.useContext(TypstInitStatusContext);
}
