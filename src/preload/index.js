import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  openFile: () => ipcRenderer.invoke('open-file'),
  readPdfFile: (filePath) => ipcRenderer.invoke('read-pdf-file', filePath),
  streamChat: (messages, apiKey, context, filePath, customInstructions, onChunk, onDone, onError) => {
    ipcRenderer.send('chat-stream', { messages, apiKey, context, filePath, customInstructions })

    const chunkHandler = (_event, chunk) => onChunk(chunk)
    const doneHandler = () => {
      ipcRenderer.removeListener('chat-chunk', chunkHandler)
      ipcRenderer.removeListener('chat-done', doneHandler)
      ipcRenderer.removeListener('chat-error', errorHandler)
      onDone()
    }
    const errorHandler = (_event, error) => {
      ipcRenderer.removeListener('chat-chunk', chunkHandler)
      ipcRenderer.removeListener('chat-done', doneHandler)
      ipcRenderer.removeListener('chat-error', errorHandler)
      onError(error)
    }

    ipcRenderer.on('chat-chunk', chunkHandler)
    ipcRenderer.on('chat-done', doneHandler)
    ipcRenderer.on('chat-error', errorHandler)

    return () => {
      ipcRenderer.removeListener('chat-chunk', chunkHandler)
      ipcRenderer.removeListener('chat-done', doneHandler)
      ipcRenderer.removeListener('chat-error', errorHandler)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
