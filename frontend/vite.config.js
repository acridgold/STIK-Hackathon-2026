import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    base: process.env.VITE_BASE_PATH || '/STIK-Hackathon-2026/',
    root: __dirname,
})