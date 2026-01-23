import { type ReactNode } from "react";

export default interface ExampleMetaExport {
  displayName: string;
  title: string;
  template: string;
  description?: ReactNode;
}
