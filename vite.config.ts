import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [react(), tailwindcss()]

  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_'])
  const processEnvDefines: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value)
  }

  return {
    plugins,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,

    // Pre-bundle main dependencies so the dev server starts faster on cold boot
    optimizeDeps: {
      include: ['framer-motion', 'lucide-react', 'react-router-dom'],
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      // Don't watch heavy or unrelated paths during dev
      watch: {
        ignored: [
          '**/yolov8n.pt',
          '**/yolov8x.pt',
          '**/*.pt',
          '**/backend/**',
          '**/dist/**',
          '**/docs/**',
          '**/.vercel-disabled-*/**',
        ],
      },
    },
  }
})
