<script setup lang="ts">
import { ref, computed } from 'vue';
import JSZip from 'jszip';
import { 
  initGhostscriptWorker, 
  convertPdfWithWorker, 
  analyzePdf,
  uint8ArrayToObjectUrl,
  isWorkerReady 
} from '@/services/ghostscript/GhostscriptWorkerService';

// Estado
const isLoading = ref(false);
const isConverting = ref(false);
const progress = ref({ current: 0, total: 0 });
const error = ref<string | null>(null);
const selectedFile = ref<File | null>(null);
const resultImages = ref<string[]>([]);
const isDragging = ref(false);

// Opções de conversão
const dpi = ref<72 | 150 | 300 | 600>(150);
const grayscale = ref(false);

// Análise de páginas
const isAnalyzing = ref(false);
const analyzeProgress = ref({ current: 0, total: 0 });
const totalPages = ref(0);
const pageMode = ref<'all' | 'range'>('all');
const firstPage = ref(1);
const lastPage = ref(1);
const pdfDataCache = ref<Uint8Array | null>(null);

// Computed
const progressPercent = computed(() => {
  if (progress.value.total === 0) return 0;
  return Math.round((progress.value.current / progress.value.total) * 100);
});

const statusText = computed(() => {
  if (isLoading.value) return 'Carregando Ghostscript (~16MB)...';
  if (isConverting.value) {
    if (progress.value.total > 0) {
      return `Processando página ${progress.value.current} de ${progress.value.total}`;
    }
    return 'Iniciando conversão...';
  }
  return '';
});

const fileSizeFormatted = computed(() => {
  if (!selectedFile.value) return '';
  const size = selectedFile.value.size;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
});

// Handlers
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files && files[0] && files[0].type === 'application/pdf') {
    loadAndAnalyzeFile(files[0]);
  }
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    await loadAndAnalyzeFile(input.files[0]);
  }
}

async function loadAndAnalyzeFile(file: File) {
  selectedFile.value = file;
  resultImages.value = [];
  error.value = null;
  totalPages.value = 0;
  pageMode.value = 'all';
  
  try {
    // Inicializar Worker se necessário
    if (!isWorkerReady()) {
      isLoading.value = true;
      await initGhostscriptWorker();
      isLoading.value = false;
    }
    
    // Analisar PDF para obter número de páginas
    isAnalyzing.value = true;
    analyzeProgress.value = { current: 0, total: 0 };
    const buffer = await file.arrayBuffer();
    pdfDataCache.value = new Uint8Array(buffer);
    
    const result = await analyzePdf(pdfDataCache.value, (current, total) => {
      analyzeProgress.value = { current, total };
    });
    totalPages.value = result.pageCount;
    firstPage.value = 1;
    lastPage.value = result.pageCount;
    
  } catch (err) {
    console.error('Erro ao analisar PDF:', err);
    error.value = err instanceof Error ? err.message : 'Erro ao analisar PDF';
  } finally {
    isAnalyzing.value = false;
  }
}

async function handleConvert() {
  if (!selectedFile.value || !pdfDataCache.value) return;
  
  error.value = null;
  resultImages.value = [];
  progress.value = { current: 0, total: 0 };
  
  try {
    isConverting.value = true;
    
    // Determinar range de páginas
    const convertFirstPage = pageMode.value === 'range' ? firstPage.value : undefined;
    const convertLastPage = pageMode.value === 'range' ? lastPage.value : undefined;
    
    // Usar Worker para conversão (não bloqueia UI!)
    const result = await convertPdfWithWorker(pdfDataCache.value, {
      dpi: dpi.value,
      grayscale: grayscale.value,
      firstPage: convertFirstPage,
      lastPage: convertLastPage,
      onProgress: (current, total) => {
        progress.value = { current, total };
      },
    });
    
    resultImages.value = result.images.map(img => uint8ArrayToObjectUrl(img));
    
  } catch (err) {
    console.error('Erro na conversão:', err);
    error.value = err instanceof Error ? err.message : 'Erro desconhecido';
  } finally {
    isLoading.value = false;
    isConverting.value = false;
    progress.value = { current: 0, total: 0 };
  }
}

