<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X, Moon, Sun } from 'lucide-vue-next'
import DocListItem from '../components/DocListItem.vue'

const router = useRouter()
const searchQuery = ref('')
const isSearchActive = ref(false)
const searchInputRef = ref(null)
const showSaved = ref(false)
const isDarkMode = ref(false)
const currentView = ref('all') // 'all' or 'saved'

// Load dark mode preference
onMounted(() => {
  const savedMode = localStorage.getItem('darkMode')
  if (savedMode === 'true') {
    isDarkMode.value = true
    document.body.classList.add('dark-mode')
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
        <button class="text-btn">need help?</button>
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
  </div>
</template>

<style scoped>
.library-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--space-jumbo); /* Increased for very large whitespace */
  max-width: 900px; /* Slightly wider to breathe */
  margin: 0 auto;
  width: 100%;
  position: relative;
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
  margin-bottom: var(--space-jumbo); /* Space for footer visual balance */
}

.library-footer {
  position: absolute;
  bottom: var(--space-xl);
  left: var(--space-xl);
  right: var(--space-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.doc-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: var(--space-jumbo);
  transition: opacity var(--transition-normal);
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
</style>
