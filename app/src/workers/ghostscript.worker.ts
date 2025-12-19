/**
 * Ghostscript Web Worker
 * 
 * Processa PDFs em background sem bloquear a thread principal
 */

// Tipagem para mensagens
interface WorkerMessage {
  type: 'init' | 'convert';
  payload?: {
    pdfData?: Uint8Array;
    dpi?: number;
    grayscale?: boolean;
  };
}

interface WorkerResponse {
  type: 'ready' | 'progress' | 'complete' | 'error';
  payload?: {
    current?: number;
    total?: number;
    images?: Uint8Array[];
    error?: string;
  };
}

// Estado do módulo
let gsModule: any = null;

// Função para enviar mensagens para a thread principal
function postResponse(response: WorkerResponse) {
  self.postMessage(response);
}

// Variável para rastrear total de páginas
let detectedTotalPages = 0;

// Processar output do Ghostscript para progresso
function handleGsOutput(text: string) {
  // Detectar total de páginas
  const pagesMatch = text.match(/Processing pages? (\d+) through (\d+)/i);
  if (pagesMatch && pagesMatch[2]) {
    detectedTotalPages = parseInt(pagesMatch[2], 10);
    postResponse({ 
      type: 'progress', 
      payload: { current: 0, total: detectedTotalPages }
    });
  }
  
  // Detectar página atual
  const pageMatch = text.match(/^Page (\d+)$/i);
  if (pageMatch && pageMatch[1]) {
    const currentPage = parseInt(pageMatch[1], 10);
    postResponse({ 
      type: 'progress', 
      payload: { current: currentPage, total: detectedTotalPages }
    });
  }
}

// Carregar Ghostscript dentro do Worker
async function initGhostscript() {
  try {
    // Importar o script do Ghostscript
    // @ts-expect-error - importScripts é global em Web Workers
    importScripts('/ghostscript/gs.js');
    
    // @ts-expect-error - Module é global após importScripts
    const factory = self.Module;
    
    if (typeof factory !== 'function') {
      throw new Error('Module não é uma função');
    }
    
    gsModule = await factory({
      locateFile: (path: string) => `/ghostscript/${path}`,
      print: (text: string) => {
        // Capturar mensagens de progresso
        handleGsOutput(text);
      },
      printErr: (text: string) => {
        console.error('[GS Worker Error]', text);
      },
    });
    
    postResponse({ type: 'ready' });
    console.log('[GS Worker] Módulo inicializado!');
    
  } catch (error) {
    postResponse({ 
      type: 'error', 
      payload: { error: error instanceof Error ? error.message : 'Erro ao inicializar' }
    });
  }
}

// Converter PDF para imagens
async function convertPdf(pdfData: Uint8Array, dpi: number, grayscale: boolean) {
  if (!gsModule) {
    postResponse({ 
      type: 'error', 
      payload: { error: 'Módulo não inicializado' }
    });
    return;
  }
  
  try {
    detectedTotalPages = 0;
    
    // Criar diretórios
    try { gsModule.FS.mkdir('/tmp'); } catch { /* já existe */ }
    try { gsModule.FS.mkdir('/tmp/output'); } catch { /* já existe */ }
    
    // Escrever PDF de entrada
    gsModule.FS.writeFile('/tmp/input.pdf', pdfData);
    
    // Montar argumentos
    const device = grayscale ? 'pnggray' : 'png16m';
    const args = [
      '-dNOPAUSE',
      '-dBATCH',
      '-dSAFER',
      `-sDEVICE=${device}`,
      `-r${dpi}`,
      '-dTextAlphaBits=4',
      '-dGraphicsAlphaBits=4',
      '-sOutputFile=/tmp/output/page-%d.png',
      '/tmp/input.pdf',
    ];
    
    // Executar conversão
    const exitCode = gsModule.callMain(args);
    
    if (exitCode !== 0) {
      throw new Error(`Ghostscript retornou código ${exitCode}`);
    }
    
    // Ler arquivos de saída
    const files = gsModule.FS.readdir('/tmp/output')
      .filter((f: string) => f.startsWith('page-') && f.endsWith('.png'))
      .sort((a: string, b: string) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
    
    const images = files.map((f: string) => {
      const data = gsModule.FS.readFile(`/tmp/output/${f}`);
      // Criar cópia do array para transferir
      return new Uint8Array(data);
    });
    
    // Limpar arquivos temporários
    files.forEach((f: string) => {
      try { gsModule.FS.unlink(`/tmp/output/${f}`); } catch { /* ignore */ }
    });
    try { gsModule.FS.unlink('/tmp/input.pdf'); } catch { /* ignore */ }
    
    // Enviar resultado
    postResponse({ 
      type: 'complete', 
      payload: { images }
    });
    
  } catch (error) {
    postResponse({ 
      type: 'error', 
      payload: { error: error instanceof Error ? error.message : 'Erro na conversão' }
    });
  }
}

// Handler de mensagens
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'init':
      await initGhostscript();
      break;
      
    case 'convert':
      if (payload?.pdfData) {
        await convertPdf(
          payload.pdfData, 
          payload.dpi || 150, 
          payload.grayscale ?? false
        );
      }
      break;
  }
};

// Exportar para TypeScript
export {};
