import type { Config } from "postcss-load-config";
import autoprefixer from "autoprefixer";
import postcssPresetEnv from "postcss-preset-env";

const config: Config = {
  plugins: [
    autoprefixer(),
    postcssPresetEnv({
      stage: 3,
    }),
  ],
};

export default config;
