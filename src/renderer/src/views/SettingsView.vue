<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Moon, Sun, Key, Trash2, Info, Plus, Server } from 'lucide-vue-next'

const router = useRouter()
const isDarkMode = ref(false)
const apiKey = ref('')
const customInstructions = ref('')
const appVersion = '1.0.0'

// Model Management
const models = ref([
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
])
const newModelId = ref('')
const newModelName = ref('')

onMounted(() => {
  // Load dark mode state
  const savedMode = localStorage.getItem('darkMode')
  if (savedMode === 'true') {
    isDarkMode.value = true
  } else if (savedMode === 'false') {
    isDarkMode.value = false
  } else {
    isDarkMode.value = document.body.classList.contains('dark-mode')
  }

  // Load API key
  const savedKey = localStorage.getItem('gemini_api_key')
  if (savedKey) {
    apiKey.value = savedKey
  }

  // Load custom instructions
  const savedInstructions = localStorage.getItem('custom_instructions')
  if (savedInstructions) {
    customInstructions.value = savedInstructions
  }

  // Load Models
  const savedModels = localStorage.getItem('opendocs-models')
  if (savedModels) {
    try {
      models.value = JSON.parse(savedModels)
    } catch (e) {
      console.error('Failed to parse models', e)
    }
  }
})

const saveModels = () => {
  localStorage.setItem('opendocs-models', JSON.stringify(models.value))
}

const addModel = () => {
  if (newModelId.value && newModelName.value) {
    models.value.push({
      id: newModelId.value,
      name: newModelName.value
    })
    saveModels()
    newModelId.value = ''
    newModelName.value = ''
  }
}

const removeModel = (index) => {
  if (confirm('Remove this model?')) {
    models.value.splice(index, 1)
    saveModels()
  }
}

const goBack = () => {
  router.back()
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

const saveApiKey = () => {
  localStorage.setItem('gemini_api_key', apiKey.value)
  // Optional: Show a toast or feedback
}

const saveCustomInstructions = () => {
  localStorage.setItem('custom_instructions', customInstructions.value)
}

const clearHistory = () => {
  if (confirm('Are you sure you want to clear your document history? This cannot be undone.')) {
    localStorage.removeItem('opendocs-history')
    // Optional: Show feedback
  }
}
</script>

<template>
  <div class="settings-container">
    <div class="settings-header">
      <button class="icon-btn back-btn" @click="goBack">
        <ChevronLeft :size="24" />
      </button>
      <h1 class="page-title">Settings</h1>
    </div>

    <div class="settings-content">
      <!-- Appearance Section -->
      <section class="settings-section">
        <h2 class="section-title">Appearance</h2>
        <div class="setting-item">
          <div class="setting-info">
            <div class="icon-wrapper">
              <Moon v-if="isDarkMode" :size="20" />
              <Sun v-else :size="20" />
            </div>
            <div class="text-wrapper">
              <span class="setting-label">Dark Mode</span>
              <span class="setting-desc">Switch between light and dark themes</span>
            </div>
          </div>
          <button class="toggle-switch" :class="{ active: isDarkMode }" @click="toggleDarkMode">
            <div class="toggle-thumb"></div>
          </button>
        </div>
      </section>

      <!-- AI Configuration Section -->
      <section class="settings-section">
        <h2 class="section-title">Intelligence</h2>
        <div class="setting-item column">
          <div class="setting-info">
            <div class="icon-wrapper">
              <Key :size="20" />
            </div>
            <div class="text-wrapper">
              <span class="setting-label">Gemini API Key</span>
              <span class="setting-desc">Required for AI Chat features</span>
            </div>
          </div>
          <div class="input-wrapper">
            <input
              type="password"
              v-model="apiKey"
              @change="saveApiKey"
              placeholder="AIza..."
              class="settings-input"
            />
          </div>
        </div>

        <div class="setting-item column">
          <div class="setting-info">
            <div class="icon-wrapper">
              <Server :size="20" />
            </div>
            <div class="text-wrapper">
              <span class="setting-label">Custom Instructions</span>
              <span class="setting-desc">Add custom behavior instructions for the AI (optional)</span>
            </div>
          </div>
          <div class="input-wrapper">
            <textarea
              v-model="customInstructions"
              @input="saveCustomInstructions"
              placeholder="e.g., Always respond in a formal tone, prioritize code examples, etc."
              class="settings-textarea"
              rows="4"
            ></textarea>
          </div>
        </div>
      </section>

      <!-- Models Section -->
      <section class="settings-section">
        <h2 class="section-title">Models</h2>
        <div class="setting-item column">
          <div class="setting-info">
            <div class="icon-wrapper">
              <Server :size="20" />
            </div>
            <div class="text-wrapper">
              <span class="setting-label">AI Models</span>
              <span class="setting-desc">Manage available models for chat</span>
            </div>
          </div>

          <div class="models-list">
            <div v-for="(model, index) in models" :key="index" class="model-item">
              <div class="model-info">
                <span class="model-name">{{ model.name }}</span>
                <span class="model-id">{{ model.id }}</span>
              </div>
              <button class="icon-btn-danger" @click="removeModel(index)">
                <Trash2 :size="16" />
              </button>
            </div>
          </div>

          <div class="add-model-form">
            <input
              v-model="newModelName"
              placeholder="Model Name (e.g. Gemini Pro)"
              class="settings-input"
            />
            <input
              v-model="newModelId"
              placeholder="Model ID (e.g. gemini-1.5-pro)"
              class="settings-input"
            />
            <button class="btn-primary" @click="addModel" :disabled="!newModelId || !newModelName">
              <Plus :size="16" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Data Section -->
      <section class="settings-section">
        <h2 class="section-title">Data</h2>
        <div class="setting-item">
          <div class="setting-info">
            <div class="icon-wrapper danger">
              <Trash2 :size="20" />
            </div>
            <div class="text-wrapper">
              <span class="setting-label">Clear History</span>
              <span class="setting-desc">Remove all document history</span>
            </div>
          </div>
          <button class="btn-danger" @click="clearHistory">Clear</button>
        </div>
      </section>

      <!-- About Section -->
      <section class="settings-section">
        <h2 class="section-title">About</h2>
        <div class="setting-item">
          <div class="setting-info">
            <div class="icon-wrapper">
              <Info :size="20" />
            </div>
            <div class="text-wrapper">
              <span class="setting-label">Version</span>
              <span class="setting-desc">opendocs v{{ appVersion }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  height: 100vh;
  overflow-y: auto;
  background-color: var(--color-bg);
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.settings-header {
  width: 100%;
  max-width: 600px;
  display: flex;
  align-items: center;
  margin-bottom: var(--space-xxl);
  position: relative;
}

.back-btn {
  position: absolute;
  left: -48px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  padding: 0;
}

.back-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.settings-content {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);
}

.section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-left: var(--space-s);
}

