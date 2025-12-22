<script setup lang="ts">
import { ref, computed } from 'vue';
import FileUploader from '@/components/FileUploader.vue';
import ProcessingStatus from '@/components/ProcessingStatus.vue';
import AppHeader from '@/components/AppHeader.vue';
import { AppEvents } from '@/services/firebase';
import { 
  optimizePdf, 
  uint8ArrayToObjectUrl,
  initGhostscriptWorker,
  isWorkerReady 
} from '@/services/ghostscript/GhostscriptWorkerService';

// Tipos
type OptimizationPreset = '/screen' | '/ebook' | '/printer' | '/prepress' | 'custom';

interface PresetOption {
  value: OptimizationPreset;
  label: string;
  dpi: string;
  desc: string;
  icon: string;
}

// Opções de Presets
const presets: PresetOption[] = [
  { value: '/screen', label: 'Tela (Baixa)', dpi: '72 DPI', desc: 'Menor tamanho, ideal para visualização em monitor e email.', icon: '📱' },
  { value: '/ebook', label: 'Ebook (Média)', dpi: '150 DPI', desc: 'Equilíbrio entre qualidade e tamanho. Bom para leitura.', icon: '📚' },
  { value: '/printer', label: 'Impressão (Alta)', dpi: '300 DPI', desc: 'Alta qualidade para impressoras caseiras ou escritório.', icon: '🖨️' },
  { value: '/prepress', label: 'Gráfica (Máxima)', dpi: '300 DPI', desc: 'Preserva cores e fontes para impressão profissional.', icon: '🎨' },
  { value: 'custom', label: 'Personalizado', dpi: 'Configurável', desc: 'Ajuste fino de resolução e qualidade.', icon: '⚙️' },
];

// Estado
const selectedFile = ref<File | null>(null);
const selectedPreset = ref<OptimizationPreset>('/ebook');
const isOptimizing = ref(false);
const isLoading = ref(false); // Para carregamento inicial do worker
const progress = ref({ current: 0, total: 0 });
const error = ref<string | null>(null);
const optimizedPdfUrl = ref<string | null>(null);
const optimizedSize = ref<number>(0);
const optimizationTime = ref<number>(0);

// Custom Settings State
const customSettings = ref({
  resolution: 150,
  grayscale: false,
  embedFonts: true,
  imageQuality: 'medium' as 'low' | 'medium' | 'high'
});

// Computed
const progressPercent = computed(() => {
  if (progress.value.total === 0) return 0;
  return Math.round((progress.value.current / progress.value.total) * 100);
});

const statusText = computed(() => {
  if (isLoading.value) return 'Preparando Ghostscript...';
  if (isOptimizing.value) {
    if (progress.value.total > 0) {
      return `Otimizando página ${progress.value.current} de ${progress.value.total}`;
    }
    return 'Otimizando PDF...';
  }
  return '';
});

const sizeReduction = computed(() => {
  if (!selectedFile.value || optimizedSize.value === 0) return 0;
  const original = selectedFile.value.size;
  const reduction = original - optimizedSize.value;
  return Math.round((reduction / original) * 100);
});

const formattedOptimizedSize = computed(() => {
  if (optimizedSize.value === 0) return '';
  if (optimizedSize.value < 1024) return `${(optimizedSize.value.toFixed(0))} B`;
  if (optimizedSize.value < 1024 * 1024) return `${(optimizedSize.value / 1024).toFixed(1)} KB`;
  return `${(optimizedSize.value / (1024 * 1024)).toFixed(1)} MB`;
});

// Handlers
function handleFileSelected(file: File) {
  selectedFile.value = file;
  error.value = null;
  optimizedPdfUrl.value = null;
  optimizedSize.value = 0;
  
  // Rastrear seleção
  AppEvents.pdfLoaded(file.name, file.size, 0); 
}

function clearFile() {
  selectedFile.value = null;
  error.value = null;
  optimizedPdfUrl.value = null;
  optimizedSize.value = 0;
}

async function handleOptimize() {
  if (!selectedFile.value) return;
  
  isOptimizing.value = true;
  error.value = null;
  progress.value = { current: 0, total: 0 };
  const startTime = Date.now();
  
  try {
    // Inicializar Worker se necessário
    if (!isWorkerReady()) {
      isLoading.value = true;
      await initGhostscriptWorker();
      isLoading.value = false;
    }

    const buffer = await selectedFile.value.arrayBuffer();
    const pdfData = new Uint8Array(buffer);
    
    // Rastrear início
    AppEvents.optimizationStarted(selectedPreset.value, selectedFile.value.size);

    // Executar otimização
    const settings = selectedPreset.value === 'custom' ? { ...customSettings.value } : selectedPreset.value;
    const result = await optimizePdf(pdfData, settings, (current, total) => {
      progress.value = { current, total };
    });

    // Processar resultado
    const optimizedBlobUrl = uint8ArrayToObjectUrl(result.pdfData, 'application/pdf');
    optimizedPdfUrl.value = optimizedBlobUrl;
    optimizedSize.value = result.pdfData.byteLength;
    optimizationTime.value = Date.now() - startTime;
    
    // Rastrear conclusão
    AppEvents.optimizationCompleted(
      selectedPreset.value, 
      optimizedSize.value, 
      optimizationTime.value,
      sizeReduction.value
    );
    
  } catch (err) {
    console.error('Erro na otimização:', err);
    error.value = err instanceof Error ? err.message : 'Erro desconhecido';
    AppEvents.errorOccurred('optimization', String(err));
  } finally {
    isOptimizing.value = false;
    isLoading.value = false;
  }
}

