import { defineConfig, loadEnv } from 'vite';
import { colyseus } from 'colyseus/vite';
import { builtinModules } from 'module';

export default defineConfig((configEnv) => {
  const env = loadEnv(configEnv.mode, process.cwd(), '');
  const PORT = Number(env.PORT);
  if (isNaN(PORT)) throw new Error('PORT must be a number');
  if (PORT < 1024 || PORT > 49151) throw new Error('PORT must be between 1024 and 49151');

  return {
    server: {
      port: PORT,
    },
    plugins: [colyseus({ serverEntry: '/src/index.ts' })],
    builder: {
      async buildApp(builder) {
        await builder.build(builder.environments.colyseus);
      },
    },
    build: {
      outDir: 'dist',
      ssr: 'src/index.ts',
      target: 'node22',
      sourcemap: true,
      rolldownOptions: {
        external: [
          ...builtinModules,
          ...builtinModules.map((m) => `node:${m}`),
          '@pm2/io',
          'bufferutil',
          'utf-8-validate',
        ],
      },
    },
    ssr: {
      noExternal: true,
    },
  };
});
