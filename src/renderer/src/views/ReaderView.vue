<script setup>
import { ref, shallowRef, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VuePdfEmbed from 'vue-pdf-embed'
import ReaderToolbar from '../components/ReaderToolbar.vue'
import AIChatSidebar from '../components/AIChatSidebar.vue'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure PDF.js worker to use local file
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

const route = useRoute()
const router = useRouter()
const title = ref(route.query.title || 'Document')
const pdfSource = ref(null)
const currentPage = ref(1)
const pageCount = ref(1)
const isLoading = ref(false)
const pdfContainer = ref(null)
const searchText = ref('')
const searchResults = ref([])
const currentSearchIndex = ref(-1)
const pdfDocument = shallowRef(null)
const isStarred = ref(false)
const currentFilePath = ref(null)
const pdfBufferCopy = ref(null) // Store a copy of the buffer for search
const highlightPositions = ref([])
const isAiChatOpen = ref(false)

const toggleAiChat = () => {
  isAiChatOpen.value = !isAiChatOpen.value
}

const zoomLevel = ref(1) // 1 = 100%

const zoomIn = () => {
  if (zoomLevel.value < 3) {
    zoomLevel.value = Math.round((zoomLevel.value + 0.25) * 100) / 100
  }
}

const zoomOut = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value = Math.round((zoomLevel.value - 0.25) * 100) / 100
  }
}

// Load documents from localStorage
const loadDocuments = () => {
  const stored = localStorage.getItem('opendocs-history')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      return []
    }
  }
  return []
}

const saveDocuments = (docs) => {
  localStorage.setItem('opendocs-history', JSON.stringify(docs))
}

const toggleBookmark = () => {
  if (!currentFilePath.value) return

  const docs = loadDocuments()
  const doc = docs.find(d => d.path === currentFilePath.value)

  if (doc) {
    doc.starred = !doc.starred
    isStarred.value = doc.starred
    saveDocuments(docs)
  }
}

const checkIfStarred = () => {
  if (!currentFilePath.value) return

  const docs = loadDocuments()
  const doc = docs.find(d => d.path === currentFilePath.value)
  isStarred.value = doc ? doc.starred : false
}

const handleDocumentLoad = (doc) => {
  pageCount.value = doc.numPages
  isLoading.value = false

  // Setup page tracking after PDF loads
  nextTick(() => {
    setupPageTracking()
  })
}

const handleLoadingFailed = (error) => {
  console.error('PDF Loading Failed:', error)
  isLoading.value = false
}

const loadPdfFromPath = async (filePath) => {
  if (!filePath) {
    pdfSource.value = null
    currentFilePath.value = null
    return
  }

  currentFilePath.value = filePath
  checkIfStarred()

  try {
    isLoading.value = true
    const buffer = await window.api.readPdfFile(filePath)
    if (buffer) {
      pdfBufferCopy.value = new Uint8Array(buffer).slice()
      pdfSource.value = new Uint8Array(buffer)

      // Load PDF document for text extraction (keep for AI chat)
      const loadingTask = pdfjsLib.getDocument({ data: buffer })
      pdfDocument.value = await loadingTask.promise
    } else {
      console.error('Failed to read PDF file')
      pdfSource.value = null
      pdfBufferCopy.value = null
    }
  } catch (error) {
    console.error('Error loading PDF:', error)
    pdfSource.value = null
    pdfBufferCopy.value = null
  } finally {
    isLoading.value = false
  }
}

let observer = null

const setupPageTracking = () => {
  if (observer) {
    observer.disconnect()
  }

  const container = pdfContainer.value
  if (!container) return

  const canvases = container.querySelectorAll('canvas')

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const pageElements = Array.from(canvases)
          const index = pageElements.indexOf(entry.target)
          if (index !== -1) {
            currentPage.value = index + 1
          }
        }
      })
    },
    {
      root: container,
      threshold: 0.5
    }
  )

  canvases.forEach((canvas) => {
    observer.observe(canvas)
  })
}

const extractTextFromPage = async (pdfDoc, pageNum) => {
  try {
    if (!pdfDoc) return ''
    const page = await pdfDoc.getPage(pageNum)
    const textContent = await page.getTextContent()
    return textContent.items.map(item => item.str).join(' ')
  } catch (error) {
    console.error('Error extracting text from page:', pageNum, error)
    return ''
  }
}

let searchTimeout = null

