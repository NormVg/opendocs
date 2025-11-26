<script setup>
import { ref, computed } from 'vue'
import { Search, Plus, HelpCircle, Folder, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  folders: {
    type: Array,
    default: () => []
  },
  collapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle'])

const searchQuery = ref('')

const filteredFolders = computed(() => {
  if (!searchQuery.value) return props.folders
  return props.folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})
</script>

<template>
  <div class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <div class="search-wrapper" v-if="!collapsed">
        <Search :size="14" class="search-icon" />
        <input
          type="text"
          placeholder="Search.."
          class="search-input"
          v-model="searchQuery"
        />
      </div>
      <button class="toggle-btn" @click="$emit('toggle')" :title="collapsed ? 'Expand' : 'Collapse'">
        <ChevronRight v-if="collapsed" :size="16" />
        <ChevronLeft v-else :size="16" />
      </button>
    </div>

    <div class="sidebar-content">
      <div class="folder-list">
        <div v-for="folder in filteredFolders" :key="folder.id" class="folder-item" :title="folder.name">
          <Folder :size="16" class="folder-icon" />
          <span class="folder-name" v-if="!collapsed">{{ folder.name }}</span>
        </div>
      </div>

      <button class="add-folder-btn" :title="!collapsed ? 'Add Folder' : ''">
        <Plus :size="16" />
        <span v-if="!collapsed">Add Folder</span>
      </button>
    </div>

    <div class="sidebar-footer">
      <button class="help-btn" :title="!collapsed ? 'Need Help?' : ''">
        <HelpCircle :size="16" />
        <span v-if="!collapsed">Need Help?</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 260px;
  height: 100%;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-alt);
  padding: var(--space-l);
  transition: width var(--transition-normal), padding var(--transition-normal);
  position: relative;
}

.sidebar.collapsed {
  width: 60px;
  padding: var(--space-l) var(--space-s);
  align-items: center;
}

.sidebar-header {
  margin-bottom: var(--space-l);
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 36px;
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
}

.toggle-btn {
  color: var(--color-text-tertiary);
  padding: 4px;
  border-radius: 4px;
  transition: color var(--transition-fast), background-color var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-hover);
}

.search-wrapper {
  display: flex;
  align-items: center;
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 12px;
  transition: border-color var(--transition-fast);
  flex: 1;
  margin-right: var(--space-s);
}

.search-wrapper:focus-within {
  border-color: var(--color-border-hover);
}

.search-icon {
  color: var(--color-text-tertiary);
  margin-right: var(--space-s);
}

.search-input {
  width: 100%;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

.folder-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: background-color var(--transition-fast), color var(--transition-fast);
  margin-bottom: 2px;
}

.folder-item:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.folder-icon {
  margin-right: var(--space-s);
  opacity: 0.7;
}

.folder-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.add-folder-btn {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  margin-top: var(--space-m);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: color var(--transition-fast);
}

.add-folder-btn:hover {
  color: var(--color-text-primary);
}

.add-folder-btn svg {
  margin-right: var(--space-s);
}

.sidebar-footer {
  margin-top: auto;
  padding-top: var(--space-m);
}

.help-btn {
  display: flex;
  align-items: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  transition: color var(--transition-fast);
}

.help-btn:hover {
  color: var(--color-text-primary);
}

.help-btn svg {
  margin-right: var(--space-s);
}
</style>
