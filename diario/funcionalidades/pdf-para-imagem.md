# 🖼️ Funcionalidade: PDF para Imagem

## Visão Geral

Converter páginas de documentos PDF em imagens de alta qualidade (PNG ou JPEG).

---

## Especificação

### Entrada

- Arquivo PDF (max 50MB)
- Configurações de conversão

### Saída

- Imagens individuais por página
- ZIP se múltiplas páginas

### Parâmetros

| Parâmetro      | Tipo    | Valores                     | Default |
| -------------- | ------- | --------------------------- | ------- |
| `format`       | string  | `png`, `jpeg`               | `png`   |
| `resolution`   | number  | `72`, `150`, `300`, `600`   | `150`   |
| `quality`      | number  | `1-100`                     | `85`    |
| `antialiasing` | number  | `1`, `2`, `4`               | `4`     |
| `pages`        | object  | `{ start, end }` ou `'all'` | `'all'` |
| `grayscale`    | boolean | `true`, `false`             | `false` |

---

## Comandos Ghostscript

### PNG Alta Qualidade

```bash
gs -dNOPAUSE -dBATCH -dSAFER \
   -sDEVICE=png16m \
   -r300 \
   -dTextAlphaBits=4 \
   -dGraphicsAlphaBits=4 \
   -sOutputFile=page-%03d.png \
   input.pdf
```

### JPEG com Qualidade

```bash
gs -dNOPAUSE -dBATCH -dSAFER \
   -sDEVICE=jpeg \
   -r200 \
   -dJPEGQ=85 \
   -sOutputFile=page-%03d.jpg \
   input.pdf
```

### Páginas Específicas

```bash
gs -dNOPAUSE -dBATCH -dSAFER \
   -sDEVICE=png16m \
   -r150 \
   -dFirstPage=1 \
   -dLastPage=5 \
   -sOutputFile=page-%03d.png \
   input.pdf
```

### Grayscale

```bash
gs -dNOPAUSE -dBATCH -dSAFER \
   -sDEVICE=pnggray \
   -r150 \
   -sOutputFile=page-%03d.png \
   input.pdf
```

---

## Interface do Usuário

### Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  PDF para Imagem                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │              [Arraste um PDF aqui]                   │   │
│  │                 ou clique para selecionar            │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Configurações:                                              │
│                                                              │
│  Formato:      (●) PNG    ( ) JPEG                          │
│                                                              │
│  Resolução:    [ 150 DPI          ▼]                        │
│                                                              │
│  Qualidade:    ────────●─────────── 85%                     │
│  (apenas JPEG)                                               │
│                                                              │
│  Páginas:      (●) Todas  ( ) Intervalo: [1] até [5]        │
│                                                              │
│  [ ] Converter para escala de cinza                         │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│            [    Converter    ]                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementação

### Composable

```typescript
// composables/usePdfToImage.ts
import { ref, computed } from "vue";
import { useGhostscriptWorker } from "./useGhostscriptWorker";

export interface ConvertToImageOptions {
  format: "png" | "jpeg";
  resolution: 72 | 150 | 300 | 600;
  quality: number;
  antialiasing: 1 | 2 | 4;
  pages: "all" | { start: number; end: number };
  grayscale: boolean;
}

const defaultOptions: ConvertToImageOptions = {
  format: "png",
  resolution: 150,
  quality: 85,
  antialiasing: 4,
  pages: "all",
  grayscale: false,
};

export function usePdfToImage() {
  const { send, worker } = useGhostscriptWorker();

  const isConverting = ref(false);
  const progress = ref(0);
  const currentPage = ref(0);
  const totalPages = ref(0);
  const results = ref<Blob[]>([]);
  const error = ref<string | null>(null);

  // Listener de progresso
  worker.addEventListener("message", (e: MessageEvent) => {
    if (e.data.type === "PROGRESS") {
      progress.value = e.data.percent;
      currentPage.value = e.data.page;
    }
  });

  async function convert(
    file: File,
    options: Partial<ConvertToImageOptions> = {}
  ): Promise<Blob[]> {
    const opts = { ...defaultOptions, ...options };

    isConverting.value = true;
    progress.value = 0;
    error.value = null;
    results.value = [];

    try {
      const buffer = await file.arrayBuffer();

      const blobs = await send<Blob[]>("CONVERT_TO_IMAGE", {
        buffer,
        options: opts,
      });

      results.value = blobs;
      return blobs;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Erro desconhecido";
      throw e;
    } finally {
      isConverting.value = false;
    }
  }

  function cancel() {
    worker.postMessage({ type: "CANCEL" });
    isConverting.value = false;
  }

  return {
    isConverting,
    progress,
    currentPage,
    totalPages,
    results,
    error,
    convert,
    cancel,
  };
}
```