function handleDownloadSingle(url: string, index: number) {
  const a = document.createElement('a');
  a.href = url;
  a.download = `pagina-${index + 1}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const isZipping = ref(false);

async function handleDownloadAll() {
  if (resultImages.value.length === 0) return;
  
  isZipping.value = true;
  
  try {
    const zip = new JSZip();
    const folder = zip.folder('paginas');
    
    if (!folder) throw new Error('Erro ao criar pasta no ZIP');
    
    // Baixar cada imagem e adicionar ao ZIP
    for (let i = 0; i < resultImages.value.length; i++) {
      const url = resultImages.value[i];
      if (!url) continue;
      const response = await fetch(url);
      const blob = await response.blob();
      folder.file(`pagina-${(i + 1).toString().padStart(3, '0')}.png`, blob);
    }
    
    // Gerar ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Criar nome do arquivo baseado no PDF original
    const baseName = selectedFile.value?.name.replace('.pdf', '') || 'imagens';
    
    // Download do ZIP
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = `${baseName}-imagens.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    
  } catch (err) {
    console.error('Erro ao criar ZIP:', err);
    error.value = 'Erro ao criar arquivo ZIP';
  } finally {
    isZipping.value = false;
  }
}

function clearFile() {
  selectedFile.value = null;
  resultImages.value = [];
  error.value = null;
}
</script>

