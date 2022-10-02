import path from 'path';
import pkg from './package.json';
import license from 'rollup-plugin-license';
import { terser } from 'rollup-plugin-terser';
import dts from 'rollup-plugin-dts';

const input = '.build/index.js';

const buildOptions = [
  {
    input: '.build/request/request.js',
    output: {
      file: pkg.main,
      format: 'umd',
      name: 'GRequest',
    },
    plugins: [
      terser(),
      license({
        banner: {
          content: {
            file: path.join(__dirname, 'LICENSE'),
            encoding: 'utf-8', // Default is utf-8
          },
        },
      }),
    ],
  },
  {
    input,
    output: {
      dir: './dist/esm',
      format: 'esm',
      preserveModules: true,
    },
  },
  {
    input: './.build/index.d.ts',
    output: [{ file: pkg.types, format: 'es' }],
    plugins: [dts()],
  },
];

export default buildOptions;
