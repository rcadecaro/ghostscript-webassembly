<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  selectedFile: File | null;
  isLoading?: boolean;
  isProcessing?: boolean;
  accept?: string;
  title?: string;
  description?: string;
  id?: string;
}>();

const emit = defineEmits<{
  (e: 'file-selected', file: File): void;
  (e: 'clear-file'): void;
}>();

const isDragging = ref(false);

const fileSizeFormatted = computed(() => {
  if (!props.selectedFile) return '';
  const size = props.selectedFile.size;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
});

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (!props.isLoading && !props.isProcessing) {
    isDragging.value = true;
  }
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  
  if (props.isLoading || props.isProcessing) return;

  const files = event.dataTransfer?.files;
  if (files && files[0]) {
    if (props.accept && !files[0].type.match('application/pdf')) {
      // TODO: Melhorar validação de tipo se necessário
      return;
    }
    emit('file-selected', files[0]);
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    emit('file-selected', input.files[0]);
  }
}
</script>

<template>
  <section 
    class="upload-card" 
    :class="{ dragging: isDragging, 'has-file': selectedFile }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <input 
      type="file" 
      :id="id || 'file-input'"
      :accept="accept || '.pdf'" 
      @change="handleFileSelect"
      :disabled="isLoading || isProcessing"
      class="file-input"
    />
    
    <div v-if="!selectedFile" class="upload-content">
      <div class="upload-icon-wrapper">
        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10V9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9V10C19.2091 10 21 11.7909 21 14C21 15.4806 20.1956 16.8084 19 17.5M7 10C4.79086 10 3 11.7909 3 14C3 15.4806 3.8044 16.8084 5 17.5M7 10C7.43285 10 7.84965 10.0688 8.24006 10.1959M12 12V21M12 12L15 15M12 12L9 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h2 class="upload-title">{{ title || 'Arraste seu PDF aqui' }}</h2>
      <p class="upload-desc">{{ description || 'ou clique para selecionar um arquivo' }}</p>
      <label :for="id || 'file-input'" class="upload-btn">
        <span class="btn-glow"></span>
        <span class="btn-text">Escolher Arquivo</span>
      </label>
      <p class="upload-hint">Suporta PDFs de qualquer tamanho</p>
    </div>

    <div v-else class="file-preview">
      <div class="file-icon-wrapper">
        <svg class="file-icon" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" stroke-width="1.5"/>
          <path d="M14 2V8H20" stroke="currentColor" stroke-width="1.5"/>
          <path d="M9 13H15M9 17H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="file-info">
        <h3 class="file-name">{{ selectedFile.name }}</h3>
        <span class="file-meta">{{ fileSizeFormatted }} • PDF</span>
      </div>
      <button class="remove-btn" @click.stop="emit('clear-file')" title="Remover">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Upload Card */
.upload-card {
  background: var(--bg-card);
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  padding: 3rem 2rem;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  margin-bottom: 2rem;
}

.upload-card:hover {
  border-color: var(--border-hover);
  background: var(--bg-hover);
}

.upload-card.dragging {
  border-color: var(--gs-cyan);
  background: rgba(16, 149, 194, 0.05);
  transform: scale(1.01);
}

.upload-card.has-file {
  border-style: solid;
  border-color: var(--gs-cyan);
  background: var(--bg-elevated);
  padding: 2rem;
}

.file-input {
  display: none;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.upload-icon-wrapper {
  width: 80px;
  height: 80px;
  background: var(--gradient-subtle);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  transition: transform 0.3s ease;
}

.upload-card:hover .upload-icon-wrapper {
  transform: scale(1.1) rotate(-5deg);
}

.upload-icon {
  width: 40px;
  height: 40px;
  color: var(--gs-cyan);
}

.upload-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.upload-desc {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.upload-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.8rem 2rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-weight: 500;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.upload-btn:hover {
  border-color: var(--gs-cyan);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--gradient);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 0;
}

.upload-btn:hover .btn-glow {
  opacity: 0.1;
}

.btn-text {
  position: relative;
  z-index: 1;
}

.upload-hint {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 1rem;
}

/* File Preview */
.file-preview {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  text-align: left;
}

.file-icon-wrapper {
  width: 60px;
  height: 60px;
  background: var(--gradient);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon {
  width: 32px;
  height: 32px;
  color: white;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.remove-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error);
  transform: rotate(90deg);
}

.remove-btn svg {
  width: 24px;
  height: 24px;
}
</style>
