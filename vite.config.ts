import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  // Organization Pages serves this repository at https://embedgym.github.io/.
  base: '/',
  resolve: {alias: {'@velxio': fileURLToPath(new URL('./vendor/velxio/frontend/src', import.meta.url))}},
});