const handleSearch = async (query) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchText.value = query

  if (!query) {
    searchResults.value = []
    currentSearchIndex.value = -1
    return
  }

  // Debounce search
  searchTimeout = setTimeout(async () => {
    if (!pdfDocument.value) {
      console.warn('PDF not loaded')
      return
    }

    console.log('Searching for:', query)
    const results = []

    try {
      // Search through all pages
      for (let pageNum = 1; pageNum <= pageCount.value; pageNum++) {
        const pageText = await extractTextFromPage(pdfDocument.value, pageNum)
        const lowerPageText = pageText.toLowerCase()
        const lowerQuery = query.toLowerCase()

        let startIndex = 0
        while ((startIndex = lowerPageText.indexOf(lowerQuery, startIndex)) !== -1) {
          results.push({
            page: pageNum,
            index: startIndex,
            text: pageText.substr(Math.max(0, startIndex - 20), query.length + 40)
          })
          startIndex += query.length
        }
      }

      searchResults.value = results
      console.log(`Found ${results.length} matches`)

      if (results.length > 0) {
        currentSearchIndex.value = 0
        scrollToSearchResult(0)
      }
    } catch (error) {
      console.error('Search error:', error)
      searchResults.value = []
    }
  }, 300)
}

const nextSearchResult = () => {
  if (searchResults.value.length === 0) return
  currentSearchIndex.value = (currentSearchIndex.value + 1) % searchResults.value.length
  scrollToSearchResult(currentSearchIndex.value)
}

const previousSearchResult = () => {
  if (searchResults.value.length === 0) return
  currentSearchIndex.value = currentSearchIndex.value - 1
  if (currentSearchIndex.value < 0) {
    currentSearchIndex.value = searchResults.value.length - 1
  }
  scrollToSearchResult(currentSearchIndex.value)
}

const scrollToSearchResult = (index) => {
  if (!searchResults.value[index]) return

  const result = searchResults.value[index]
  currentPage.value = result.page

  nextTick(() => {
    // Scroll to page (simplified - no exact coordinate matching)
    if (pdfContainer.value) {
      const canvases = pdfContainer.value.querySelectorAll('canvas')
      const targetCanvas = canvases[result.page - 1]
      if (targetCanvas) {
        targetCanvas.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  })
}


onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

// Watch for path changes in route query
watch(() => route.query.path, (newPath) => {
  if (newPath) {
    if (route.query.title) {
      title.value = route.query.title
    } else {
      // Fallback to filename if title is missing
      const fileName = newPath.split(/[/\\]/).pop()
      title.value = fileName
    }
    loadPdfFromPath(newPath)
  }
}, { immediate: true })
const aiSidebar = ref(null)

// Pan & Zoom Logic
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)

const startPan = (e) => {
  if (zoomLevel.value <= 1) return
  e.preventDefault() // Prevent native drag/select
  isDragging.value = true
  startX.value = e.clientX - panX.value
  startY.value = e.clientY - panY.value
  document.body.style.cursor = 'grabbing'
}

const handlePan = (e) => {
  if (!isDragging.value) return
  e.preventDefault()
  panX.value = e.clientX - startX.value
  panY.value = e.clientY - startY.value
}

const endPan = () => {
  isDragging.value = false
  document.body.style.cursor = ''
}

// Reset pan when zooming out to 1
watch(zoomLevel, (newZoom) => {
  if (newZoom <= 1) {
    panX.value = 0
    panY.value = 0
  }
})

const handleRequestCurrentPage = async () => {
  if (!pdfDocument.value) return

  const pageNum = currentPage.value
  const text = await extractTextFromPage(pdfDocument.value, pageNum)

  if (aiSidebar.value) {
    aiSidebar.value.addContextItem({
      type: 'page',
      label: `Page ${pageNum}`,
      content: text
    })
  }
}

const handleRequestRange = async ({ start, end }) => {
  if (!pdfDocument.value) return

  // Validate range
  const startPage = Math.max(1, Math.min(start, pageCount.value))
  const endPage = Math.max(startPage, Math.min(end, pageCount.value))

  let combinedText = ''
  for (let i = startPage; i <= endPage; i++) {
    const text = await extractTextFromPage(pdfDocument.value, i)
    combinedText += `[Page ${i}]\n${text}\n\n`
  }

  if (aiSidebar.value) {
    aiSidebar.value.addContextItem({
      type: 'range',
      label: `Pages ${startPage}-${endPage}`,
      content: combinedText
    })
  }
}

const handleRequestFullPdf = async () => {
  if (!pdfDocument.value || !aiSidebar.value) return

  let combinedText = ''
  // Show loading state in sidebar if possible, or just wait
  // Ideally we'd show a toast, but for now we'll just process

  try {
    for (let i = 1; i <= pageCount.value; i++) {
      const text = await extractTextFromPage(pdfDocument.value, i)
      combinedText += `[Page ${i}]\n${text}\n\n`
    }

    aiSidebar.value.addContextItem({
      type: 'file',
      label: 'Full Document',
      content: combinedText
    })
  } catch (error) {
    console.error('Error extracting full PDF text:', error)
  }
}

const handleOpenFile = (path) => {
  // Update route to reflect new file
  // This will trigger the watcher on route.query.path
  const fileName = path.split(/[/\\]/).pop()
  router.push({
    query: {
      ...route.query,
      path: path,
      title: fileName
    }
  })
}
</script>

<template>
  <div class="reader-layout">
    <div class="main-content">
      <ReaderToolbar
        :title="title"
        :current-page="currentPage"
        :total-pages="pageCount"
        :search-result-count="searchResults.length"
        :current-result-index="currentSearchIndex"
        :is-starred="isStarred"
        :is-ai-chat-open="isAiChatOpen"
        @search="handleSearch"
        @next-result="nextSearchResult"
        @previous-result="previousSearchResult"
        @toggle-bookmark="toggleBookmark"
        @toggle-ai-chat="toggleAiChat"
      />
      <div class="reader-content">
        <AIChatSidebar
      :visible="isAiChatOpen"
      :file-path="currentFilePath"
      @close="toggleAiChat"
      @request-context-current="handleRequestCurrentPage"
      @request-context-range="handleRequestRange"
      @request-context-full="handleRequestFullPdf"
      ref="aiSidebar"
    />

        <div
          class="pdf-container"
          ref="pdfContainer"
          @mousedown="startPan"
          @mousemove="handlePan"
          @mouseup="endPan"
          @mouseleave="endPan"
          :class="{ 'is-dragging': isDragging, 'can-drag': zoomLevel > 1 }"
        >
          <div v-if="isLoading" class="loading-indicator">
            <p>Loading PDF...</p>
          </div>

          <div
            v-else-if="pdfSource"
            class="transform-wrapper"
            :style="{
              transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }"
          >
            <VuePdfEmbed
              :source="pdfSource"
              @loaded="handleDocumentLoad"
              @loading-failed="handleLoadingFailed"
              class="pdf-viewer"
            />
          </div>

          <div v-else class="empty-state">
            <p>No document loaded</p>
          </div>
        </div>

      <!-- Bottom Footer -->
      <div class="pdf-footer">
        <div class="footer-left">
          <span class="page-info">{{ currentPage }} / {{ pageCount }}</span>
          <div class="zoom-controls">
            <button class="zoom-btn" @click="zoomOut" :disabled="zoomLevel <= 0.5">
              <span>−</span>
            </button>
            <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
            <button class="zoom-btn" @click="zoomIn" :disabled="zoomLevel >= 3">
              <span>+</span>
            </button>
          </div>
        </div>
        <div class="footer-right">
          <span class="branding">opendocs</span>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.reader-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  background-color: var(--color-bg);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.reader-content {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.pdf-container {
  flex: 1;
  overflow-y: auto; /* Restore scroll by default */
  padding: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-alt);
  cursor: default;
}

