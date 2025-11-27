<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Plus, SlidersHorizontal, Sparkles, ArrowUp, Copy, Check, X, FileText, Hash, Trash2, Reply, MessageSquare, History } from 'lucide-vue-next'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  filePath: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'request-context-current', 'request-context-range'])

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
               hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
               '</code></pre>';
      } catch (__) {}
    }

    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
})

const width = ref(50) // Percentage
const isResizing = ref(false)
const inputQuery = ref('')
const messages = ref([])
const messagesContainer = ref(null)
const chatHistory = ref([])
const currentChatId = ref(null)
const showHistory = ref(false)
const selectedModel = ref('gemini-2.0-flash-lite')

const models = [
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
]

// Load history on mount
onMounted(() => {
  const saved = localStorage.getItem('opendocs-chat-history')
  if (saved) {
    try {
      chatHistory.value = JSON.parse(saved)
    } catch (e) {
      chatHistory.value = []
    }
  }
  startNewChat()
})

const saveChat = () => {
  if (messages.value.length === 0) return

  const chat = {
    id: currentChatId.value,
    title: messages.value.find(m => m.role === 'user')?.content.slice(0, 30) + '...' || 'New Chat',
    date: new Date().toISOString(),
    messages: messages.value,
    model: selectedModel.value
  }

  const index = chatHistory.value.findIndex(c => c.id === currentChatId.value)
  if (index !== -1) {
    chatHistory.value[index] = chat
  } else {
    chatHistory.value.unshift(chat)
  }

  localStorage.setItem('opendocs-chat-history', JSON.stringify(chatHistory.value))
}

const loadChat = (chat) => {
  currentChatId.value = chat.id
  messages.value = chat.messages
  selectedModel.value = chat.model || 'gemini-2.0-flash-lite'
  showHistory.value = false
  scrollToBottom()
}

const startNewChat = () => {
  saveChat() // Save current before switching
  currentChatId.value = Date.now().toString()
  messages.value = [
    {
      id: 1,
      role: 'ai',
      content: 'Hello! I can help you analyze this document. Ask me anything about it.',
      isStreaming: false
    }
  ]
  showHistory.value = false
}

const deleteChat = (id) => {
  chatHistory.value = chatHistory.value.filter(c => c.id !== id)
  localStorage.setItem('opendocs-chat-history', JSON.stringify(chatHistory.value))
  if (currentChatId.value === id) {
    startNewChat()
  }
}

// ... (rest of logic)

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

const replyToMessage = (content) => {
  addContextItem({
    type: 'ai-reply',
    label: 'AI Response',
    content: content
  })
}

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

  const apiKey = localStorage.getItem('gemini_api_key')
  if (!apiKey) {
    messages.value.push({
      id: Date.now(),
      role: 'ai',
      content: 'Please set your Gemini API Key in Settings to use the AI Chat.'
    })
    scrollToBottom()
    return
  }

  // Prepare context string
  const contextString = contextItems.value.map(item => `[${item.label}]: ${item.content}`).join('\n\n')

  // Add user message
  const userMsgId = Date.now()
  messages.value.push({
    id: userMsgId,
    role: 'user',
    content: inputQuery.value,
    context: [...contextItems.value]
  })

  const userContent = inputQuery.value
  inputQuery.value = ''
  // contextItems.value = [] // Keep context items until manually removed

  // Prepare AI message placeholder
  const aiMsgId = userMsgId + 1
  messages.value.push({
    id: aiMsgId,
    role: 'ai',
    content: '',
    isStreaming: true
  })

  scrollToBottom()

  // Prepare history for API
  const apiMessages = messages.value
    .filter(m => m.id !== aiMsgId)
    .map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content
    }))

  // Start stream
  window.api.streamChat(
    apiMessages,
    apiKey,
    contextString,
    props.filePath,
    (chunk) => {
      const aiMsg = messages.value.find(m => m.id === aiMsgId)
      if (aiMsg) {
        aiMsg.content += chunk
        scrollToBottom()
      }
    },
    () => {
      console.log('Stream complete')
      const aiMsg = messages.value.find(m => m.id === aiMsgId)
      if (aiMsg) {
        aiMsg.isStreaming = false
      }
    },
    (error) => {
      const aiMsg = messages.value.find(m => m.id === aiMsgId)
      if (aiMsg) {
        aiMsg.content += `\n\n*Error: ${error}*`
        aiMsg.isStreaming = false
        scrollToBottom()
      }
    }
  )
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

const textareaRef = ref(null)

const autoResize = () => {
  const textarea = textareaRef.value
  if (!textarea) return

  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}

