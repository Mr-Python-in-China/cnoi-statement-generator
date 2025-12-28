import type { ContentBase, ImmerContent } from "@/types/document";
import type { Updater } from "use-immer";
import type { Draft } from "immer";

export function pushBackImage<Base extends ContentBase = ContentBase>(
  data: Base["images"][number],
  update: Updater<ImmerContent<Base>>,
) {
  const url = URL.createObjectURL(data.blob);
  update((doc) => {
    // @ts-expect-error typescript cannot infer Draft<ImmerContent<Base>> correctly
    (doc.images as Draft<ImmerContent<Base>["images"]>).push({
      ...data,
      url,
    });
  });
}

export function eraseImageByIndex<Content extends ContentBase = ContentBase>(
  index: number,
  update: Updater<ImmerContent<Content>>,
) {
  update((doc) => {
    const [removed] =
      // @ts-expect-error same as pushBackImage
      (doc.images as Draft<ImmerContent<Base>["images"]>).splice(index, 1);
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }
  });
}
