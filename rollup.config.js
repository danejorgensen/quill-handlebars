import localResolve from "rollup-plugin-local-resolve";
import babel from "rollup-plugin-babel";
import postcss from "rollup-plugin-postcss";
import { terser } from "rollup-plugin-terser";
import pkg from "./package.json";

export default [
  {
    input: "src/quill.handlebars.js",
    output: [
      {
        file: "dist/quill.handlebars.min.js",
        format: "iife",
        name: "quillHandlebars",
        plugins: [terser()],
        globals: {
          quill: "Quill",
        },
      },
    ],
    external: ["quill"],
    plugins: [
      localResolve(),
      babel({
        exclude: ["node_modules/**"],
      }),
      postcss({
        extract: true,
        minimize: true,
      }),
    ],
  },
  {
    input: "src/quill.handlebars.js",
    output: [
      {
        file: pkg.main,
        format: "cjs",
      },
      {
        file: pkg.module,
        format: "es",
      },
    ],
    external: ["quill"],
    plugins: [
      localResolve(),
      babel({
        exclude: ["node_modules/**"],
      }),
      postcss({
        extract: "dist/quill.handlebars.css",
      }),
    ],
  },
];
