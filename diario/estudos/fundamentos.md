# 📖 Estudos e Pesquisas

Este documento consolida os aprendizados técnicos do projeto.

---

## E1: Ghostscript - Fundamentos

### O que é Ghostscript?

Ghostscript é um interpretador para as linguagens PostScript e PDF. Desenvolvido pela Artifex Software, é a base para diversas ferramentas de processamento de documentos.

**Principais capacidades**:

- Renderização de PostScript e PDF
- Conversão entre formatos
- Compressão e otimização
- Extração de conteúdo

### Licença

> ⚠️ **AGPL v3** - Atenção para uso comercial!

---

## E2: Dispositivos de Saída (sDEVICE)

### Dispositivos de Imagem

| Dispositivo | Descrição                      | Uso Recomendado                      |
| ----------- | ------------------------------ | ------------------------------------ |
| `png16m`    | PNG 24-bit RGB (true color)    | Documentos coloridos, alta qualidade |
| `pnggray`   | PNG 8-bit grayscale            | Documentos P&B, economia de espaço   |
| `png256`    | PNG 8-bit indexado (256 cores) | Web, tamanho reduzido                |
| `pngmono`   | PNG 1-bit monocromático        | Texto puro, OCR                      |
| `pngalpha`  | PNG com canal alpha            | Transparência necessária             |
| `jpeg`      | JPEG colorido                  | Fotos, compressão com perdas         |
| `jpeggray`  | JPEG grayscale                 | Fotos P&B                            |
| `tiff24nc`  | TIFF 24-bit sem compressão     | Impressão profissional               |
| `tiffg4`    | TIFF Group 4 (fax)             | Documentos monocromáticos            |
| `tiffsep`   | TIFF separações CMYK           | Pré-impressão                        |
| `bmp16m`    | BMP 24-bit                     | Windows, sem compressão              |

### Dispositivos PDF

| Dispositivo | Descrição                             |
| ----------- | ------------------------------------- |
| `pdfwrite`  | Gera novo PDF (conversão, otimização) |
| `ps2write`  | Gera PostScript                       |
| `eps2write` | Gera EPS                              |

---

## E3: Parâmetros Essenciais

### Controle de Execução

| Parâmetro   | Descrição               | Obrigatório                     |
| ----------- | ----------------------- | ------------------------------- |
| `-dNOPAUSE` | Não pausa entre páginas | Sim                             |
| `-dBATCH`   | Encerra após processar  | Sim                             |
| `-dSAFER`   | Modo seguro             | Recomendado                     |
| `-dQUIET`   | Suprime mensagens       | **NÃO usar** (impede progresso) |

### Resolução e Qualidade

| Parâmetro               | Descrição                   | Valores            |
| ----------------------- | --------------------------- | ------------------ |
| `-r{DPI}`               | Resolução em DPI            | 72, 150, 300, 600  |
| `-r{H}x{V}`             | Resolução H×V separada      | `-r300x150`        |
| `-dTextAlphaBits=4`     | Anti-aliasing de texto      | 1, 2, 4 (4=máximo) |
| `-dGraphicsAlphaBits=4` | Anti-aliasing de gráficos   | 1, 2, 4 (4=máximo) |
| `-dDownScaleFactor=N`   | Reduz resolução por fator N | 2, 4, etc          |

### Compressão JPEG

| Parâmetro     | Descrição                | Valores                |
| ------------- | ------------------------ | ---------------------- |
| `-dJPEGQ=N`   | Qualidade JPEG           | 0-100 (maior = melhor) |
| `-dQFactor=N` | Fator de qualidade Adobe | 0.0-1.0                |

### Seleção de Páginas

| Parâmetro       | Descrição       | Exemplo         |
| --------------- | --------------- | --------------- |
| `-dFirstPage=N` | Primeira página | `-dFirstPage=5` |
| `-dLastPage=N`  | Última página   | `-dLastPage=10` |

### Saída de Arquivos