.pdf-container.can-drag {
  cursor: grab;
  overflow: hidden; /* Hide scrollbars only when zoomed in/panning */
}

.pdf-container.is-dragging {
  cursor: grabbing;
}

.transform-wrap.pdf-viewer {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px; /* Space between pages */
}

/* Rounded corners for PDF pages */
.pdf-viewer :deep(canvas),
.pdf-viewer :deep(img),
.pdf-viewer :deep(.vue-pdf-embed__page) {
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.transform-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  padding: var(--space-xl); /* Move padding here */
  transition: transform 0.1s ease-out; /* Smooth pan */
  will-change: transform;
}

.pdf-page {
  width: 100%;
  max-width: 800px;
  background-color: transparent;
  display: flex;
  flex-direction: column;
  gap: var(--space-l);
  transition: transform var(--transition-normal);
}

.pdf-page :deep(canvas) {
  box-shadow: var(--shadow-md);
  background-color: white;
  margin-bottom: var(--space-l);
}

.pdf-viewer {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.pdf-viewer canvas {
  display: block;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.viewer-container {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.pdfViewer {
  padding: var(--space-xl);
}

.pdfViewer .page {
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

/* Target any wrapper divs vue-pdf-embed might create */
.pdf-viewer > * {
  margin-bottom: 0 !important;
}

.loading-indicator, .empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-tertiary);
}

.pdf-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--space-m) var(--space-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
  pointer-events: none;
  /* Removed full width background */
}

.pdf-footer > * {
  pointer-events: auto;
}

.footer-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}

:global(body.dark-mode) .footer-left {
  border-color: rgba(255, 255, 255, 0.1);
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.zoom-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 18px;
  font-weight: var(--font-weight-medium);
  line-height: 1;
  transition: all var(--transition-fast);
}

.zoom-btn:hover:not(:disabled) {
  background-color: var(--color-text-primary);
  color: var(--color-bg);
  border-color: var(--color-text-primary);
}

.zoom-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.zoom-level {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
  min-width: 50px;
  text-align: center;
}

.page-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.branding {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.5px;
}

.search-highlight {
  position: absolute;
  background-color: rgba(255, 235, 59, 0.4);
  border: 1px solid rgba(255, 193, 7, 0.6);
  pointer-events: none;
  transition: background-color var(--transition-fast);
  z-index: 5;
}

.search-highlight.active-highlight {
  background-color: rgba(255, 152, 0, 0.5);
  border-color: rgba(255, 152, 0, 0.8);
}
</style>
