/**
 * GhostscriptWorkerService
 * 
 * Serviço que gerencia o Web Worker para processamento de PDFs
 * Permite conversão em background sem bloquear a UI
 * 
 * NOTA: Usa Worker clássico (não-módulo) para suportar importScripts
 * que é necessário para carregar o gs.js do Emscripten
 */

export interface ConvertOptions {
  dpi: 72 | 150 | 300 | 600;
  grayscale?: boolean;
  onProgress?: (current: number, total: number) => void;
}

export interface ConvertResult {
  images: Uint8Array[];
  totalPages: number;
}

// Worker instance
let worker: Worker | null = null;
let isInitialized = false;
let isInitializing = false;

// Callbacks pendentes
let initResolve: (() => void) | null = null;
let initReject: ((error: Error) => void) | null = null;
let convertResolve: ((result: ConvertResult) => void) | null = null;
let convertReject: ((error: Error) => void) | null = null;
let progressCallback: ((current: number, total: number) => void) | null = null;

/**
 * Handler de mensagens do Worker
 */
function handleWorkerMessage(event: MessageEvent) {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'ready':
      isInitialized = true;
      isInitializing = false;
      console.log('[GS Service] Worker pronto!');
      if (initResolve) {
        initResolve();
        initResolve = null;
      }
      break;
      
    case 'progress':
      if (progressCallback && payload) {
        progressCallback(payload.current || 0, payload.total || 0);
      }
      break;
      
    case 'complete':
      console.log('[GS Service] Conversão concluída!');
      if (convertResolve && payload?.images) {
        convertResolve({
          images: payload.images,
          totalPages: payload.images.length,
        });
        convertResolve = null;
        progressCallback = null;
      }
      break;
      
    case 'error':
      console.error('[GS Service] Erro:', payload?.error);
      const error = new Error(payload?.error || 'Erro desconhecido');
      
      if (initReject) {
        initReject(error);
        initReject = null;
      }
      if (convertReject) {
        convertReject(error);
        convertReject = null;
        progressCallback = null;
      }
      break;
  }
}

/**
 * Inicializa o Web Worker com Ghostscript
 */
export async function initGhostscriptWorker(): Promise<void> {
  if (isInitialized) return;
  
  if (isInitializing) {
    // Aguardar inicialização em andamento
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (isInitialized) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
  
  isInitializing = true;
  
  return new Promise((resolve, reject) => {
    initResolve = resolve;
    initReject = reject;
    
    // Usar Worker clássico do diretório public
    // Isso é necessário porque importScripts não funciona em module workers
    worker = new Worker('/ghostscript/worker.js');
    
    // Handler de mensagens
    worker.onmessage = handleWorkerMessage;
    
    worker.onerror = (error) => {
      console.error('[GS Worker] Error:', error);
      isInitializing = false;
      if (initReject) {
        initReject(new Error(error.message));
        initReject = null;
      }
    };
    
    // Enviar comando de inicialização
    worker.postMessage({ type: 'init' });
  });
}

/**
 * Verifica se o Worker está pronto
 */
export function isWorkerReady(): boolean {
  return isInitialized;
}

/**
 * Converte PDF para imagens usando o Worker
 */
export async function convertPdfWithWorker(
  pdfData: Uint8Array,
  options: ConvertOptions
): Promise<ConvertResult> {
  // Inicializar se necessário
  if (!isInitialized) {
    await initGhostscriptWorker();
  }
  
  if (!worker) {
    throw new Error('Worker não disponível');
  }
  
  return new Promise((resolve, reject) => {
    convertResolve = resolve;
    convertReject = reject;
    progressCallback = options.onProgress || null;
    
    // Enviar PDF para conversão
    worker!.postMessage({
      type: 'convert',
      payload: {
        pdfData,
        dpi: options.dpi,
        grayscale: options.grayscale ?? false,
      },
    });
  });
}

/**
 * Converte Uint8Array para Object URL
 */
export function uint8ArrayToObjectUrl(data: Uint8Array, mimeType = 'image/png'): string {
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Termina o Worker (libera recursos)
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    isInitialized = false;
    isInitializing = false;
  }
}