| Padrão | Descrição        | Resultado                    |
| ------ | ---------------- | ---------------------------- |
| `%d`   | Número da página | page-1.png, page-2.png       |
| `%03d` | Número com zeros | page-001.png, page-002.png   |
| `%ld`  | Número longo     | Para PDFs com muitas páginas |

---

## E4: Otimização de PDF

### Presets de Compressão

| Preset      | DPI  | Uso                        | Tamanho  |
| ----------- | ---- | -------------------------- | -------- |
| `/screen`   | 72   | Otimizado para tela        | Menor    |
| `/ebook`    | 150  | Otimizado para e-books     | Pequeno  |
| `/printer`  | 300  | Qualidade de impressão     | Médio    |
| `/prepress` | 300+ | Pré-impressão profissional | Grande   |
| `/default`  | -    | Configuração padrão        | Variável |

### Compatibilidade PDF

| Parâmetro                  | Versão               |
| -------------------------- | -------------------- |
| `-dCompatibilityLevel=1.4` | PDF 1.4 (Acrobat 5)  |
| `-dCompatibilityLevel=1.5` | PDF 1.5 (Acrobat 6)  |
| `-dCompatibilityLevel=1.6` | PDF 1.6 (Acrobat 7)  |
| `-dCompatibilityLevel=1.7` | PDF 1.7 (Acrobat 8+) |

---

## E5: WebAssembly (WASM) e Emscripten

### Conceito

WebAssembly é um formato binário que permite executar código de alta performance no navegador. Ghostscript (C/C++) é compilado para WASM usando Emscripten.

### Modo MODULARIZE

O pacote `@jspawn/ghostscript-wasm` usa Emscripten com `-s MODULARIZE=1`:

```javascript
// O Module é uma factory function, não um objeto
var Module = (() => { ... })()

// Uso correto:
const module = await window.Module({
  locateFile: (path) => `/ghostscript/${path}`,
  print: (text) => console.log("[GS]", text),
  printErr: (text) => console.error("[GS Error]", text),
});
```

### Sistema de Arquivos Virtual (MEMFS)

```javascript
// Escrever arquivo na memória
gs.FS.writeFile("/tmp/input.pdf", pdfUint8Array);

// Criar diretório
gs.FS.mkdir("/tmp/output");

// Executar Ghostscript
gs.callMain([
  "-sDEVICE=png16m",
  "-sOutputFile=/tmp/output/page-%d.png",
  "/tmp/input.pdf",
]);

// Ler resultado
const files = gs.FS.readdir("/tmp/output");
const imageData = gs.FS.readFile("/tmp/output/page-1.png");

// Limpar
gs.FS.unlink("/tmp/input.pdf");
```

### Carregamento Dinâmico

O módulo deve ser carregado via `<script>` tag devido a incompatibilidades com bundlers:

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

      const module = await factory({
        locateFile: (path: string) => `/ghostscript/${path}`,
      });

      resolve(module);
    };

    script.onerror = () => reject(new Error("Failed to load gs.js"));
    document.head.appendChild(script);
  });
}
```

---

## E6: Captura de Progresso

### Problema

O `gs.js` ignora callbacks `print` do Emscripten e usa `console.log` diretamente.

### Solução: Interceptar console.log

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

    // Detectar total: "Processing pages 1 through 140."
    const pagesMatch = text.match(/Processing pages? (\d+) through (\d+)/i);
    if (pagesMatch) {
      detectedTotalPages = parseInt(pagesMatch[2]);
      onProgress?.(0, detectedTotalPages);
    }

    // Detectar página: "Page 5"
    const pageMatch = text.match(/^Page (\d+)$/i);
    if (pageMatch) {
      const currentPage = parseInt(pageMatch[1]);
      onProgress?.(currentPage, detectedTotalPages);
    }

    originalLog.apply(console, args);
  };

  try {
    return gs.callMain(args);
  } finally {
    console.log = originalLog; // SEMPRE restaurar!
  }
}
```

