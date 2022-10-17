import { defineConfig } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import license from 'rollup-plugin-license';

export default defineConfig({
  input: './src/index.ts',
  output: [
    {
      dir: './dist/esm',
      format: 'es',
      preserveModules: true, // 保留模块结构
      preserveModulesRoot: 'src', // 将保留的模块放在根级别的此路径下
    },
  ],
  plugins: [
    esbuild({
      target: 'esnext',
    }),
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
