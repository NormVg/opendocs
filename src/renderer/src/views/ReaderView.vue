<script setup>
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import VuePdfEmbed from 'vue-pdf-embed'
import ReaderToolbar from '../components/ReaderToolbar.vue'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure PDF.js worker to use local file
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

const route = useRoute()
const title = ref(route.query.title || 'Document')
const pdfSource = ref(null)
const currentPage = ref(1)
const pageCount = ref(1)
const isLoading = ref(false)
const pdfContainer = ref(null)
const searchText = ref('')
const searchResults = ref([])
const currentSearchIndex = ref(-1)
const pdfDocument = ref(null)
const isStarred = ref(false)
const currentFilePath = ref(null)
const pdfBufferCopy = ref(null) // Store a copy of the buffer for search
const highlightPositions = ref([])
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
      // Store a copy of the buffer for search operations
      pdfBufferCopy.value = new Uint8Array(buffer).slice()

      pdfSource.value = new Uint8Array(buffer)
      // Load PDF document for text extraction
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
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchText.value = query

  if (!query) {
    searchResults.value = []
    currentSearchIndex.value = -1
    highlightPositions.value = []
    return
  }

  // Debounce search to avoid too many calls
  searchTimeout = setTimeout(async () => {
    if (!pdfBufferCopy.value) {
      console.warn('PDF not loaded yet')
      return
    }

    console.log('Starting search for:', query)
    const results = []

    try {
      // Use the stored buffer copy for search
      const loadingTask = pdfjsLib.getDocument({ data: pdfBufferCopy.value.slice() })
      const searchPdf = await loadingTask.promise

      // Search through all pages
      for (let pageNum = 1; pageNum <= pageCount.value; pageNum++) {
        const pageText = await extractTextFromPage(searchPdf, pageNum)
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

      // Clean up the search PDF instance
      await searchPdf.destroy()

      searchResults.value = results

      if (results.length > 0) {
        currentSearchIndex.value = 0
        await calculateHighlightPositions(pdfDocument.value, query) // Use the main pdfDocument for highlight calculation
        scrollToSearchResult(0)
        console.log(`Found ${results.length} results`)
      } else {
        highlightPositions.value = []
        console.log('No results found')
      }
    } catch (error) {
      console.error('Search error:', error)
      searchResults.value = []
      highlightPositions.value = []
    }
  }, 300) // 300ms debounce
}

const calculateHighlightPositions = async (pdfDoc, query) => {
  const highlights = []
  const container = pdfContainer.value
  if (!container) return

  const canvases = container.querySelectorAll('canvas')
  const queryLower = query.toLowerCase()

  try {
    for (let pageNum = 1; pageNum <= pageCount.value; pageNum++) {
      const page = await pdfDoc.getPage(pageNum)
      const textContent = await page.getTextContent()
      const viewport = page.getViewport({ scale: 1.5 }) // Match vue-pdf-embed scale

      const canvas = canvases[pageNum - 1]
      if (!canvas) continue

      const canvasRect = canvas.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      // Get all text items and their positions
      textContent.items.forEach((item) => {
        const text = item.str.toLowerCase()
        const textIndex = text.indexOf(queryLower)

        if (textIndex !== -1) {
          // Calculate position on the page
          const transform = item.transform
          const x = transform[4]
          const y = transform[5]
          const width = item.width
          const height = item.height

          // Convert PDF coordinates to screen coordinates
          const left = canvasRect.left - containerRect.left + (x * canvasRect.width / viewport.width)
          const top = canvasRect.top - containerRect.top + ((viewport.height - y - height) * canvasRect.height / viewport.height) // Adjust y for top-left origin
          const highlightWidth = (width * canvasRect.width / viewport.width)
          const highlightHeight = (height * canvasRect.height / viewport.height)

          highlights.push({
            top,
            left,
            width: highlightWidth,
            height: highlightHeight,
            page: pageNum
          })
        }
      })
    }

    highlightPositions.value = highlights
  } catch (error) {
    console.error('Error calculating highlights:', error)
  }
}

const scrollToSearchResult = (index) => {
  if (index < 0 || index >= searchResults.value.length) return

  const result = searchResults.value[index]
  const container = pdfContainer.value
  if (!container) return

  const canvases = container.querySelectorAll('canvas')
  const targetCanvas = canvases[result.page - 1]

  if (targetCanvas) {
    targetCanvas.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
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

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

// Watch for path changes in route query
watch(() => route.query.path, (newPath) => {
  if (newPath) {
    loadPdfFromPath(newPath)
  }
}, { immediate: true })
</script>

<template>
  <div class="reader-layout">
    <div class="main-content">
      <ReaderToolbar
        :title="title"
        :currentPage="currentPage"
        :totalPages="pageCount"
        :searchResultCount="searchResults.length"
        :currentResultIndex="currentSearchIndex"
        :isStarred="isStarred"
        @search="handleSearch"
        @next-result="nextSearchResult"
        @previous-result="previousSearchResult"
        @toggle-bookmark="toggleBookmark"
      />

      <div class="pdf-container" ref="pdfContainer">
        <div v-if="isLoading" class="loading-indicator">
          <p>Loading PDF...</p>
        </div>
        <VuePdfEmbed
          v-else-if="pdfSource"
          :source="pdfSource"
          @loaded="handleDocumentLoad"
          @loading-failed="handleLoadingFailed"
          class="pdf-viewer"
          :style="{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }"
        />
        <div v-else class="empty-state">
          <p>No document loaded</p>
        </div>

        <!-- Search highlights overlay -->
        <div
          v-for="(highlight, index) in highlightPositions"
          :key="`highlight-${index}`"
          class="search-highlight"
          :class="{ 'active-highlight': index === currentSearchIndex }"
          :style="{
            top: highlight.top + 'px',
            left: highlight.left + 'px',
            width: highlight.width + 'px',
            height: highlight.height + 'px'
          }"
        />
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

.pdf-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-xl);
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-alt);
  gap: 40px;
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
  align-items: flex-end;
  justify-content: space-between;
  z-index: 10;
  pointer-events: none;
}

.pdf-footer > * {
  pointer-events: auto;
}

.footer-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
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
