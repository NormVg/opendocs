<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X, Moon, Sun, Settings } from 'lucide-vue-next'
import DocListItem from '../components/DocListItem.vue'

const router = useRouter()
const searchQuery = ref('')
const isSearchActive = ref(false)
const searchInputRef = ref(null)
const showSaved = ref(false)
const isDarkMode = ref(false)
const currentView = ref('all') // 'all' or 'saved'
const showHelp = ref(false)

// Load dark mode preference
onMounted(() => {
  const savedMode = localStorage.getItem('darkMode')
  if (savedMode === 'true') {
    isDarkMode.value = true
    document.body.classList.add('dark-mode')
  } else if (savedMode === 'false') {
    isDarkMode.value = false
    document.body.classList.remove('dark-mode')
  } else {
    // Fallback: check if body already has the class (e.g. from previous navigation)
    if (document.body.classList.contains('dark-mode')) {
      isDarkMode.value = true
    }
  }
})

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    document.body.classList.add('dark-mode')
    localStorage.setItem('darkMode', 'true')
  } else {
    document.body.classList.remove('dark-mode')
    localStorage.setItem('darkMode', 'false')
  }
}
 // 'all' or 'saved'

// Load documents from localStorage
const loadDocuments = () => {
  const stored = localStorage.getItem('opendocs-history')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('Failed to parse stored documents:', e)
      return []
    }
  }
  return []
}

const documents = ref(loadDocuments())

const saveDocuments = () => {
  localStorage.setItem('opendocs-history', JSON.stringify(documents.value))
}

const toggleStarred = (docId) => {
  const doc = documents.value.find(d => d.id === docId)
  if (doc) {
    doc.starred = !doc.starred
    saveDocuments()
  }
}

const addDocument = (filePath, fileName) => {
  // Check if document already exists
  const existingIndex = documents.value.findIndex(doc => doc.path === filePath)

  if (existingIndex !== -1) {
    // Move to top if already exists
    const [doc] = documents.value.splice(existingIndex, 1)
    doc.lastOpened = Date.now()
    documents.value.unshift(doc)
  } else {
    // Add new document
    documents.value.unshift({
      id: Date.now(), // Keep id for potential future use, but path is primary key
      title: fileName,
      path: filePath,
      starred: false,
      lastOpened: Date.now()
    })
  }

  saveDocuments()
}

const filteredDocuments = computed(() => {
  let docs = documents.value

  // Filter by view (all or saved)
  if (currentView.value === 'saved') {
    docs = docs.filter(doc => doc.starred)
  }

  // Filter by search query
  if (searchQuery.value) {
    docs = docs.filter(doc =>
      doc.title.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  return docs
})

const openReader = (doc) => {
  router.push({ name: 'reader', query: { path: doc.path, title: doc.title } })
}

const handleOpenFile = async () => {
  try {
    const filePath = await window.api.openFile()
    if (filePath) {
      const fileName = filePath.split(/[/\\]/).pop()
      addDocument(filePath, fileName)
      router.push({
        name: 'reader',
        query: {
          path: filePath,
          title: fileName
        }
      })
    }
  } catch (error) {
    console.error('Failed to open file:', error)
  }
}

const openSettings = () => {
  router.push({ name: 'settings' })
}

const toggleHelp = () => {
  showHelp.value = !showHelp.value
}

const toggleSearch = () => {
  isSearchActive.value = !isSearchActive.value
  if (isSearchActive.value) {
    currentView.value = 'all' // Switch to all view when searching
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  } else {
    searchQuery.value = ''
  }
}

onMounted(() => {
  // Refresh documents when returning to library view
  documents.value = loadDocuments()
})
</script>

<template>
  <div class="library-container">
    <!-- Dark mode toggle -->
    <button class="dark-mode-toggle" @click="toggleDarkMode">
      <Sun v-if="isDarkMode" :size="20" />
      <Moon v-else :size="20" />
    </button>

    <div class="search-overlay" :class="{ active: isSearchActive }">
      <div class="search-bar">
        <Search :size="24" class="search-icon" />
        <input
          ref="searchInputRef"
          type="text"
          v-model="searchQuery"
          placeholder="Search documents..."
          class="main-search-input"
          @keydown.esc="toggleSearch"
        />
        <button class="close-search-btn" @click="toggleSearch">
          <X :size="20" />
        </button>
      </div>
    </div>

    <div class="doc-list" :class="{ 'search-active': isSearchActive }">
      <DocListItem
        v-for="doc in filteredDocuments"
        :key="doc.id"
        :id="doc.id"
        :title="doc.title"
        :starred="doc.starred"
        @click="openReader(doc)"
        @toggle-star="toggleStarred"
      />
      <div v-if="filteredDocuments.length === 0" class="no-results">
        {{ currentView === 'saved' ? 'No saved documents' : 'No documents found' }}
      </div>
    </div>

    <div class="library-footer">
      <div class="footer-left">
        <button class="text-btn" @click="openSettings">settings</button>
        <span class="separator">•</span>
        <button class="text-btn" @click="toggleHelp">need help?</button>
      </div>
      <div class="footer-right">
        <button
          class="text-btn"
          @click="currentView = currentView === 'saved' ? 'all' : 'saved'"
          :class="{ active: currentView === 'saved' }"
        >
          {{ currentView === 'saved' ? 'all' : 'saved' }}
        </button>
        <span class="separator">•</span>
        <button class="text-btn" @click="toggleSearch" :class="{ active: isSearchActive }">
          {{ isSearchActive ? 'close' : 'search' }}
        </button>
        <span class="separator">•</span>
        <button class="text-btn" @click="handleOpenFile">open</button>
      </div>
    </div>

    <!-- Help Modal -->
    <div v-if="showHelp" class="help-overlay" @click="toggleHelp">
      <div class="help-modal" @click.stop>
        <div class="help-header">
          <h2>Quick Guide</h2>
          <button class="close-btn" @click="toggleHelp">×</button>
        </div>
        <div class="help-content">
          <section>
            <h3>Getting Started</h3>
            <p>Click <strong>open</strong> to select a PDF file from your computer.</p>
          </section>

          <section>
            <h3>Navigation</h3>
            <ul>
              <li><strong>all</strong> – View all documents</li>
              <li><strong>saved</strong> – View starred documents</li>
              <li><strong>search</strong> – Find documents by name</li>
              <li><strong>settings</strong> – Configure API keys and models</li>
            </ul>
          </section>

          <section>
            <h3>AI Chat</h3>
            <p>Click the ✨ icon in the reader to chat with AI about your document.</p>
            <ul>
              <li>Add context: current page, page range, or full document</li>
              <li>Set your Gemini API key in Settings to use AI features</li>
            </ul>
          </section>

          <section>
            <h3>Keyboard Shortcuts</h3>
            <ul>
              <li><kbd>Esc</kbd> – Close search or modals</li>
              <li><kbd>⌘/Ctrl + F</kbd> – Search in document (reader)</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.library-container {
  height: calc(100vh - 80px); /* Reduce height to account for footer */
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding: var(--space-jumbo) var(--space-jumbo) 0; /* Remove bottom padding, keep top and sides */
  max-width: 900px; /* Slightly wider to breathe */
  margin: 0 auto;
  width: 100%;
  position: relative;
  background-color: var(--color-bg);
}

.dark-mode-toggle {
  position: fixed;
  top: var(--space-l);
  right: var(--space-l);
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
  z-index: 1000;
  transition: all var(--transition-fast);
}

.dark-mode-toggle:hover {
  background-color: var(--color-text-primary);
  color: var(--color-bg);
  border-color: var(--color-text-primary);
}

.doc-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 120px; /* Increased space for the fixed footer */
  padding-right: var(--space-m); /* Prevent scrollbar overlap with arrows */

  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

/* Webkit browsers (Chrome, Safari, Edge) */
.doc-list::-webkit-scrollbar {
  width: 8px;
}

.doc-list::-webkit-scrollbar-track {
  background: transparent;
}

.doc-list::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 4px;
}

.doc-list::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-text-tertiary);
}

