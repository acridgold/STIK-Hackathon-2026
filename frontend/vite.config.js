import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    base: '/STIK-Hackathon-2026/',
    plugins: [react()],
    resolve: {
        alias: {
            '@': '/src',
        },
    },
})