### Worker Handler

```typescript
// workers/handlers/convertToImage.ts
export function handleConvertToImage(
  gs: GhostscriptModule,
  buffer: ArrayBuffer,
  options: ConvertToImageOptions,
  onProgress: (page: number, total: number) => void
): Uint8Array[] {
  // Determinar device
  let device = "png16m";
  if (options.format === "jpeg") device = "jpeg";
  if (options.grayscale && options.format === "png") device = "pnggray";

  // Escrever arquivo de entrada
  gs.FS.writeFile("/input.pdf", new Uint8Array(buffer));

  // Montar argumentos
  const args = [
    "-dNOPAUSE",
    "-dBATCH",
    "-dSAFER",
    `-sDEVICE=${device}`,
    `-r${options.resolution}`,
    `-dTextAlphaBits=${options.antialiasing}`,
    `-dGraphicsAlphaBits=${options.antialiasing}`,
    "-sOutputFile=/output-%03d." + options.format,
  ];

  // Adicionar qualidade JPEG
  if (options.format === "jpeg") {
    args.push(`-dJPEGQ=${options.quality}`);
  }

  // Adicionar range de páginas
  if (options.pages !== "all") {
    args.push(`-dFirstPage=${options.pages.start}`);
    args.push(`-dLastPage=${options.pages.end}`);
  }

  args.push("/input.pdf");

  // Executar
  gs.callMain(args);

  // Ler resultados
  const files = gs.FS.readdir("/");
  const outputs: Uint8Array[] = [];

  for (const file of files) {
    if (file.startsWith("output-") && file.endsWith(`.${options.format}`)) {
      outputs.push(gs.FS.readFile("/" + file));
      gs.FS.unlink("/" + file);
    }
  }

  // Limpar input
  gs.FS.unlink("/input.pdf");

  return outputs;
}
```

---

## Testes

### Casos de Teste

| ID  | Cenário          | Entrada        | Resultado Esperado                |
| --- | ---------------- | -------------- | --------------------------------- |
| T1  | PDF 1 página     | simple.pdf     | 1 PNG/JPEG                        |
| T2  | PDF 10 páginas   | multi.pdf      | 10 arquivos                       |
| T3  | Range específico | 1-3            | 3 arquivos                        |
| T4  | Resolução alta   | 600 DPI        | Imagem grande, alta qualidade     |
| T5  | JPEG qualidade   | Q=50           | Arquivo menor, compressão visível |
| T6  | Grayscale        | grayscale=true | Imagem P&B                        |
| T7  | PDF grande       | 50 páginas     | Sucesso, progresso atualizado     |
| T8  | PDF corrompido   | invalid.pdf    | Erro tratado graciosamente        |

---

## Status

- [ ] Implementação básica
- [ ] Seleção de formato
- [ ] Configuração de resolução
- [ ] Configuração de qualidade
- [ ] Seleção de páginas
- [ ] Grayscale
- [ ] Progresso em tempo real
- [ ] Download individual
- [ ] Download ZIP
- [ ] Testes automatizados