<template>
  <div class="app">
    <!-- Animated Background -->
    <div class="bg-effects">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>

    <!-- Header -->
    <header class="header">
      <div class="logo-wrapper">
        <img src="/ghostscript/Ghostscript.svg" alt="Ghostscript" class="logo" />
        <div class="badge-container">
          <span class="badge">WebAssembly</span>
          <span class="badge badge-secondary">16MB</span>
        </div>
      </div>
      <p class="tagline">
        <span class="highlight">PDF → Imagens</span> direto no navegador
      </p>
      <div class="features">
        <span class="feature">🔒 100% Privado</span>
        <span class="feature">🚀 Sem Limites</span>
        <span class="feature">📡 Funciona Offline</span>
      </div>
    </header>

    <main class="main">
      <!-- Upload Card -->
      <section 
        class="upload-card" 
        :class="{ dragging: isDragging, 'has-file': selectedFile }"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <input 
          type="file" 
          id="file-input"
          accept=".pdf" 
          @change="handleFileSelect"
          :disabled="isLoading || isConverting"
          class="file-input"
        />
        
        <div v-if="!selectedFile" class="upload-content">
          <div class="upload-icon-wrapper">
            <svg class="upload-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10V9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9V10C19.2091 10 21 11.7909 21 14C21 15.4806 20.1956 16.8084 19 17.5M7 10C4.79086 10 3 11.7909 3 14C3 15.4806 3.8044 16.8084 5 17.5M7 10C7.43285 10 7.84965 10.0688 8.24006 10.1959M12 12V21M12 12L15 15M12 12L9 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2 class="upload-title">Arraste seu PDF aqui</h2>
          <p class="upload-desc">ou clique para selecionar um arquivo</p>
          <label for="file-input" class="upload-btn">
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
          <button class="remove-btn" @click.stop="clearFile" title="Remover">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </section>

      <!-- Settings Panel -->
      <section v-if="selectedFile && !isConverting && !isLoading" class="settings-panel">
        <div class="setting-group">
          <label class="setting-label">
            <span class="label-icon">📐</span>
            Resolução de Saída
          </label>
          <div class="dpi-selector">
            <button 
              v-for="option in [{v: 72, label: '72 DPI', desc: 'Web'}, {v: 150, label: '150 DPI', desc: 'Normal'}, {v: 300, label: '300 DPI', desc: 'HD'}, {v: 600, label: '600 DPI', desc: 'Print'}]" 
              :key="option.v"
              :class="['dpi-option', { active: dpi === option.v }]"
              @click="dpi = option.v as 72 | 150 | 300 | 600"
            >
              <span class="dpi-value">{{ option.v }}</span>
              <span class="dpi-desc">{{ option.desc }}</span>
            </button>
          </div>
        </div>

        <div class="setting-group">
          <label class="toggle-wrapper" @click="grayscale = !grayscale">
            <div :class="['toggle-switch', { active: grayscale }]">
              <div class="toggle-knob"></div>
            </div>
            <span class="toggle-text">
              <span class="label-icon">🎨</span>
              Converter para Preto & Branco
            </span>
          </label>
        </div>

        <!-- Page Range Selector -->
        <div v-if="totalPages > 0" class="setting-group page-selector">
          <label class="setting-label">
            <span class="label-icon">📄</span>
            Páginas ({{ totalPages }} detectadas)
          </label>
          
          <div class="page-mode-selector">
            <button 
              :class="['mode-btn', { active: pageMode === 'all' }]"
              @click="pageMode = 'all'"
            >
              Todas
            </button>
            <button 
              :class="['mode-btn', { active: pageMode === 'range' }]"
              @click="pageMode = 'range'"
            >
              Intervalo
            </button>
          </div>
          
          <div v-if="pageMode === 'range'" class="range-inputs">
            <div class="range-field">
              <label>De:</label>
              <input 
                type="number" 
                v-model.number="firstPage" 
                :min="1" 
                :max="lastPage"
                class="page-input"
              />
            </div>
            <span class="range-separator">→</span>
            <div class="range-field">
              <label>Até:</label>
              <input 
                type="number" 
                v-model.number="lastPage" 
                :min="firstPage" 
                :max="totalPages"
                class="page-input"
              />
            </div>
            <span class="range-info">
              ({{ lastPage - firstPage + 1 }} página{{ lastPage - firstPage !== 0 ? 's' : '' }})
            </span>
          </div>
        </div>
        
        <!-- Analyzing indicator -->
        <div v-if="isAnalyzing" class="analyzing-indicator">
          <span class="analyzing-spinner"></span>
          <span v-if="analyzeProgress.total > 0">
            Analisando página {{ analyzeProgress.current }} de {{ analyzeProgress.total }}...
          </span>
          <span v-else>
            Iniciando análise...
          </span>
        </div>

        <button class="convert-btn" @click="handleConvert">
          <span class="btn-glow"></span>
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none">
            <path d="M13 10V3L4 14H11V21L20 10H13Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          </svg>
          <span>Converter Agora</span>
        </button>
      </section>

      <!-- Progress -->
      <section v-if="isLoading || isConverting" class="progress-panel">
        <div class="spinner-container">
          <div class="spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
        </div>
        <div class="progress-info">
          <h3 class="progress-title" v-if="isLoading">Carregando Ghostscript</h3>
          <h3 class="progress-title" v-else>Processando PDF</h3>
          <p class="progress-status">{{ statusText }}</p>
          
          <!-- Barra de progresso real-time -->
          <div v-if="isConverting && progress.total > 0" class="progress-bar-section">
            <div class="progress-bar-container">
              <div class="progress-bar" :style="{ width: `${progressPercent}%` }"></div>
            </div>
            <span class="progress-percent">{{ progressPercent }}%</span>
          </div>
          
          <p class="progress-hint" v-if="isConverting && progress.total === 0">
            ⏳ Analisando documento...
          </p>
          <p class="progress-hint" v-if="isLoading">
            📦 Baixando módulo WebAssembly (~16MB)...<br/>
            Isso só acontece na primeira vez.
          </p>
        </div>
      </section>

      <!-- Error -->
      <section v-if="error" class="error-panel">
        <svg class="error-icon" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 7V13M12 16V16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div class="error-content">
          <h4>Ops! Algo deu errado</h4>
          <p>{{ error }}</p>
        </div>
        <button class="error-dismiss" @click="error = null">✕</button>
      </section>

      <!-- Results -->
      <section v-if="resultImages.length > 0" class="results-panel">
        <div class="results-header">
          <div class="results-title">
            <span class="success-icon">✨</span>
            <h2>{{ resultImages.length }} Páginas Convertidas</h2>
          </div>
          <button class="download-all" @click="handleDownloadAll">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 3V16M12 16L7 11M12 16L17 11M5 21H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Baixar Todas</span>
          </button>
        </div>

        <div class="results-grid">
          <div 
            v-for="(img, index) in resultImages" 
            :key="index" 
            class="result-card"
          >
            <div class="card-image">
              <img :src="img" :alt="`Página ${index + 1}`" loading="lazy" />
            </div>
            <div class="card-footer">
              <span class="page-badge">Página {{ index + 1 }}</span>
              <button @click="handleDownloadSingle(img, index)" class="card-download" title="Baixar página">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 3V16M12 16L7 11M12 16L17 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <p>Processamento 100% local • Seus arquivos nunca saem do navegador</p>
        <p class="tech-stack">Vue.js + Ghostscript WebAssembly</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ========================================
   DESIGN SYSTEM - Ghostscript Premium UI
   ======================================== */

