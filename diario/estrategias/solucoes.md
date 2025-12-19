# 🎯 Estratégias e Soluções

Este documento registra as abordagens técnicas propostas para o projeto, baseadas em pesquisa. As soluções ainda precisam ser validadas durante a implementação.

---

## Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────────┐
│                      View (Vue Component)                       │
│  - Upload de PDF                                                │
│  - Seleção DPI/Modo Cor                                         │
│  - Barra de Progresso                                           │
│  - Preview em Grid                                              │
│  - Download do Resultado                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  GhostscriptService.ts                          │
│  - Carrega gs.js via <script> tag                               │
│  - Chama factory function com locateFile                        │
│  - Escreve PDF no filesystem virtual (FS.writeFile)             │
│  - Executa gs.callMain() com argumentos                         │
│  - Lê imagens PNG/JPEG do filesystem                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              public/ghostscript/                                │
│  ├── gs.js    (JavaScript glue ~107KB)                          │
│  └── gs.wasm  (WebAssembly ~16MB)                               │
│                                                                 │
│  Arquivos estáticos, bypass do Vite                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## S1: Carregamento do WASM (Proposto)

### Problema

O Vite pode quebrar o módulo Emscripten ao tentar otimizá-lo.

### Solução Proposta

**1. Copiar arquivos para `public/`:**

```powershell
New-Item -ItemType Directory -Force -Path "public\ghostscript"
Copy-Item "node_modules\@jspawn\ghostscript-wasm\gs.js" -Destination "public\ghostscript\"
Copy-Item "node_modules\@jspawn\ghostscript-wasm\gs.wasm" -Destination "public\ghostscript\"
```

**2. Carregar via script tag dinâmico:**

```typescript
async function loadGhostscript(): Promise<GhostscriptModule> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/ghostscript/gs.js";

    script.onload = async () => {
      const factory = window.Module;

      if (typeof factory !== "function") {
        reject(new Error("Module is not a function"));
        return;
      }

      try {
        const module = await factory({
          locateFile: (path: string) => `/ghostscript/${path}`,
        });
        resolve(module);
      } catch (err) {
        reject(err);
      }
    };

    script.onerror = () => reject(new Error("Failed to load gs.js"));
    document.head.appendChild(script);
  });
}
```

**Status:** ⬜ A implementar

---

## S2: Sistema de Progresso (Proposto)

### Problema

O gs.js pode ignorar callbacks `print` do Emscripten.

### Solução Proposta

```typescript
function executeWithProgress(
  gs: GhostscriptModule,
  args: string[],
  onProgress?: (current: number, total: number) => void
): number {
  let detectedTotalPages = 0;
  const originalLog = console.log;

  console.log = (...args: any[]) => {
    const text = args.join(" ");

    // Detectar: "Processing pages 1 through 140."
    const pagesMatch = text.match(/Processing pages? (\d+) through (\d+)/i);
    if (pagesMatch) {
      detectedTotalPages = parseInt(pagesMatch[2]);
      onProgress?.(0, detectedTotalPages);
    }

    // Detectar: "Page 5"
    const pageMatch = text.match(/^Page (\d+)$/i);
    if (pageMatch) {
      onProgress?.(parseInt(pageMatch[1]), detectedTotalPages);
    }

    originalLog.apply(console, args);
  };

  try {
    return gs.callMain(args);
  } finally {
    console.log = originalLog;
  }
}
```

> ⚠️ Remover `-dQUIET` dos argumentos para receber mensagens.

**Status:** ⬜ A implementar

---

## S3: Gerenciamento de Imagens Grandes (Proposto)

### Problema

Imagens em alta resolução podem causar `RangeError`.

### Soluções Propostas

**1. Converter PNG para JPEG:**

```typescript
async function convertToJpeg(
  pngDataUrl: string,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = pngDataUrl;
  });
}
```

**2. Usar Blob output:**

```typescript
const pdfBlob = pdf.output("blob");
const url = URL.createObjectURL(pdfBlob);
```

**Status:** ⬜ A implementar

---

## S4: Template de Serviço (Proposto)

```typescript
// services/ghostscript/GhostscriptService.ts

interface GhostscriptModule {
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    readdir: (path: string) => string[];
    mkdir: (path: string) => void;
    unlink: (path: string) => void;
  };
  callMain: (args: string[]) => number;
}

let gsModule: GhostscriptModule | null = null;

export async function initGhostscript(): Promise<GhostscriptModule> {
  if (gsModule) return gsModule;

  // Implementar carregamento...

  return gsModule;
}

export async function convertPdfToImages(
  pdfData: Uint8Array,
  options: {
    dpi: number;
    grayscale?: boolean;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<Uint8Array[]> {
  const gs = await initGhostscript();

  // Implementar conversão...

  return [];
}
```

**Status:** ⬜ A implementar

---

## S5: Declarações TypeScript (Proposto)

```typescript
// types/ghostscript-wasm.d.ts

declare module "@jspawn/ghostscript-wasm" {
  interface EmscriptenFS {
    writeFile(path: string, data: Uint8Array | string): void;
    readFile(path: string): Uint8Array;
    readdir(path: string): string[];
    mkdir(path: string): void;
    unlink(path: string): void;
  }

  interface GhostscriptModule {
    FS: EmscriptenFS;
    callMain(args: string[]): number;
  }

  interface ModuleConfig {
    locateFile?: (path: string) => string;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
  }

  type ModuleFactory = (config?: ModuleConfig) => Promise<GhostscriptModule>;

  const createModule: ModuleFactory;
  export default createModule;
}

declare global {
  interface Window {
    Module: (config?: any) => Promise<any>;
  }
}
```

**Status:** ⬜ A implementar

---

## Matriz de Estratégias

| Desafio                 | Estratégia             | Status           |
| ----------------------- | ---------------------- | ---------------- |
| Bundler quebra WASM     | S1: Bypass com public/ | ⬜ A implementar |
| Sem progresso           | S2: Console intercept  | ⬜ A implementar |
| Memória/String overflow | S3: JPEG + blob        | ⬜ A implementar |
| Serviço TypeScript      | S4: Template           | ⬜ A implementar |
| Types                   | S5: Declarações .d.ts  | ⬜ A implementar |

---

## Legenda de Status

- ⬜ A implementar
- 🔄 Em implementação
- ✅ Validado
