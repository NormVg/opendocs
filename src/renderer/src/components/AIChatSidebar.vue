<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Plus, SlidersHorizontal, Sparkles, ArrowUp, Copy, Check, X, FileText, Hash, Trash2 } from 'lucide-vue-next'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'request-context-current', 'request-context-range'])

const md = new MarkdownIt()
const width = ref(50) // Percentage
const isResizing = ref(false)
const inputQuery = ref('')
const messages = ref([
  {
    id: 1,
    role: 'ai',
    content: 'Hello! I can help you analyze this document. Ask me anything about it.'
  }
])
const messagesContainer = ref(null)

// Context Logic
const showContextMenu = ref(false)
const showRangeInput = ref(false)
const rangeStart = ref('')
const rangeEnd = ref('')
const contextItems = ref([]) // { id, type: 'page'|'range', label, content }

const toggleContextMenu = () => {
  showContextMenu.value = !showContextMenu.value
  showRangeInput.value = false // Reset range view on toggle
}

const requestCurrentPage = () => {
  emit('request-context-current')
  showContextMenu.value = false
}

const showRangeUI = () => {
  showRangeInput.value = true
}

const requestRange = () => {
  const start = parseInt(rangeStart.value)
  const end = parseInt(rangeEnd.value)

  if (start && end && start <= end) {
    emit('request-context-range', { start, end })
    showContextMenu.value = false
    showRangeInput.value = false
    rangeStart.value = ''
    rangeEnd.value = ''
  }
}

// Exposed method for parent to add context
const addContextItem = (item) => {
  // Check for duplicates
  const exists = contextItems.value.find(i => i.label === item.label)
  if (!exists) {
    contextItems.value.push({
      id: Date.now(),
      ...item
    })
  }
}

const removeContextItem = (id) => {
  contextItems.value = contextItems.value.filter(i => i.id !== id)
}

defineExpose({ addContextItem })

// Resize logic
const startResize = (e) => {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.userSelect = 'none'
}

const handleResize = (e) => {
  if (!isResizing.value) return
  const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100
  if (newWidth > 20 && newWidth < 80) {
    width.value = newWidth
  }
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.userSelect = ''
}

// Chat logic
const sendMessage = () => {
  if (!inputQuery.value.trim() && contextItems.value.length === 0) return

  // Construct message with context if present
  let fullContent = inputQuery.value

  // In a real app, we'd send context as a separate field to the LLM.
  // For display, we just show the user's query.
  // For the "mock" response, we'll acknowledge the context.

  const contextLabels = contextItems.value.map(i => i.label).join(', ')

  // Add user message
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: inputQuery.value,
    context: [...contextItems.value] // Store context with message
  })

  const userQuery = inputQuery.value
  inputQuery.value = ''
  const usedContext = [...contextItems.value]
  contextItems.value = [] // Clear context after sending

  // Simulate AI response (mock for now)
  setTimeout(() => {
    let responseText = ''
    if (usedContext.length > 0) {
      responseText += `*Analyzing context: ${usedContext.map(i => i.label).join(', ')}...*\n\n`
    }
    responseText += `I analyzed the document based on your query: "**${userQuery}**". \n\nHere are some key points:\n- Point 1\n- Point 2\n\nLet me know if you need more details.`

    messages.value.push({
      id: Date.now() + 1,
      role: 'ai',
      content: responseText
    })
    scrollToBottom()
  }, 1000)

  scrollToBottom()
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Copy functionality
const copiedId = ref(null)
const copyToClipboard = async (text, id) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => {
      copiedId.value = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    scrollToBottom()
  }
})
</script>