/* Theme Variables */
.app {
  /* Cores Ghostscript */
  --gs-cyan: #1095C2;
  --gs-cyan-light: #3BB4DE;
  --gs-cyan-dark: #0A7A9D;
  
  /* Base Colors */
  --bg-base: #0a0a0f;
  --bg-elevated: #12121a;
  --bg-card: #1a1a24;
  --bg-hover: #222230;
  
  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #9ca3af;
  --text-muted: #6b7280;
  
  /* Accents */
  --accent: var(--gs-cyan);
  --accent-light: var(--gs-cyan-light);
  --gradient: linear-gradient(135deg, var(--gs-cyan) 0%, #6366f1 50%, #8b5cf6 100%);
  --gradient-subtle: linear-gradient(135deg, rgba(16, 149, 194, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  
  /* Effects */
  --glow-cyan: 0 0 40px rgba(16, 149, 194, 0.4);
  --glow-purple: 0 0 40px rgba(139, 92, 246, 0.3);
  
  /* Feedback */
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
  
  /* Borders */
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(16, 149, 194, 0.5);
  
  /* Sizing */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
}

/* Base Layout */
.app {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* Animated Background Orbs */
.bg-effects {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.4;
  animation: float-orb 20s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: var(--gs-cyan);
  top: -200px;
  right: -200px;
  animation-delay: 0s;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: #8b5cf6;
  bottom: -150px;
  left: -150px;
  animation-delay: -7s;
}

.orb-3 {
  width: 400px;
  height: 400px;
  background: #6366f1;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -14s;
  opacity: 0.2;
}

@keyframes float-orb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* Header */
.header {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 4rem 2rem 3rem;
}

.logo-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.logo {
  height: 70px;
  width: auto;
  filter: brightness(0) invert(1) drop-shadow(0 0 30px rgba(16, 149, 194, 0.5));
  transition: all 0.4s ease;
}

.logo:hover {
  transform: scale(1.05);
  filter: brightness(0) invert(1) drop-shadow(0 0 50px rgba(16, 149, 194, 0.8));
}

.badge-container {
  display: flex;
  gap: 0.5rem;
}

.badge {
  background: var(--gradient);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.badge-secondary {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.tagline {
  font-size: 1.5rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.highlight {
  color: var(--gs-cyan-light);
  font-weight: 600;
}

.features {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.feature {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  background: var(--gradient-subtle);
  border-radius: 20px;
  border: 1px solid var(--border);
}

/* Main Content */
.main {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem 4rem;
}

/* Upload Card */
.upload-card {
  background: var(--bg-card);
  border: 2px dashed var(--border);
  border-radius: var(--radius-xl);
  padding: 3rem;
  text-align: center;
  position: relative;
  transition: all 0.4s ease;
  overflow: hidden;
}

.upload-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--gradient-subtle);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.upload-card:hover::before,
.upload-card.dragging::before {
  opacity: 1;
}

.upload-card:hover,
.upload-card.dragging {
  border-color: var(--accent);
  box-shadow: var(--glow-cyan);
}

.upload-card.has-file {
  border-style: solid;
  border-color: var(--accent);
  padding: 2rem;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.upload-content {
  position: relative;
  z-index: 1;
}

.upload-icon-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  background: var(--gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--glow-cyan);
  animation: pulse 2s ease-in-out infinite;
}

.upload-icon {
  width: 40px;
  height: 40px;
  color: white;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); box-shadow: var(--glow-cyan); }
  50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(16, 149, 194, 0.6); }
}

.upload-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.upload-desc {
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 1rem 2.5rem;
  background: var(--gradient);
  border-radius: var(--radius-md);
  font-weight: 600;
  color: white;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.3s ease;
  z-index: 3;
}

.upload-btn:hover {
  transform: translateY(-3px);
}

.btn-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transform: translateX(-100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  100% { transform: translateX(100%); }
}

.upload-hint {
  margin-top: 1.5rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* File Preview */
.file-preview {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  position: relative;
  z-index: 1;
}

.file-icon-wrapper {
  width: 60px;
  height: 60px;
  background: var(--gradient-subtle);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-icon {
  width: 32px;
  height: 32px;
  color: var(--gs-cyan-light);
}

.file-info {
  flex: 1;
  text-align: left;
}

.file-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.remove-btn {
  width: 40px;
  height: 40px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 3;
}

.remove-btn svg {
  width: 18px;
  height: 18px;
  color: var(--error);
}

.remove-btn:hover {
  background: var(--error);
  border-color: var(--error);
}

.remove-btn:hover svg {
  color: white;
}

/* Settings Panel */
.settings-panel {
  margin-top: 2rem;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 2rem;
  border: 1px solid var(--border);
}

.setting-group {
  margin-bottom: 2rem;
}

.setting-group:last-of-type {
  margin-bottom: 0;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-weight: 500;
  margin-bottom: 1rem;
}

.label-icon {
  font-size: 1.1rem;
}

.dpi-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.dpi-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: var(--bg-hover);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.3s ease;
}

.dpi-option:hover {
  border-color: var(--accent);
  background: rgba(16, 149, 194, 0.1);
}

.dpi-option.active {
  border-color: var(--accent);
  background: var(--gradient);
  box-shadow: var(--glow-cyan);
}

.dpi-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.dpi-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.dpi-option.active .dpi-desc {
  color: rgba(255, 255, 255, 0.8);
}

/* Toggle */
.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  padding: 1rem;
  background: var(--bg-hover);
  border-radius: var(--radius-md);
  transition: background 0.3s ease;
}

.toggle-wrapper:hover {
  background: rgba(16, 149, 194, 0.1);
}

.toggle-switch {
  width: 52px;
  height: 28px;
  background: var(--bg-base);
  border-radius: 14px;
  position: relative;
  transition: background 0.3s ease;
}

.toggle-switch.active {
  background: var(--gradient);
}

.toggle-knob {
  position: absolute;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.toggle-switch.active .toggle-knob {
  transform: translateX(24px);
}

.toggle-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary);
}

/* Page Range Selector */
.page-selector {
  background: var(--bg-hover);
  padding: 1.25rem;
  border-radius: var(--radius-md);
}

.page-mode-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.mode-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  border-color: var(--accent);
}

.mode-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.range-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.range-field label {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.page-input {
  width: 70px;
  padding: 0.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 1rem;
  text-align: center;
}

.page-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(16, 149, 194, 0.2);
}

.range-separator {
  color: var(--accent);
  font-size: 1.2rem;
}

.range-info {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-left: auto;
}

.analyzing-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--gs-cyan);
  font-size: 0.9rem;
  padding: 1rem;
  background: rgba(16, 149, 194, 0.1);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(16, 149, 194, 0.3);
}