> ⚠️ **Importante:** NÃO usar `-dQUIET` se quiser receber mensagens de progresso!

---

## E7: Tratamento de Erros

### Códigos de Retorno

| Código | Significado   |
| ------ | ------------- |
| 0      | Sucesso       |
| -1     | Erro genérico |
| -100   | Erro fatal    |

### Mensagens Comuns

| Mensagem                   | Causa                | Solução                             |
| -------------------------- | -------------------- | ----------------------------------- |
| `Can't find ... resource`  | Fonte não encontrada | Usar fontes substitutas             |
| `Unrecoverable error`      | PDF corrompido       | Tentar com `-dPDFSTOPONERROR=false` |
| `Output file not writable` | Problema no FS       | Verificar mkdir                     |

---

## E8: Performance e Memória

### Consumo por DPI

| DPI | Memória por Página A4 |
| --- | --------------------- |
| 72  | ~2 MB                 |
| 150 | ~8 MB                 |
| 300 | ~32 MB                |
| 600 | ~128 MB               |

### Parâmetros de Otimização

```typescript
// Limitar memória usada para bitmaps
"-dMaxBitmap=500000000"; // 500MB máximo

// Buffer space em bytes
"-dBufferSpace=100000";
```

---

## E9: Comandos Prontos para Uso

### PDF Flat (Páginas como Imagens)

```typescript
const args = [
  "-dNOPAUSE",
  "-dBATCH",
  "-dSAFER",
  "-sDEVICE=png16m",
  "-r300",
  "-dTextAlphaBits=4",
  "-dGraphicsAlphaBits=4",
  "-sOutputFile=/tmp/page-%d.png",
  "/tmp/input.pdf",
];
```

### Compressão de PDF

```typescript
const args = [
  "-dNOPAUSE",
  "-dBATCH",
  "-dSAFER",
  "-sDEVICE=pdfwrite",
  "-dPDFSETTINGS=/ebook",
  "-dCompatibilityLevel=1.5",
  "-sOutputFile=/tmp/compressed.pdf",
  "/tmp/input.pdf",
];
```

### Extração de Páginas

```typescript
const args = [
  "-dNOPAUSE",
  "-dBATCH",
  "-dSAFER",
  "-sDEVICE=pdfwrite",
  "-dFirstPage=5",
  "-dLastPage=10",
  "-sOutputFile=/tmp/pages_5_10.pdf",
  "/tmp/input.pdf",
];
```

### Conversão para Grayscale

```typescript
const args = [
  "-dNOPAUSE",
  "-dBATCH",
  "-dSAFER",
  "-sDEVICE=pdfwrite",
  "-sColorConversionStrategy=Gray",
  "-dProcessColorModel=/DeviceGray",
  "-sOutputFile=/tmp/grayscale.pdf",
  "/tmp/input.pdf",
];
```

### Thumbnail de Prévia

```typescript
const args = [
  "-dNOPAUSE",
  "-dBATCH",
  "-dSAFER",
  "-sDEVICE=jpeg",
  "-r72", // Baixa resolução
  "-dJPEGQ=60", // Compressão média
  "-dFirstPage=1",
  "-dLastPage=1",
  "-sOutputFile=/tmp/thumb.jpg",
  "/tmp/input.pdf",
];
```

### PDF para TIFF (Fax/Impressão)

```typescript
const args = [
  "-dNOPAUSE",
  "-dBATCH",
  "-dSAFER",
  "-sDEVICE=tiffg4", // Group 4 compression
  "-r300",
  "-sOutputFile=/tmp/document.tiff",
  "/tmp/input.pdf",
];
```

---

## Referências

- [Ghostscript Documentation](https://www.ghostscript.com/doc/)
- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [Emscripten FS API](https://emscripten.org/docs/api_reference/Filesystem-API.html)
- [@jspawn/ghostscript-wasm](https://www.npmjs.com/package/@jspawn/ghostscript-wasm)
