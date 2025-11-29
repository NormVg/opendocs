import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { copyFileSync } from 'fs'

// Plugin to copy prompts.js after build
const copyPromptsPlugin = () => ({
  name: 'copy-prompts',
  closeBundle() {
    copyFileSync(
      resolve(__dirname, 'src/main/prompts.js'),
      resolve(__dirname, 'out/main/prompts.js')
    )
  }
})

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyPromptsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [vue()]
  }
})