function handleDownload() {
  if (!optimizedPdfUrl.value || !selectedFile.value) return;
  
  const originalName = selectedFile.value.name;
  const nameWithoutExt = originalName.replace(/\.pdf$/i, '');
  const fileName = `otimizado-${nameWithoutExt}.pdf`;
  
  const a = document.createElement('a');
  a.href = optimizedPdfUrl.value;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Limpar URL após download para liberar memória
  // URL.revokeObjectURL(optimizedPdfUrl.value); // Comentado para permitir múltiplos downloads se necessário
}
</script>

<template>
  <div class="optimizer-view">
    <!-- Header -->
    <AppHeader
      title-prefix="Otimizar PDF"
      title-suffix="direto no navegador"
      :features="['⚡ Compressão Inteligente', '🔒 100% Privado', '📉 Redução de até 80%']"
    />

    <!-- Upload Section -->
    <FileUploader
      id="optimizer-upload"
      :selected-file="selectedFile"
      :is-loading="isLoading"
      :is-processing="isOptimizing"
      accept=".pdf"
      title="Otimizar PDF"
      description="Reduza o tamanho do seu PDF sem perder qualidade"
      @file-selected="handleFileSelected"
      @clear-file="clearFile"
    />

    <!-- Settings Panel -->
    <section v-if="selectedFile && !isOptimizing && !optimizedSize" class="settings-panel">
      <div class="setting-group">
        <label class="setting-label">
          <span class="label-icon">🎚️</span>
          Nível de Compressão
        </label>
        
        <div class="presets-grid">
          <button 
            v-for="preset in presets" 
            :key="preset.value"
            :class="['preset-card', { active: selectedPreset === preset.value }]"
            @click="selectedPreset = preset.value"
          >
            <div class="preset-icon">{{ preset.icon }}</div>
            <div class="preset-info">
              <div class="preset-header">
                <span class="preset-name">{{ preset.label }}</span>
                <span class="preset-dpi">{{ preset.dpi }}</span>
              </div>
              <p class="preset-desc">{{ preset.desc }}</p>
            </div>
            <div class="preset-check" v-if="selectedPreset === preset.value">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </button>
        </div>
      </div>

      <!-- Custom Settings Panel -->
      <div v-if="selectedPreset === 'custom'" class="custom-settings">
        <div class="setting-row">
          <label>Resolução (DPI)</label>
          <select v-model="customSettings.resolution">
            <option :value="72">72 DPI (Tela)</option>
            <option :value="96">96 DPI (Web)</option>
            <option :value="150">150 DPI (Ebook)</option>
            <option :value="200">200 DPI (Intermediário)</option>
            <option :value="250">250 DPI (Alto)</option>
            <option :value="300">300 DPI (Impressão)</option>
          </select>
        </div>

        <div class="setting-row">
          <label>Qualidade de Imagem</label>
          <select v-model="customSettings.imageQuality">
            <option value="low">Baixa (Menor tamanho)</option>
            <option value="medium">Média (Equilibrado)</option>
            <option value="high">Alta (Melhor qualidade)</option>
          </select>
        </div>

        <div class="setting-row checkbox">
          <label>
            <input type="checkbox" v-model="customSettings.grayscale">
            Converter para Escala de Cinza
          </label>
        </div>

        <div class="setting-row checkbox">
          <label>
            <input type="checkbox" v-model="customSettings.embedFonts">
            Incorporar Fontes (Recomendado)
          </label>
        </div>
      </div>

      <button class="action-btn" @click="handleOptimize">
        <span class="btn-glow"></span>
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none">
          <path d="M13 10V3L4 14H11V21L20 10H13Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        </svg>
        <span>Otimizar PDF Agora</span>
      </button>
    </section>

    <!-- Progress -->
    <ProcessingStatus
      :is-loading="isLoading"
      :is-processing="isOptimizing"
      :progress="progress"
      :status-text="statusText"
      :progress-percent="progressPercent"
      processing-title="Otimizando PDF"
    />

    <!-- Results -->
    <section v-if="optimizedSize > 0" class="results-panel">
      <div class="success-header">
        <div class="success-icon-wrapper">
          <span class="success-icon">✨</span>
        </div>
        <h2>PDF Otimizado com Sucesso!</h2>
        <p class="time-info">Concluído em {{ (optimizationTime / 1000).toFixed(1) }}s</p>
      </div>

      <div class="stats-card">
        <div class="stat-item">
          <span class="stat-label">Tamanho Original</span>
          <span class="stat-value">{{ (selectedFile!.size / 1024).toFixed(1) }} KB</span>
        </div>
        <div class="stat-arrow">→</div>
        <div class="stat-item highlight">
          <span class="stat-label">Tamanho Novo</span>
          <span class="stat-value">{{ formattedOptimizedSize }}</span>
        </div>
        <div class="stat-badge">
          -{{ sizeReduction }}%
        </div>
      </div>

      <button class="download-btn" @click="handleDownload">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 3V16M12 16L7 11M12 16L17 11M5 21H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Baixar PDF Otimizado</span>
      </button>
      
      <button class="reset-btn" @click="clearFile">
        Otimizar outro arquivo
      </button>
    </section>

    <!-- Error -->
    <section v-if="error" class="error-panel">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 7V13M12 16V16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <div class="error-content">
        <h4>Erro na Otimização</h4>
        <p>{{ error }}</p>
      </div>
      <button class="error-dismiss" @click="error = null">✕</button>
    </section>
  </div>
