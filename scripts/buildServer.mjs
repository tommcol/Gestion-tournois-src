import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

await mkdir('server-build', { recursive: true });

await build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['vite'],
  outfile: 'server-build/server.cjs'
});