.analyzing-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid transparent;
  border-top-color: var(--gs-cyan);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Convert Button */
.convert-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.25rem 2rem;
  background: var(--gradient);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  margin-top: 2rem;
  transition: all 0.3s ease;
}

.convert-btn:hover {
  transform: translateY(-3px);
  box-shadow: var(--glow-cyan), var(--glow-purple);
}

.convert-btn .btn-icon {
  width: 24px;
  height: 24px;
}

/* Progress Panel */
.progress-panel {
  margin-top: 2rem;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 3rem 2rem;
  border: 1px solid var(--accent);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: var(--glow-cyan);
}

.spinner-container {
  margin-bottom: 2rem;
}

.spinner {
  position: relative;
  width: 100px;
  height: 100px;
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border: 4px solid transparent;
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
}

.spinner-ring:nth-child(1) {
  border-top-color: var(--gs-cyan);
  animation-delay: 0s;
}

.spinner-ring:nth-child(2) {
  inset: 10px;
  border-right-color: #8b5cf6;
  animation-delay: -0.5s;
  animation-direction: reverse;
}

.spinner-ring:nth-child(3) {
  inset: 20px;
  border-bottom-color: #6366f1;
  animation-delay: -1s;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-info {
  text-align: center;
}

.progress-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.progress-status {
  color: var(--text-primary);
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.progress-hint {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
}

.progress-bar-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  width: 100%;
  max-width: 400px;
}

.progress-bar-container {
  flex: 1;
  height: 8px;
  background: var(--bg-hover);
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
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--gs-cyan-light);
  min-width: 50px;
}

