/**
 * GhostscriptService
 * 
 * Serviço para carregar e executar Ghostscript WebAssembly
 * Converte PDFs para imagens usando o motor Ghostscript
 */

import type { 
  GhostscriptModule, 
  ConvertToImageOptions, 
  ConversionResult 
} from '@/types/ghostscript';

let gsModule: GhostscriptModule | null = null;
let isLoading = false;
let loadPromise: Promise<GhostscriptModule> | null = null;

/**
 * Carrega o módulo Ghostscript WASM
 * Usa carregamento via script tag para bypass do bundler
 */
export async function initGhostscript(): Promise<GhostscriptModule> {
  // Retorna módulo já carregado
  if (gsModule) return gsModule;
  
  // Aguarda carregamento em andamento
  if (isLoading && loadPromise) return loadPromise;
  
  isLoading = true;
  
  loadPromise = new Promise((resolve, reject) => {
    // Criar script tag dinâmico
    const script = document.createElement('script');
    script.src = '/ghostscript/gs.js';
    
    script.onload = async () => {
      console.log('[GS] Script carregado, inicializando módulo...');
      
      try {
        const factory = window.Module;
        
        if (typeof factory !== 'function') {
          throw new Error('Module não é uma função - modo MODULARIZE incorreto');
        }
        
        // Chamar factory com configuração
        const module = await factory({
          locateFile: (path: string) => `/ghostscript/${path}`,
          print: (text: string) => console.log('[GS]', text),
          printErr: (text: string) => console.error('[GS Error]', text),
        });
        
        console.log('[GS] Módulo inicializado com sucesso!');
        gsModule = module;
        resolve(module);
      } catch (err) {
        console.error('[GS] Erro ao inicializar:', err);
        reject(err);
      }
    };
    
    script.onerror = () => {
      reject(new Error('Falha ao carregar gs.js'));
    };
    
    document.head.appendChild(script);
  });
  
  return loadPromise;
}

/**
 * Verifica se o módulo está carregado
 */
export function isGhostscriptReady(): boolean {
  return gsModule !== null;
}

/**
 * Converte PDF para imagens PNG
 */
export async function convertPdfToImages(
  pdfData: Uint8Array,
  options: ConvertToImageOptions
): Promise<ConversionResult> {
  const gs = await initGhostscript();
  
  console.log(`[GS] Iniciando conversão: ${options.dpi} DPI, grayscale: ${options.grayscale ?? false}`);
  
  // Criar diretórios
  try { gs.FS.mkdir('/tmp'); } catch { /* já existe */ }
  try { gs.FS.mkdir('/tmp/output'); } catch { /* já existe */ }
  
  // Escrever PDF de entrada
  gs.FS.writeFile('/tmp/input.pdf', pdfData);
  
  // Montar argumentos
  const device = options.grayscale ? 'pnggray' : 'png16m';
  const args = [
    '-dNOPAUSE',
    '-dBATCH',
    '-dSAFER',
    `-sDEVICE=${device}`,
    `-r${options.dpi}`,
    '-dTextAlphaBits=4',
    '-dGraphicsAlphaBits=4',
    '-sOutputFile=/tmp/output/page-%d.png',
    '/tmp/input.pdf',
  ];
  
  // Interceptar console.log para progresso
  let detectedTotalPages = 0;
  const originalLog = console.log;
  
  console.log = (...logArgs: unknown[]) => {
    const text = logArgs.join(' ');
    
    // Detectar total de páginas
    const pagesMatch = text.match(/Processing pages? (\d+) through (\d+)/i);
    if (pagesMatch && pagesMatch[2]) {
      detectedTotalPages = parseInt(pagesMatch[2], 10);
      options.onProgress?.(0, detectedTotalPages);
    }
    
    // Detectar página atual
    const pageMatch = text.match(/^Page (\d+)$/i);
    if (pageMatch && pageMatch[1]) {
      const currentPage = parseInt(pageMatch[1], 10);
      options.onProgress?.(currentPage, detectedTotalPages);
    }
    
    originalLog.apply(console, logArgs);
  };
  
  // Executar conversão
  let exitCode: number;
  try {
    exitCode = gs.callMain(args);
  } finally {
    console.log = originalLog;
  }
  
  if (exitCode !== 0) {
    throw new Error(`Ghostscript retornou código ${exitCode}`);
  }
  
  // Ler arquivos de saída
  const files = gs.FS.readdir('/tmp/output')
    .filter((f: string) => f.startsWith('page-') && f.endsWith('.png'))
    .sort((a: string, b: string) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });
  
  const images = files.map((f: string) => gs.FS.readFile(`/tmp/output/${f}`));
  
  // Limpar arquivos temporários
  files.forEach((f: string) => {
    try { gs.FS.unlink(`/tmp/output/${f}`); } catch { /* ignore */ }
  });
  try { gs.FS.unlink('/tmp/input.pdf'); } catch { /* ignore */ }
  
  console.log(`[GS] Conversão concluída: ${images.length} páginas`);
  
  return {
    images,
    totalPages: images.length,
  };
}

/**
 * Converte Uint8Array para Data URL
 */
export function uint8ArrayToDataUrl(data: Uint8Array, mimeType = 'image/png'): string {
  // Criar cópia do buffer como ArrayBuffer puro (evita problema com SharedArrayBuffer)
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: mimeType });
  return URL.createObjectURL(blob);
}
