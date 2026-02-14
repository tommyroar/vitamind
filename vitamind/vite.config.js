import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', // Use JSDOM for browser-like environment
    globals: true,        // Expose Vitest APIs globally
    setupFiles: './src/setupTests.js', // Setup file for @testing-library/jest-dom
    environmentOptions: {
      jsdom: {
        // Define environment variables that App.jsx will pick up from import.meta.env
        // Vite prefixes these with VITE_
        url: 'http://localhost/?VITE_MAPBOX_ACCESS_TOKEN=pk.test-token-from-url',
      },
    },
  },
})
