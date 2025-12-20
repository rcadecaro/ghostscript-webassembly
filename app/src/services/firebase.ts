/**
 * Firebase Configuration & Analytics
 * 
 * Serviço para rastrear uso da aplicação via Google Analytics
 */

import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, isSupported } from 'firebase/analytics';
import type { Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCc8ED1PNrEzC1xFamseTTx4ZfXFdMkI0I",
  authDomain: "ghostscript-webassembly.firebaseapp.com",
  projectId: "ghostscript-webassembly",
  storageBucket: "ghostscript-webassembly.firebasestorage.app",
  messagingSenderId: "543110998138",
  appId: "1:543110998138:web:566b55afaf05f7f9b733c3",
  measurementId: "G-RCMQ0XXKLS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics instance
let analytics: Analytics | null = null;
let analyticsReady: Promise<Analytics | null>;

// Inicializar Analytics (só funciona no browser)
analyticsReady = (async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(app);
      console.log('[Analytics] ✓ Firebase Analytics inicializado');
      return analytics;
    } else {
      console.log('[Analytics] ✗ Analytics não suportado neste ambiente');
      return null;
    }
  } catch (error) {
    console.error('[Analytics] Erro ao inicializar:', error);
    return null;
  }
})();

/**
 * Rastrear evento customizado
 */
export async function trackEvent(eventName: string, params?: Record<string, unknown>) {
  // Aguardar Analytics estar pronto
  const analyticsInstance = await analyticsReady;
  
  if (analyticsInstance) {
    logEvent(analyticsInstance, eventName, params);
    console.log(`[Analytics] Evento: ${eventName}`, params);
  } else {
    console.warn(`[Analytics] Evento ignorado (não inicializado): ${eventName}`);
  }
}

/**
 * Eventos específicos da aplicação
 */
export const AppEvents = {
  // PDF carregado
  pdfLoaded: (fileName: string, fileSize: number, pageCount: number) => {
    trackEvent('pdf_loaded', {
      file_name: fileName,
      file_size_kb: Math.round(fileSize / 1024),
      page_count: pageCount,
    });
  },

  // Conversão iniciada
  conversionStarted: (dpi: number, grayscale: boolean, pageRange: string) => {
    trackEvent('conversion_started', {
      dpi,
      grayscale,
      page_range: pageRange,
    });
  },

  // Conversão concluída
  conversionCompleted: (dpi: number, imageCount: number, durationMs: number) => {
    trackEvent('conversion_completed', {
      dpi,
      image_count: imageCount,
      duration_seconds: Math.round(durationMs / 1000),
    });
  },

  // Download individual
  imageDownloaded: (pageNumber: number) => {
    trackEvent('image_downloaded', {
      page_number: pageNumber,
    });
  },

  // Download ZIP
  zipDownloaded: (imageCount: number) => {
    trackEvent('zip_downloaded', {
      image_count: imageCount,
    });
  },

  // Erro
  errorOccurred: (errorType: string, errorMessage: string) => {
    trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage.substring(0, 100),
    });
  },
};

export { app, analytics, analyticsReady };