.setting-item {
  background: var(--glass-bg);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: var(--space-m);
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all var(--transition-fast);
}

.setting-item.column {
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-m);
}

.setting-info {
  display: flex;
  align-items: center;
  gap: var(--space-m);
}

.icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: var(--color-bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
}

.icon-wrapper.danger {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}

.text-wrapper {
  display: flex;
  flex-direction: column;
}

.setting-label {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.setting-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

/* Toggle Switch */
.toggle-switch {
  width: 44px;
  height: 24px;
  background-color: var(--color-border);
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background-color var(--transition-normal);
}

.toggle-switch.active {
  background-color: var(--color-text-primary);
}

.toggle-thumb {
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform var(--transition-normal);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.toggle-switch.active .toggle-thumb {
  transform: translateX(20px);
  background-color: var(--color-bg); /* Invert for dark mode contrast */
}

/* Input */
.input-wrapper {
  width: 100%;
}

.settings-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 13px;
  transition: all var(--transition-fast);
}

.settings-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-bg-primary);
}

.settings-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  transition: all var(--transition-fast);
}

.settings-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-bg-primary);
}

/* Buttons */
.btn-danger {
  padding: 8px 16px;
  border-radius: 8px;
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
}

.btn-danger:hover {
  background-color: #ef4444;
  color: white;
}

/* Dark Mode Overrides for specific elements */
:global(body.dark-mode) .toggle-switch.active .toggle-thumb {
  background-color: white; /* Light thumb on dark track */
}

/* Models Section Styles */
.models-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-bg-hover);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.model-info {
  display: flex;
  flex-direction: column;
}

.model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.model-id {
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-family: monospace;
}

.icon-btn-danger {
  color: var(--color-text-tertiary);
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn-danger:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.add-model-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--color-text-primary);
  color: var(--color-bg);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  transition: opacity 0.2s;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
