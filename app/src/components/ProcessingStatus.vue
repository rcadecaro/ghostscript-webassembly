<script setup lang="ts">
defineProps<{
  isLoading: boolean;
  isProcessing: boolean;
  progress: { current: number; total: number };
  statusText: string;
  progressPercent: number;
  loadingTitle?: string;
  processingTitle?: string;
}>();
</script>

<template>
  <section v-if="isLoading || isProcessing" class="progress-panel">
    <div class="spinner-container">
      <div class="spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
    </div>
    <div class="progress-info">
      <h3 class="progress-title" v-if="isLoading">{{ loadingTitle || 'Carregando Ghostscript' }}</h3>
      <h3 class="progress-title" v-else>{{ processingTitle || 'Processando PDF' }}</h3>
      <p class="progress-status">{{ statusText }}</p>
      
      <!-- Barra de progresso real-time -->
      <div v-if="isProcessing && progress.total > 0" class="progress-bar-section">
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: `${progressPercent}%` }"></div>
        </div>
        <span class="progress-percent">{{ progressPercent }}%</span>
      </div>
      
      <p class="progress-hint" v-if="isProcessing && progress.total === 0">
        ⏳ Analisando documento...
      </p>
      <p class="progress-hint" v-if="isLoading">
        📦 Baixando módulo WebAssembly (~16MB)...<br/>
        Isso só acontece na primeira vez.
      </p>
    </div>
  </section>
</template>

<style scoped>
/* Progress Panel */
.progress-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  margin-top: 2rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.spinner-container {
  flex-shrink: 0;
}

.spinner {
  position: relative;
  width: 60px;
  height: 60px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 4px solid transparent;
  border-top-color: var(--gs-cyan);
  border-radius: 50%;
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.spinner-ring:nth-child(1) { animation-delay: -0.45s; }
.spinner-ring:nth-child(2) { animation-delay: -0.3s; }
.spinner-ring:nth-child(3) { animation-delay: -0.15s; }

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-info {
  flex: 1;
}

.progress-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.progress-status {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.progress-bar-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.progress-bar-container {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--gradient);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-percent {
  font-weight: 600;
  color: var(--gs-cyan);
  min-width: 45px;
  text-align: right;
}

.progress-hint {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
  line-height: 1.4;
}
</style>
