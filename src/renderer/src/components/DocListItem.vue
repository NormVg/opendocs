<script setup>
import { Star, ArrowUpRight } from 'lucide-vue-next'

const props = defineProps({
  id: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  starred: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-star'])
</script>

<template>
  <div class="doc-item">
    <span class="doc-title">{{ title }}</span>
    <div class="doc-actions">
      <button class="icon-btn">
        <ArrowUpRight :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.doc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-m) 0;
  border-bottom: 1px solid var(--color-border);
  transition: background-color var(--transition-fast), transform var(--transition-fast);
  cursor: pointer;
}

.doc-item:hover {
  transform: translateY(-1px);
}

.doc-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.doc-actions {
  display: flex;
  gap: var(--space-xs);
  opacity: 1;
  transition: opacity var(--transition-fast);
}

.icon-btn {
  color: var(--color-text-tertiary);
  padding: 4px;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.icon-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-hover);
  transform: translate(2px, -2px);
}

.icon-btn.active {
  color: var(--color-text-primary);
}
</style>
