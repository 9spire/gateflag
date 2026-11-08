import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  tsconfig: 'tsconfig.build.json',
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@gateflag/core',
    'sonner',
    'lucide-react',
    '@radix-ui/react-dialog',
    '@radix-ui/react-tabs',
    'clsx',
    'class-variance-authority',
  ],
  treeshake: true,
});
