/**
 * Ghostscript Web Worker (Classic Worker)
 * 
 * Este arquivo é carregado como Worker clássico para suportar importScripts.
 * Processa PDFs em background sem bloquear a thread principal.
 * 
 * IMPORTANTE: O gs.js usa console.log internamente, ignorando callbacks.
 * Por isso interceptamos console.log ANTES de importar o gs.js.
 */

// Estado do módulo
let gsModule = null;
let detectedTotalPages = 0;
let isAnalyzing = false;
let isOptimizing = false;
let analyzedPageCount = 0;

// Guardar console.log original
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Handler de output do Ghostscript
function handleGsOutput(text) {
  // Detectar total de páginas - "Processing pages X through Y"
  const pagesMatch = text.match(/Processing pages? (\d+) through (\d+)/i);
  if (pagesMatch && pagesMatch[2]) {
    const count = parseInt(pagesMatch[2], 10);
    detectedTotalPages = count;
    
    if (isAnalyzing) {
      analyzedPageCount = count;
      // Enviar total detectado durante análise
      self.postMessage({ 
        type: 'analyze_progress', 
        payload: { current: 0, total: count }
      });
    } else {
      self.postMessage({ 
        type: 'progress', 
        payload: { current: 0, total: count }
      });
    }
  }
  
  // Detectar página atual
  const pageMatch = text.match(/^Page (\d+)$/i);
  if (pageMatch && pageMatch[1]) {
    const currentPage = parseInt(pageMatch[1], 10);
    
    if (isAnalyzing) {
      // Enviar progresso durante análise
      self.postMessage({ 
        type: 'analyze_progress', 
        payload: { current: currentPage, total: detectedTotalPages }
      });
    } else if (isOptimizing) {
      // Enviar progresso durante otimização
      self.postMessage({ 
        type: 'optimize_progress', 
        payload: { current: currentPage, total: detectedTotalPages }
      });
    } else {
      self.postMessage({ 
        type: 'progress', 
        payload: { current: currentPage, total: detectedTotalPages }
      });
    }
  }
  
  // Detectar número direto (do pdfpagecount)
  const numMatch = text.trim().match(/^(\d+)$/);
  if (numMatch && isAnalyzing) {
    const num = parseInt(numMatch[1], 10);
    if (num > 0) {
      analyzedPageCount = num;
    }
  }
}

// INTERCEPTAR console.log ANTES de importar gs.js
console.log = (...args) => {
  const text = args.join(' ');
  
  // Processar output do GS
  handleGsOutput(text);
  
  // Também logar no console real (para debug)
  originalConsoleLog.apply(console, ['[GS]', ...args]);
};

console.error = (...args) => {
  originalConsoleError.apply(console, ['[GS Error]', ...args]);
};

// Carregar Ghostscript dentro do Worker
async function initGhostscript() {
  try {
    // Importar gs.js - agora console.log já está interceptado
    importScripts('/ghostscript/gs.js');
    
    const factory = self.Module;
    
    if (typeof factory !== 'function') {
      throw new Error('Module não é uma função');
    }
    
    gsModule = await factory({
      locateFile: (path) => `/ghostscript/${path}`,
    });
    
    self.postMessage({ type: 'ready' });
    originalConsoleLog('[GS Worker] Módulo inicializado!');
    
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      payload: { error: error.message || 'Erro ao inicializar' }
    });
  }
}

// Analisar PDF para obter metadados (número de páginas)
async function analyzePdf(pdfData) {
  if (!gsModule) {
    self.postMessage({ 
      type: 'error', 
      payload: { error: 'Módulo não inicializado' }
    });
    return;
  }
  
  try {
    isAnalyzing = true;
    analyzedPageCount = 0;
    
    // Criar diretórios
    try { gsModule.FS.mkdir('/tmp'); } catch (e) { /* já existe */ }
    
    // Escrever PDF de entrada
    gsModule.FS.writeFile('/tmp/analyze.pdf', pdfData);
    
    // Usar nullpage device - dispara "Processing pages 1 through X"
    gsModule.callMain([
      '-dNOPAUSE', 
      '-dBATCH', 
      '-dSAFER',
      '-sDEVICE=nullpage',
      '/tmp/analyze.pdf'
    ]);
    
    // Limpar
    try { gsModule.FS.unlink('/tmp/analyze.pdf'); } catch (e) { /* ignore */ }
    
    isAnalyzing = false;
    
    originalConsoleLog('[GS Worker] Análise concluída:', analyzedPageCount, 'páginas');
    
    self.postMessage({ 
      type: 'analyzed', 
      payload: { pageCount: analyzedPageCount }
    });
    
  } catch (error) {
    isAnalyzing = false;
    self.postMessage({ 
      type: 'error', 
      payload: { error: error.message || 'Erro ao analisar PDF' }
    });
  }
}

