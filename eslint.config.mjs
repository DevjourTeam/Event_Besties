import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // The custom canvas editor is a vendored copy of the standalone design-editor
  // app. It follows its own lint conventions, so it is excluded from the host
  // app's lint pass (it still compiles via webpack/allowJs).
  { ignores: ["components/editor/canvas/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