const handleEnterKey = (e) => {
  if (e.shiftKey) {
    // Allow new line
    return
  }
  // Send message
  sendMessage()
}

// Reset height after sending
watch(inputQuery, (newVal) => {
  if (newVal === '') {
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.style.height = 'auto'
      }
    })
  }
})

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
      <div class="header-left">
        <button class="icon-btn" @click="showHistory = !showHistory" :class="{ active: showHistory }" title="Chat History">
          <History :size="20" />
        </button>
        <button class="icon-btn" @click="startNewChat" title="New Chat">
          <MessageSquare :size="20" />
          <Plus :size="14" class="plus-badge" />
        </button>
      </div>

      <button class="close-btn" @click="$emit('close')">
        <X :size="20" />
      </button>
    </div>

    <!-- History View -->
    <div v-if="showHistory" class="history-view">
      <div class="history-header">
        <h3>Chat History</h3>
      </div>
      <div class="history-list">
        <div
          v-for="chat in chatHistory"
          :key="chat.id"
          class="history-item"
          :class="{ active: chat.id === currentChatId }"
          @click="loadChat(chat)"
        >
          <div class="history-info">
            <span class="history-title">{{ chat.title }}</span>
            <span class="history-date">{{ new Date(chat.date).toLocaleDateString() }}</span>
          </div>
          <button class="delete-chat-btn" @click.stop="deleteChat(chat.id)">
            <Trash2 :size="14" />
          </button>
        </div>
        <div v-if="chatHistory.length === 0" class="empty-history">
          No chat history yet
        </div>
      </div>
    </div>

    <!-- Messages Area -->
    <div v-else class="messages-area" ref="messagesContainer">
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
        <div v-else class="ai-message" :class="{ 'streaming': msg.isStreaming }">
          <div class="markdown-content" v-html="md.render(msg.content)"></div>
          <div class="message-actions">
            <button class="action-btn" @click="copyToClipboard(msg.content, msg.id)">
              <Check v-if="copiedId === msg.id" :size="14" />
              <Copy v-else :size="14" />
              <span>{{ copiedId === msg.id ? 'Copied' : 'Copy' }}</span>
            </button>
            <button class="action-btn" @click="replyToMessage(msg.content)">
              <Reply :size="14" />
              <span>Reply</span>
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
        <textarea
          v-model="inputQuery"
          ref="textareaRef"
          placeholder="Ask a follow-up..."
          rows="1"
          @keydown.enter.prevent="handleEnterKey"
          @input="autoResize"
        ></textarea>
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

            <div class="model-selector-small">
              <select v-model="selectedModel" title="Select Model">
                <option v-for="model in models" :key="model.id" :value="model.id">
                  {{ model.name }}
                </option>
              </select>
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
  justify-content: space-between;
  padding: 0 var(--space-l);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plus-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  background: var(--color-bg);
  border-radius: 50%;
  padding: 1px;
}

.model-selector-small {
  display: flex;
  align-items: center;
  height: 32px; /* Match icon button height */
}

.model-selector-small select {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0 8px;
  height: 100%;
  font-size: 12px;
  outline: none;
  cursor: pointer;
  max-width: 140px;
  transition: all var(--transition-fast);
}

.model-selector-small select:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.history-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-header {
  padding: var(--space-m) var(--space-l);
  border-bottom: 1px solid var(--color-border);
}

.history-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-s);
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: 4px;
}

.history-item:hover {
  background: var(--color-bg-hover);
}

.history-item.active {
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.history-title {
  font-size: 13px;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-date {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.delete-chat-btn {
  opacity: 0;
  color: var(--color-text-tertiary);
  padding: 4px;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.history-item:hover .delete-chat-btn {
  opacity: 1;
}

.delete-chat-btn:hover {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}

.empty-history {
  padding: var(--space-l);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 13px;
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

.ai-message.streaming .markdown-content::after {
  content: '▋';
  display: inline-block;
  vertical-align: baseline;
  animation: blink 1s step-start infinite;
  color: var(--color-text-primary);
  margin-left: 2px;
  font-size: 0.8em;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Syntax Highlighting Overrides */
:deep(.hljs) {
  background: #1e1e1e;
  padding: 12px;
  border-radius: 8px;
  margin: 8px 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9em;
  overflow-x: auto;
  color: #abb2bf;
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

.input-box textarea {
  width: 100%;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  padding: 4px 0;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  min-height: 24px;
  max-height: 120px;
  overflow-y: auto;
  font-family: inherit;
  line-height: 1.5;
}

.input-box textarea::placeholder {
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
  position: relative; /* For badge positioning */
  color: var(--color-text-tertiary);
  padding: 6px;
  border-radius: 6px;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
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
