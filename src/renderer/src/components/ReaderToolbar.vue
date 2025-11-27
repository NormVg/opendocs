<script setup>
import { ref, onMounted } from 'vue'
import { ChevronLeft, ChevronRight, Search, Bookmark, Sparkles, X, Sun, Moon } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const props = defineProps({
  title: {
    type: String,
    default: 'Document'
  },
  currentPage: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 1
  },
  searchResultCount: {
    type: Number,
    default: 0
  },
  currentResultIndex: {
    type: Number,
    default: -1
  },
  isStarred: {
    type: Boolean,
    default: false
  },
  isAiChatOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['search', 'next-result', 'previous-result', 'toggle-bookmark', 'toggle-ai-chat'])

const router = useRouter()
const isSearchOpen = ref(false)
const searchQuery = ref('')
const isDarkMode = ref(false)

const goBack = () => {
  router.back()
}

const toggleSearch = () => {
  isSearchOpen.value = !isSearchOpen.value
  if (!isSearchOpen.value) {
    searchQuery.value = ''
    emit('search', '')
  }
}

const handleSearch = () => {
  emit('search', searchQuery.value)
}

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

onMounted(() => {
  const savedMode = localStorage.getItem('darkMode')
  if (savedMode === 'true') {
    isDarkMode.value = true
    document.body.classList.add('dark-mode')
  } else if (savedMode === 'false') {
    isDarkMode.value = false
    document.body.classList.remove('dark-mode')
  } else {
    if (document.body.classList.contains('dark-mode')) {
      isDarkMode.value = true
    }
  }
})
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <button class="icon-btn back-btn" @click="goBack">
        <ChevronLeft :size="20" />
      </button>
      <span class="doc-title">{{ title }}</span>
    </div>

    <div class="toolbar-center">
      <!-- Empty for now, could be used for other controls -->
    </div>

    <div class="toolbar-right">
      <div v-if="isSearchOpen" class="search-input-wrapper">
        <input
          type="text"
          v-model="searchQuery"
          @input="handleSearch"
          @keydown.esc="toggleSearch"
          @keydown.enter="$emit('next-result')"
          placeholder="Search in document..."
          class="toolbar-search-input"
          autofocus
        />
        <span v-if="searchResultCount > 0" class="search-counter">
          {{ currentResultIndex + 1 }} / {{ searchResultCount }}
        </span>
        <button class="icon-btn" @click="$emit('previous-result')" :disabled="searchResultCount === 0">
          <ChevronLeft :size="16" />
        </button>
        <button class="icon-btn" @click="$emit('next-result')" :disabled="searchResultCount === 0">
          <ChevronRight :size="16" />
        </button>
        <button class="icon-btn" @click="toggleSearch">
          <X :size="18" />
        </button>
      </div>
      <template v-else>
        <button class="icon-btn" @click="$emit('toggle-bookmark')" :class="{ active: isStarred }">
          <Bookmark :size="18" :fill="isStarred ? 'currentColor' : 'none'" />
        </button>
        <button class="icon-btn" @click="$emit('toggle-ai-chat')" :class="{ active: isAiChatOpen }">
          <Sparkles :size="18" :fill="isAiChatOpen ? 'currentColor' : 'none'" />
        </button>
        <button class="icon-btn" @click="toggleDarkMode">
          <Sun v-if="isDarkMode" :size="18" />
          <Moon v-else :size="18" />
        </button>
        <button class="icon-btn" @click="toggleSearch">
          <Search :size="18" />
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  position: sticky;
  top: 0;
  width: 100%;
  height: 56px;
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-m);
  z-index: 100;
}

.toolbar-left, .toolbar-right {
  flex: 1;
  display: flex;
  align-items: center;
}

.toolbar-left {
  gap: var(--space-m);
}

.toolbar-right {
  justify-content: flex-end;
  gap: var(--space-m);
}

.toolbar-center {
  flex: 2;
  display: flex;
  justify-content: center;
  align-items: center;
}

.doc-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

.back-btn {
  margin-right: var(--space-xs);
}

.page-counter {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-regular);
}

.icon-btn {
  color: var(--color-text-secondary);
  padding: 6px;
  border-radius: 6px;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.icon-btn:hover, .icon-btn.active {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-s);
  background-color: var(--color-bg);
  padding: 6px 14px;
  border-radius: 10px;
  border: 2px solid var(--color-border);
  transition: border-color var(--transition-fast);
}

.search-input-wrapper:focus-within {
  border-color: var(--color-text-secondary);
}

.toolbar-search-input {
  padding: 4px 8px;
  border: none;
  background: transparent;
  font-size: var(--font-size-sm);
  flex: 1;
  min-width: 150px;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.toolbar-search-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-counter {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
