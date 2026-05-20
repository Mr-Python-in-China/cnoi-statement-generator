import type { ImmerDocument } from "@/types/document";

let navigationState: {
  value:
    | {
        doc: ImmerDocument;
      }
    | undefined;
} = {
  value: undefined,
};

export default navigationState;
