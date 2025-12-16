<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import DragOverlay from './components/DragOverlay.vue'

const router = useRouter()
const isDragging = ref(false)
const dragCounter = ref(0)

const handleDragEnter = (e) => {
  e.preventDefault()
  dragCounter.value++
  if (e.dataTransfer.types.includes('Files')) {
    isDragging.value = true
  }
}

const handleDragLeave = (e) => {
  e.preventDefault()
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragging.value = false
  }
}

const handleDragOver = (e) => {
  e.preventDefault()
  // Necessary to allow dropping
}

const handleDrop = async (event) => {
  event.preventDefault()
  isDragging.value = false
  dragCounter.value = 0

  const files = event.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      // Use window.api.getPathForFile logic if available, or just use file.path
      // In Electron renderer with contextIsolation: false or nodeIntegration: true, file.path is available.
      // If contextIsolation is true, we might need a preload script to expose it, but usually file object in Electron has path.

      const filePath = window.api && window.api.getPathForFile ? window.api.getPathForFile(file) : file.path
      const fileName = file.name

      console.log('Dropped file:', filePath)

      if (filePath) {
        // Add to history
        addToHistory(filePath, fileName)

        // Navigate to reader
        // Force navigation by replacing if same route to ensure reload/update
        await router.push({
          name: 'reader',
          query: {
            path: filePath,
            title: fileName,
            t: Date.now() // Force update
          }
        })
      }
    }
  }
}

const addToHistory = (filePath, fileName) => {
  try {
    const stored = localStorage.getItem('opendocs-history')
    let documents = stored ? JSON.parse(stored) : []

    const existingIndex = documents.findIndex(doc => doc.path === filePath)

    if (existingIndex !== -1) {
      // Move to top if already exists
      const [doc] = documents.splice(existingIndex, 1)
      doc.lastOpened = Date.now()
      documents.unshift(doc)
    } else {
      // Add new document
      documents.unshift({
        id: Date.now(),
        title: fileName,
        path: filePath,
        starred: false,
        lastOpened: Date.now()
      })
    }

    localStorage.setItem('opendocs-history', JSON.stringify(documents))
  } catch (e) {
    console.error('Failed to update history:', e)
  }
}
</script>

<template>
  <div
    class="app-container"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <transition name="fade">
      <DragOverlay v-if="isDragging" />
    </transition>

    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style>
.app-container {
  width: 100%;
  height: 100vh;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-normal);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
