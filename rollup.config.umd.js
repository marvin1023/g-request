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