<template>
  <div
    class="ai-sidebar"
    :class="{ visible: visible }"
    :style="{ width: `${width}%` }"
  >
    <!-- Resize Handle -->
    <div class="resize-handle" @mousedown="startResize"></div>

    <!-- Header -->
    <div class="sidebar-header">
      <button class="close-btn" @click="$emit('close')">
        <X :size="20" />
      </button>
    </div>

    <!-- Messages Area -->
    <div class="messages-area" ref="messagesContainer">
      <div v-for="msg in messages" :key="msg.id" class="message-wrapper" :class="msg.role">
        <!-- User Message -->
        <div v-if="msg.role === 'user'" class="user-bubble">
          <div v-if="msg.context && msg.context.length > 0" class="message-context-chips">
            <span v-for="ctx in msg.context" :key="ctx.id" class="context-chip small">
              <FileText :size="10" />
              {{ ctx.label }}
            </span>
          </div>
          {{ msg.content }}
        </div>

        <!-- AI Message -->
        <div v-else class="ai-message">
          <div class="markdown-content" v-html="md.render(msg.content)"></div>
          <div class="message-actions">
            <button class="action-btn" @click="copyToClipboard(msg.content, msg.id)">
              <Check v-if="copiedId === msg.id" :size="14" />
              <Copy v-else :size="14" />
              <span>{{ copiedId === msg.id ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-container">
      <!-- Context Chips Display -->
      <div v-if="contextItems.length > 0" class="active-context-items">
        <div v-for="item in contextItems" :key="item.id" class="context-chip">
          <FileText :size="12" />
          <span>{{ item.label }}</span>
          <button class="remove-chip" @click="removeContextItem(item.id)">
            <X :size="12" />
          </button>
        </div>
      </div>

      <div class="input-box">
        <input
          v-model="inputQuery"
          type="text"
          placeholder="Ask a follow-up..."
          @keydown.enter="sendMessage"
        />
        <div class="input-actions">
          <div class="left-actions">
            <div class="context-menu-wrapper">
              <button class="icon-btn" @click="toggleContextMenu" :class="{ active: showContextMenu }" title="Add Context">
                <Plus :size="20" />
              </button>

              <!-- Context Menu Popover -->
              <div v-if="showContextMenu" class="context-menu">
                <template v-if="!showRangeInput">
                  <button class="menu-item" @click="requestCurrentPage">
                    <FileText :size="16" />
                    <span>Current Page</span>
                  </button>
                  <button class="menu-item" @click="showRangeUI">
                    <Hash :size="16" />
                    <span>Page Range...</span>
                  </button>
                </template>
                <template v-else>
                  <div class="range-input-wrapper">
                    <div class="range-inputs">
                      <input v-model="rangeStart" type="number" placeholder="Start" min="1" class="small-input" />
                      <span>-</span>
                      <input v-model="rangeEnd" type="number" placeholder="End" min="1" class="small-input" />
                    </div>
                    <button class="add-range-btn" @click="requestRange">Add</button>
                  </div>
                </template>
              </div>
            </div>
          </div>
          <button
            class="send-btn"
            :disabled="!inputQuery.trim() && contextItems.length === 0"
            @click="sendMessage"
          >
            <ArrowUp :size="18" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  background: var(--sidebar-bg);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-left: 1px solid var(--color-border);
  z-index: 200;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform var(--transition-normal);
  box-shadow: -5px 0 30px rgba(0, 0, 0, 0.05);
  border-top-left-radius: 20px;
  border-bottom-left-radius: 20px;
  margin: 10px 10px 10px 0; /* Float it slightly */
  height: calc(100% - 20px); /* Adjust height for margins */
}

.ai-sidebar.visible {
  transform: translateX(0);
}

/* Dark mode support handled by CSS variables in base.css */

.resize-handle {
  position: absolute;
  left: -4px;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 201;
}

.resize-handle:hover {
  background: rgba(0, 0, 0, 0.1);
}

.sidebar-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 var(--space-l);
}

.close-btn {
  color: var(--color-text-tertiary);
  padding: 4px;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-l);
  display: flex;
  flex-direction: column;
  gap: var(--space-l);
}

.message-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 100%;
}

.message-wrapper.user {
  align-items: flex-end;
}

.user-bubble {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
  padding: 10px 16px;
  border-radius: 20px;
  border-bottom-right-radius: 4px;
  max-width: 85%;
  font-size: var(--font-size-base);
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-context-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.context-chip.small {
  font-size: 10px;
  padding: 2px 6px;
  background: rgba(0,0,0,0.05);
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

:global(body.dark-mode) .context-chip.small {
  background: rgba(255,255,255,0.1);
}

.ai-message {
  width: 100%;
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  line-height: 1.6;
}

.markdown-content :deep(p) {
  margin-bottom: 1em;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(ul), .markdown-content :deep(ol) {
  margin-bottom: 1em;
  padding-left: 1.5em;
}

.markdown-content :deep(code) {
  background: var(--color-bg-hover);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}

.message-actions {
  margin-top: var(--space-xs);
  display: flex;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  padding: 4px 8px;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

/* Input Area */
.input-container {
  padding: var(--space-l);
  padding-top: var(--space-m);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.active-context-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 4px;
}

.context-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-bg-hover);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.remove-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  padding: 2px;
  border-radius: 50%;
}

.remove-chip:hover {
  background: rgba(0,0,0,0.1);
  color: var(--color-text-primary);
}

:global(body.dark-mode) .remove-chip:hover {
  background: rgba(255,255,255,0.1);
}

.input-box {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--shadow-md);
}

.input-box input {
  width: 100%;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  padding: 4px 0;
}

.input-box input::placeholder {
  color: var(--color-text-tertiary);
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-menu-wrapper {
  position: relative;
}

.context-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 6px;
  min-width: 180px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  color: var(--color-text-secondary);
  font-size: 13px;
  text-align: left;
  width: 100%;
}

.menu-item:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.range-input-wrapper {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.small-input {
  width: 60px;
  padding: 6px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  font-size: 12px;
  text-align: center;
}

.add-range-btn {
  background: var(--color-text-primary);
  color: var(--color-bg);
  padding: 6px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  width: 100%;
}

.icon-btn {
  color: var(--color-text-tertiary);
  padding: 6px;
  border-radius: 6px;
  transition: all var(--transition-fast);
}

.icon-btn:hover, .icon-btn.active {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.send-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-text-primary);
  color: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.send-btn:disabled {
  background: var(--color-bg-hover);
  color: var(--color-text-tertiary);
  cursor: not-allowed;
}
</style>
