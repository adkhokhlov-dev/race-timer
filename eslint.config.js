import erasableSyntaxOnly from "eslint-plugin-erasable-syntax-only";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  erasableSyntaxOnly.configs.recommended, // 👈
);
