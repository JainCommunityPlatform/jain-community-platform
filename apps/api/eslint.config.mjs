import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  {
    ignores: ['dist/**', 'coverage/**'],
  },
  ...compat.env({ node: true, jest: true }),
  ...compat.extends('plugin:@typescript-eslint/recommended', 'prettier'),
  {
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: __dirname,
    },
  },
];