// Converter PDF para imagens com suporte a range de páginas
async function convertPdf(pdfData, dpi, grayscale, firstPage, lastPage) {
  if (!gsModule) {
    self.postMessage({ 
      type: 'error', 
      payload: { error: 'Módulo não inicializado' }
    });
    return;
  }
  
  try {
    detectedTotalPages = 0;
    
    // Criar diretórios
    try { gsModule.FS.mkdir('/tmp'); } catch (e) { /* já existe */ }
    try { gsModule.FS.mkdir('/tmp/output'); } catch (e) { /* já existe */ }
    
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
    ];
    
    // Adicionar range de páginas se especificado
    if (firstPage && firstPage > 0) {
      args.push(`-dFirstPage=${firstPage}`);
    }
    if (lastPage && lastPage > 0) {
      args.push(`-dLastPage=${lastPage}`);
    }
    
    args.push('-sOutputFile=/tmp/output/page-%d.png');
    args.push('/tmp/input.pdf');
    
    // Executar conversão
    const exitCode = gsModule.callMain(args);
    
    if (exitCode !== 0) {
      throw new Error(`Ghostscript retornou código ${exitCode}`);
    }
    
    // Ler arquivos de saída
    const files = gsModule.FS.readdir('/tmp/output')
      .filter((f) => f.startsWith('page-') && f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
    
    const images = files.map((f) => {
      const data = gsModule.FS.readFile(`/tmp/output/${f}`);
      return new Uint8Array(data);
    });
    
    // Limpar arquivos temporários
    files.forEach((f) => {
      try { gsModule.FS.unlink(`/tmp/output/${f}`); } catch (e) { /* ignore */ }
    });
    try { gsModule.FS.unlink('/tmp/input.pdf'); } catch (e) { /* ignore */ }
    
    // Enviar resultado
    self.postMessage({ 
      type: 'complete', 
      payload: { 
        images,
        firstPage: firstPage || 1,
        lastPage: lastPage || images.length
      }
    });
    
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      payload: { error: error.message || 'Erro na conversão' }
    });
  }
}

// Otimizar PDF usando pdfwrite
async function optimizePdf(pdfData, settings) {
  if (!gsModule) {
    self.postMessage({ type: 'error', payload: { error: 'Módulo não inicializado' } });
    return;
  }

  try {
    // Criar diretórios
    try { gsModule.FS.mkdir('/tmp'); } catch (e) { /* já existe */ }

    // Escrever PDF de entrada
    gsModule.FS.writeFile('/tmp/input.pdf', pdfData);
    
    isOptimizing = true;
    detectedTotalPages = 0; // Resetar contagem

    // Argumentos base
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=${settings || '/ebook'}`,
      '-dNOPAUSE',
      `-dPDFSETTINGS=${settings || '/ebook'}`,
      '-dNOPAUSE',
      // '-dQUIET', // Removido para permitir logs de progresso
      '-dBATCH',
      '-sOutputFile=/tmp/output.pdf',
      '/tmp/input.pdf'
    ];

    // Executar
    const exitCode = gsModule.callMain(args);

    if (exitCode !== 0) {
      throw new Error(`Ghostscript retornou código ${exitCode}`);
    }

    // Ler resultado
    const optimizedData = gsModule.FS.readFile('/tmp/output.pdf');
    
    // Limpar
    try { gsModule.FS.unlink('/tmp/input.pdf'); } catch (e) { /* ignore */ }
    try { gsModule.FS.unlink('/tmp/output.pdf'); } catch (e) { /* ignore */ }

    // Enviar sucesso
    // Enviar sucesso
    self.postMessage({
      type: 'optimized',
      payload: { pdfData: new Uint8Array(optimizedData) }
    });
    
    isOptimizing = false;

  } catch (error) {
    self.postMessage({
      type: 'error',
      payload: { error: error.message || 'Erro na otimização' }
    });
    isOptimizing = false;
  }
}

// Handler de mensagens
self.onmessage = async (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'init':
      await initGhostscript();
      break;
      
    case 'analyze':
      if (payload?.pdfData) {
        await analyzePdf(payload.pdfData);
      }
      break;
      
    case 'convert':
      if (payload?.pdfData) {
        await convertPdf(
          payload.pdfData, 
          payload.dpi || 150, 
          payload.grayscale ?? false,
          payload.firstPage,
          payload.lastPage
        );
      }
      break;

    case 'optimize':
      if (payload?.pdfData) {
        await optimizePdf(payload.pdfData, payload.settings);
      }
      break;
  }
};
