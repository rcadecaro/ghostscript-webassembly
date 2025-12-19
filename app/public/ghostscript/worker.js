/**
 * Ghostscript Web Worker (Classic Worker)
 * 
 * Este arquivo é carregado como Worker clássico para suportar importScripts.
 * Processa PDFs em background sem bloquear a thread principal.
 */

// Estado do módulo
let gsModule = null;
let detectedTotalPages = 0;

// Processar output do Ghostscript para progresso
function handleGsOutput(text) {
  // Detectar total de páginas
  const pagesMatch = text.match(/Processing pages? (\d+) through (\d+)/i);
  if (pagesMatch && pagesMatch[2]) {
    detectedTotalPages = parseInt(pagesMatch[2], 10);
    self.postMessage({ 
      type: 'progress', 
      payload: { current: 0, total: detectedTotalPages }
    });
  }
  
  // Detectar página atual
  const pageMatch = text.match(/^Page (\d+)$/i);
  if (pageMatch && pageMatch[1]) {
    const currentPage = parseInt(pageMatch[1], 10);
    self.postMessage({ 
      type: 'progress', 
      payload: { current: currentPage, total: detectedTotalPages }
    });
  }
}

// Carregar Ghostscript dentro do Worker
async function initGhostscript() {
  try {
    // Em workers clássicos, importScripts funciona
    importScripts('/ghostscript/gs.js');
    
    const factory = self.Module;
    
    if (typeof factory !== 'function') {
      throw new Error('Module não é uma função');
    }
    
    gsModule = await factory({
      locateFile: (path) => `/ghostscript/${path}`,
      print: (text) => {
        handleGsOutput(text);
      },
      printErr: (text) => {
        console.error('[GS Worker Error]', text);
      },
    });
    
    self.postMessage({ type: 'ready' });
    console.log('[GS Worker] Módulo inicializado!');
    
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      payload: { error: error.message || 'Erro ao inicializar' }
    });
  }
}

// Converter PDF para imagens
async function convertPdf(pdfData, dpi, grayscale) {
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
      payload: { images }
    });
    
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      payload: { error: error.message || 'Erro na conversão' }
    });
  }
}

// Handler de mensagens
self.onmessage = async (event) => {
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
