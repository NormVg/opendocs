<script setup>
import { FileUp } from 'lucide-vue-next'
</script>

<template>
  <div class="drag-overlay">
    <div class="content">
      <div class="icon-wrapper">
        <FileUp :size="48" />
      </div>
      <h2>Drop PDF to Open</h2>
      <p>Release to view your document</p>
    </div>
  </div>
</template>

<style scoped>
.drag-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease-out;
  pointer-events: none; /* Let events pass through to the drop handler on container */
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-m);
  color: white;
  transform: translateY(0);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.icon-wrapper {
  width: 96px;
  height: 96px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-s);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

h2 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

p {
  font-size: var(--font-size-lg);
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
