import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
<<<<<<< HEAD
      '/api': 'http://localhost:3001'
    }
  }
});
=======
      '/api': 'http://localhost:3001',
    },
  },
})
>>>>>>> cad67d197e0b79ecbb82f65ef0bcadfc46b5e93b
