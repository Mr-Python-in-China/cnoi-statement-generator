import type * as mdast from "mdast";
import type { Plugin } from "unified";
import type { AssetInfo } from "./compiler";
import compileMdast from "./compiler";

export type { AssetInfo };

declare module "vfile" {
  interface DataMap {
    /**
     * Assets collected during compilation.
     */
    assets: Array<AssetInfo>;
  }
}

const remarkTypst: Plugin<[], mdast.Root, string> = function () {
  this.compiler = (tree, file) => {
    if (tree.type !== "root")
      throw new TypeError(`Expected root node, got ${tree.type}`);
    const [res, assets] = compileMdast(tree as mdast.Root);
    file.data.assets = assets;
    return res;
  };
};

export default remarkTypst;
