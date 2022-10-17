import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import { babel } from '@rollup/plugin-babel';
import license from 'rollup-plugin-license';

export default defineConfig({
  input: './src/index.ts',
  output: [
    {
      file: './dist/index.js',
      format: 'umd',
      name: 'gRequest',
    },
  ],
  plugins: [
    esbuild({
      target: 'es2015',
      minify: true,
    }),
    babel({
      presets: ['@babel/preset-env'],
      exclude: 'node_modules/**',
      babelHelpers: 'bundled',
    }),

    // terser(),
    license({
      banner: {
        content: {
          file: './LICENSE',
          encoding: 'utf-8', // Default is utf-8
        },
      },
    }),
  ],
});
// const buildOptions = [
//   {
//     input: '.build/request/request.js',
//     output: {
//       file: pkg.main,
//       format: 'umd',
//       name: 'GRequest',
//     },
//     plugins: [
//       terser(),
//       license({
//         banner: {
//           content: {
//             file: path.join(__dirname, 'LICENSE'),
//             encoding: 'utf-8', // Default is utf-8
//           },
//         },
//       }),
//     ],
//   },
//   {
//     input,
//     output: {
//       dir: './dist/esm',
//       format: 'esm',
//       preserveModules: true,
//     },
//   },
// ];

// export default buildOptions;
