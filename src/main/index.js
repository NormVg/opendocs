import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('open-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'PDFs', extensions: ['pdf'] }]
    })
    if (canceled) {
      return null
    } else {
      return filePaths[0]
    }
  })

  ipcMain.handle('read-pdf-file', async (event, filePath) => {
    try {
      const fs = require('fs')
      const buffer = fs.readFileSync(filePath)
      return buffer
    } catch (error) {
      console.error('Error reading PDF file:', error)
      return null
    }
  })

  ipcMain.on('chat-stream', async (event, { messages, apiKey, context, filePath, model }) => {
    try {
      const { streamText } = require('ai')
      const { createGoogleGenerativeAI } = require('@ai-sdk/google')
      const fs = require('fs')

      const google = createGoogleGenerativeAI({
        apiKey: apiKey
      })

      const systemMessage = context
        ? `You are a helpful AI assistant. You have access to the following document context:\n\n${context}\n\nAnswer the user's question based on this context if relevant.`
        : 'You are a helpful AI assistant.'

      // Prepare messages with file if available
      let finalMessages = [...messages]

      if (filePath) {
        try {
          const fileBuffer = fs.readFileSync(filePath)
          const lastMsgIndex = finalMessages.findLastIndex(m => m.role === 'user')

          if (lastMsgIndex !== -1) {
            const lastMsg = finalMessages[lastMsgIndex]
            const base64Data = fileBuffer.toString('base64')
            const dataUrl = `data:application/pdf;base64,${base64Data}`

            console.log('Attaching PDF to message:', filePath)

            finalMessages[lastMsgIndex] = {
              ...lastMsg,
              experimental_attachments: [
                {
                  name: 'document.pdf',
                  contentType: 'application/pdf',
                  url: dataUrl
                }
              ]
            }
          } else {
            console.warn('No user message found to attach PDF')
          }
        } catch (err) {
          console.error('Error reading PDF for chat:', err)
          // Continue without file if read fails
        }
      }

      const result = await streamText({
        model: google(model || 'gemini-2.0-flash-lite'),
        system: systemMessage,
        messages: finalMessages,
      })

      let chunkCount = 0
      for await (const chunk of result.textStream) {
        if (typeof chunk === 'string') {
          chunkCount++
          event.sender.send('chat-chunk', chunk)
        }
      }
      console.log(`Streamed ${chunkCount} chunks`)

      event.sender.send('chat-done')
    } catch (error) {
      console.error('Chat stream error:', error)

      let userFriendlyMessage = 'An error occurred while processing your request.'

      // Handle specific error types
      if (error.message?.includes('API key')) {
        userFriendlyMessage = 'Invalid or missing API key. Please check your Gemini API key in Settings.'
      } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        userFriendlyMessage = 'API quota exceeded or rate limit reached. Please try again later.'
      } else if (error.message?.includes('network') || error.message?.includes('ENOTFOUND')) {
        userFriendlyMessage = 'Network error. Please check your internet connection and try again.'
      } else if (error.message?.includes('timeout')) {
        userFriendlyMessage = 'Request timed out. The model might be temporarily unavailable.'
      } else if (error.message) {
        userFriendlyMessage = `Error: ${error.message}`
      }

      event.sender.send('chat-error', userFriendlyMessage)
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