.progress-dots {
  display: flex;
  gap: 0.5rem;
  margin-top: 2rem;
}

.dot {
  width: 10px;
  height: 10px;
  background: var(--accent);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
.dot:nth-child(3) { animation-delay: 0s; }

@keyframes bounce {
  0%, 80%, 100% { 
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% { 
    transform: scale(1);
    opacity: 1;
  }
}

/* Error Panel */
.error-panel {
  margin-top: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
}

.error-icon {
  width: 40px;
  height: 40px;
  color: var(--error);
  flex-shrink: 0;
}

.error-content {
  flex: 1;
}

.error-content h4 {
  color: var(--error);
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.error-content p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.error-dismiss {
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1.1rem;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.error-dismiss:hover {
  background: rgba(239, 68, 68, 0.2);
  color: var(--error);
}

/* Results Panel */
.results-panel {
  margin-top: 3rem;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.results-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.success-icon {
  font-size: 1.5rem;
}

.results-title h2 {
  font-size: 1.5rem;
  font-weight: 700;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.download-all {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--success);
  border: none;
  border-radius: var(--radius-sm);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.download-all svg {
  width: 20px;
  height: 20px;
}

.download-all:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.result-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
  transition: all 0.3s ease;
}

.result-card:hover {
  transform: translateY(-5px);
  border-color: var(--accent);
  box-shadow: var(--glow-cyan);
}

.card-image {
  aspect-ratio: 3/4;
  overflow: hidden;
  background: var(--bg-hover);
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.result-card:hover .card-image img {
  transform: scale(1.05);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
}

.page-badge {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.card-download {
  width: 36px;
  height: 36px;
  background: var(--gradient-subtle);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gs-cyan-light);
  transition: all 0.3s ease;
}

.card-download svg {
  width: 18px;
  height: 18px;
}

.card-download:hover {
  background: var(--gradient);
  color: white;
  transform: scale(1.1);
}

/* Footer */
.footer {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 3rem 2rem;
  border-top: 1px solid var(--border);
  margin-top: 4rem;
}

.footer-content p {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.tech-stack {
  margin-top: 0.5rem;
  color: var(--text-muted);
  opacity: 0.5;
  font-size: 0.8rem !important;
}

/* Responsive */
@media (max-width: 640px) {
  .header {
    padding: 3rem 1.5rem 2rem;
  }
  
  .logo {
    height: 50px;
  }
  
  .tagline {
    font-size: 1.25rem;
  }
  
  .features {
    gap: 0.75rem;
  }
  
  .feature {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }
  
  .main {
    padding: 0 1rem 3rem;
  }
  
  .upload-card {
    padding: 2rem 1.5rem;
  }
  
  .dpi-selector {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .results-header {
    flex-direction: column;
    text-align: center;
  }
}
</style>