.library-footer {
  position: fixed;
  bottom: var(--space-xl);
  left: 50%;
  transform: translateX(-50%);
  max-width: 900px;
  width: calc(100% - var(--space-xl) * 2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg);
  padding: var(--space-m) 0;
  z-index: 10;
}

.text-btn {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-medium);
  transition: color var(--transition-fast);
}

.text-btn:hover {
  color: var(--color-text-primary);
}

.separator {
  margin: 0 var(--space-s);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.search-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-normal);
  z-index: 100;
}

.search-overlay.active {
  opacity: 1;
  pointer-events: auto;
}

.search-bar {
  background-color: var(--color-bg);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 16px 28px;
  display: flex;
  align-items: center;
  gap: var(--space-m);
  box-shadow: none;
  width: 700px;
  max-width: 90%;
  transition: border-color var(--transition-fast);
}

.search-bar:focus-within {
  border-color: var(--color-text-secondary);
}

.main-search-input {
  flex: 1;
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-regular);
}

.main-search-input::placeholder {
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-regular);
}

.search-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.close-search-btn {
  color: var(--color-text-tertiary);
  padding: 6px;
  border-radius: 6px;
  transition: all var(--transition-fast);
}

.close-search-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-hover);
}

.doc-list.search-active {
  margin-top: var(--space-3xl); /* Push down slightly when search is active */
}

.no-results {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: var(--space-xl);
  font-size: var(--font-size-sm);
}

.text-btn.active {
  color: var(--color-text-primary);
}

/* Help Modal */
.help-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.help-modal {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.help-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-l);
  border-bottom: 1px solid var(--color-border);
}

.help-header h2 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.close-btn {
  font-size: 32px;
  line-height: 1;
  color: var(--color-text-tertiary);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.help-content {
  padding: var(--space-l);
  overflow-y: auto;
  max-height: calc(80vh - 80px);
}

.help-content section {
  margin-bottom: var(--space-l);
}

.help-content section:last-child {
  margin-bottom: 0;
}

.help-content h3 {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-s) 0;
}

.help-content p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-s) 0;
  line-height: 1.6;
}

.help-content ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.help-content li {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
  padding-left: var(--space-m);
  position: relative;
  line-height: 1.6;
}

.help-content li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--color-text-tertiary);
}

.help-content strong {
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
}

.help-content kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: var(--font-size-xs);
  font-family: monospace;
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-primary);
}
</style>
