import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Force React to resolve to a single module instance. Without this,
    // Rolldown's dependency pre-bundling can create separate React scopes
    // for packages like lucide-react that use createContext/useContext,
    // causing "Invalid hook call" errors at runtime.
    dedupe: ['react', 'react-dom'],
  },
})
