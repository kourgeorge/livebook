import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cacheFilePlugin } from './vite-plugin-cache';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), cacheFilePlugin()],
      base: "/livebook,
      define: {
        // API keys are kept server-side only - removed from client bundle for security
        // Only non-sensitive configuration is exposed to the client
        'process.env.GEMINI_MODEL': JSON.stringify(env.GEMINI_MODEL || 'gemini-2.5-flash'),
        'process.env.LLM_PROVIDER': JSON.stringify(env.LLM_PROVIDER || 'azure'),
        'process.env.AZURE_ENDPOINT': JSON.stringify(env.AZURE_ENDPOINT || ''),
        'process.env.AZURE_DEPLOYMENT_NAME': JSON.stringify(env.AZURE_DEPLOYMENT_NAME || 'gpt-4o')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
