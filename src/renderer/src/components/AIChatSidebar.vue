<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Plus, SlidersHorizontal, Sparkles, ArrowUp, Copy, Check, X } from 'lucide-vue-next'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

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
  if (!inputQuery.value.trim()) return

  // Add user message
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: inputQuery.value
  })

  const userQuery = inputQuery.value
  inputQuery.value = ''

  // Simulate AI response (mock for now)
  setTimeout(() => {
    messages.value.push({
      id: Date.now() + 1,
      role: 'ai',
      content: `I analyzed the document based on your query: "**${userQuery}**". \n\nHere are some key points:\n- Point 1\n- Point 2\n\nLet me know if you need more details.`
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
      <!-- Title removed -->
      <button class="close-btn" @click="$emit('close')">
        <X :size="20" />
      </button>
    </div>

    <!-- Messages Area -->
    <div class="messages-area" ref="messagesContainer">
      <div v-for="msg in messages" :key="msg.id" class="message-wrapper" :class="msg.role">
        <!-- User Message -->
        <div v-if="msg.role === 'user'" class="user-bubble">
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
      <div class="input-box">
        <input
          v-model="inputQuery"
          type="text"
          placeholder="Ask a follow-up..."
          @keydown.enter="sendMessage"
        />
        <div class="input-actions">
          <div class="left-actions">
            <!-- Removed extra controls -->
          </div>
          <button
            class="send-btn"
            :disabled="!inputQuery.trim()"
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

.header-title {
  display: flex;
  align-items: center;
  gap: var(--space-s);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.ai-icon {
  color: var(--color-text-secondary);
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

.icon-btn {
  color: var(--color-text-tertiary);
  padding: 6px;
  border-radius: 6px;
  transition: all var(--transition-fast);
}

.icon-btn:hover {
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
