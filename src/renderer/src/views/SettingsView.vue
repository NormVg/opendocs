<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Moon, Sun, Key, Trash2, Info } from 'lucide-vue-next'

const router = useRouter()
const isDarkMode = ref(false)
const apiKey = ref('')
const appVersion = '1.0.0'

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
})

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
  min-height: 100vh;
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
  padding: 8px;
  border-radius: 50%;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
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
  border-radius: 8px;
  background-color: var(--color-bg-alt);
  border: 1px solid transparent;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.settings-input:focus {
  background-color: var(--color-bg);
  border-color: var(--color-text-secondary);
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
:global(body.dark-mode) .toggle-thumb {
  background-color: #111; /* Dark thumb on light track */
}

:global(body.dark-mode) .toggle-switch.active .toggle-thumb {
  background-color: white; /* Light thumb on dark track */
}
</style>