</template>

<style scoped>
.optimizer-view {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

/* Settings Panel */
.settings-panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  margin-top: 2rem;
  animation: slideUp 0.4s ease;
}

.setting-group {
  margin-bottom: 2rem;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.preset-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  position: relative;
}

.preset-card:hover {
  border-color: var(--border-hover);
  background: var(--bg-hover);
  transform: translateY(-2px);
}

.preset-card.active {
  border-color: var(--gs-cyan);
  background: rgba(16, 149, 194, 0.1);
  box-shadow: 0 0 0 1px var(--gs-cyan);
}

.preset-icon {
  font-size: 1.5rem;
  background: var(--bg-base);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.preset-info {
  flex: 1;
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.preset-name {
  font-weight: 600;
  color: var(--text-primary);
}

.preset-dpi {
  font-size: 0.75rem;
  color: var(--gs-cyan);
  background: rgba(16, 149, 194, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.preset-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.preset-check {
  position: absolute;
  top: 10px;
  right: 10px;
  color: var(--gs-cyan);
  width: 20px;
  height: 20px;
}

/* Action Button */
.action-btn {
  width: 100%;
  padding: 1.25rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
}

.action-btn:hover {
  border-color: var(--gs-cyan);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.btn-glow {
  position: absolute;
  inset: 0;
  background: var(--gradient);
  opacity: 0.1;
  transition: opacity 0.3s;
}

.action-btn:hover .btn-glow {
  opacity: 0.2;
}

.btn-icon {
  width: 24px;
  height: 24px;
}

/* Results Panel */
.results-panel {
  background: var(--bg-card);
  border: 1px solid var(--success);
  border-radius: var(--radius-lg);
  padding: 2.5rem;
  margin-top: 2rem;
  text-align: center;
  animation: slideUp 0.4s ease;
  box-shadow: 0 0 40px rgba(16, 185, 129, 0.1);
}

.success-header {
  margin-bottom: 2rem;
}

.success-icon-wrapper {
  width: 60px;
  height: 60px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.success-icon {
  font-size: 2rem;
}

.results-panel h2 {
  color: var(--success);
  margin-bottom: 0.5rem;
}

.time-info {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.stats-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  background: var(--bg-base);
  padding: 1.5rem;
  border-radius: var(--radius-md);
  margin-bottom: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-item.highlight .stat-value {
  color: var(--success);
}

.stat-arrow {
  color: var(--text-muted);
  font-size: 1.5rem;
}

.stat-badge {
  background: var(--success);
  color: #000;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.download-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--success);
  color: #000;
  border: none;
  padding: 1rem 2rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1rem;
}

.download-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.download-btn svg {
  width: 24px;
  height: 24px;
}

.reset-btn {
  display: block;
  margin: 0 auto;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: underline;
  padding: 0.5rem;
}

.reset-btn:hover {
  color: var(--text-primary);
}

/* Error Panel */
.error-panel {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--error);
  border-radius: var(--radius-md);
  padding: 1rem;
  margin-top: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  color: var(--error);
}

.error-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.error-content h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
}

.error-content p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.error-dismiss {
  background: transparent;
  border: none;
  color: currentColor;
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0.7;
}

.error-dismiss:hover {
  opacity: 1;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Custom Settings */
.custom-settings {
  background: var(--bg-base);
  padding: 1.5rem;
  border-radius: var(--radius-md);
  margin-top: 1.5rem;
  border: 1px solid var(--border);
}

.setting-row {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-row label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.setting-row select {
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 1rem;
}

.setting-row.checkbox label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary);
  cursor: pointer;
}

.setting-row.checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--gs-cyan);
}
</style>
