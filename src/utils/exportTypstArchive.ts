import type { DocumentBase } from "@/types/document";
import { send } from "@mr.python/promise-worker-ts";
import type { ExportTypstArchiveMessage } from "@/compiler/compiler.worker";
import TypstWorker from "@/compiler/compiler.worker?worker";

export async function exportTypstArchive(doc: DocumentBase) {
  const worker = new TypstWorker();
  try {
    const archive = await send<ExportTypstArchiveMessage>(
      "exportTypstArchive",
      worker,
      doc,
    );
    const blob = new Blob([new Uint8Array(archive)], {
      type: "application/zip",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name}-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    worker.terminate();
  }
}
