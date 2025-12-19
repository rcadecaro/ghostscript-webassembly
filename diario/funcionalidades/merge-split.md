# ✂️ Funcionalidade: Merge e Split de PDFs

## Visão Geral

### Merge

Combinar múltiplos arquivos PDF em um único documento.

### Split

Dividir um PDF em múltiplos arquivos menores.

---

## Especificação: Merge

### Entrada

- 2+ arquivos PDF
- Ordem dos arquivos

### Saída

- PDF único concatenado

### Comando Ghostscript

```bash
gs -dNOPAUSE -dBATCH -dSAFER \
   -sDEVICE=pdfwrite \
   -sOutputFile=merged.pdf \
   input1.pdf input2.pdf input3.pdf
```

### Com Compressão

```bash
gs -dNOPAUSE -dBATCH -dSAFER \
   -sDEVICE=pdfwrite \
   -dPDFSETTINGS=/ebook \
   -sOutputFile=merged.pdf \
   input1.pdf input2.pdf input3.pdf
```

---

## Especificação: Split

### Modos de Divisão

| Modo        | Descrição                   | Exemplo                  |
| ----------- | --------------------------- | ------------------------ |
| Por página  | Cada página vira um arquivo | 10 páginas → 10 PDFs     |
| Por range   | A cada N páginas            | 10 páginas, N=3 → 4 PDFs |
| Customizado | Ranges específicos          | 1-3, 4-7, 8-10 → 3 PDFs  |

### Comandos Ghostscript

**Extrair página única**:

```bash
gs -dNOPAUSE -dBATCH -dSAFER \
   -sDEVICE=pdfwrite \
   -dFirstPage=1 -dLastPage=1 \
   -sOutputFile=page-001.pdf \
   input.pdf
```

**Script para todas as páginas** (loop no worker):

```javascript
for (let page = 1; page <= totalPages; page++) {
  gs.callMain([
    "-dNOPAUSE",
    "-dBATCH",
    "-dSAFER",
    "-sDEVICE=pdfwrite",
    `-dFirstPage=${page}`,
    `-dLastPage=${page}`,
    `-sOutputFile=/page-${String(page).padStart(3, "0")}.pdf`,
    "/input.pdf",
  ]);
}
```

---

## Interface do Usuário: Merge

### Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Unir PDFs                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Arquivos (arraste para reordenar):                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ≡  📄 documento1.pdf                    5 págs  2MB │   │
│  │ ≡  📄 documento2.pdf                    3 págs  1MB │   │
│  │ ≡  📄 documento3.pdf                   12 págs  5MB │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  [ + Adicionar mais arquivos ]                               │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Resultado: 20 páginas | ~8 MB                               │
│                                                              │
│  [ ] Comprimir resultado (preset: ebook)                     │
│                                                              │
│            [    Unir PDFs    ]                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Interface do Usuário: Split

### Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Dividir PDF                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Arquivo: documento.pdf (50 páginas)                         │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Como dividir:                                               │
│                                                              │
│  (●) Cada página em um arquivo                               │
│      → 50 arquivos                                           │
│                                                              │
│  ( ) A cada [ 10 ] páginas                                   │
│      → 5 arquivos                                            │
│                                                              │
│  ( ) Customizado:                                            │
│      [ 1-10, 11-20, 21-50 ]                                  │
│      → 3 arquivos                                            │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Preview:                                                    │
│  ┌─────┬─────┬─────┬─────┬─────┐                            │
│  │  1  │  2  │  3  │ ... │ 50  │                            │
│  └─────┴─────┴─────┴─────┴─────┘                            │
│                                                              │
│            [    Dividir    ]                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementação

### Composable Merge

```typescript
// composables/usePdfMerge.ts
import { ref } from "vue";

interface MergeOptions {
  compress?: boolean;
  compressPreset?: CompressionPreset;
}

export function usePdfMerge() {
  const { send } = useGhostscriptWorker();

  const isMerging = ref(false);
  const progress = ref(0);
  const result = ref<Blob | null>(null);
  const error = ref<string | null>(null);

  async function merge(
    files: File[],
    options: MergeOptions = {}
  ): Promise<Blob> {
    if (files.length < 2) {
      throw new Error("Necessário pelo menos 2 arquivos para unir");
    }

    isMerging.value = true;
    progress.value = 0;
    error.value = null;

    try {
      const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));

      const mergedBuffer = await send<ArrayBuffer>("MERGE_PDFS", {
        buffers,
        options,
      });

      result.value = new Blob([mergedBuffer], { type: "application/pdf" });
      return result.value;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Erro desconhecido";
      throw e;
    } finally {
      isMerging.value = false;
    }
  }

  return { isMerging, progress, result, error, merge };
}
```

### Composable Split

```typescript
// composables/usePdfSplit.ts
import { ref } from "vue";

type SplitMode =
  | { type: "each-page" }
  | { type: "every-n"; count: number }
  | { type: "custom"; ranges: Array<{ start: number; end: number }> };

export function usePdfSplit() {
  const { send } = useGhostscriptWorker();

  const isSplitting = ref(false);
  const progress = ref(0);
  const results = ref<Blob[]>([]);
  const error = ref<string | null>(null);

  async function split(file: File, mode: SplitMode): Promise<Blob[]> {
    isSplitting.value = true;
    progress.value = 0;
    error.value = null;

    try {
      const buffer = await file.arrayBuffer();

      const splitBuffers = await send<ArrayBuffer[]>("SPLIT_PDF", {
        buffer,
        mode,
      });

      results.value = splitBuffers.map(
        (b) => new Blob([b], { type: "application/pdf" })
      );

      return results.value;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Erro desconhecido";
      throw e;
    } finally {
      isSplitting.value = false;
    }
  }

  // Gerar nomes de arquivo
  function generateFilenames(
    originalName: string,
    mode: SplitMode,
    count: number
  ): string[] {
    const baseName = originalName.replace(".pdf", "");
    return Array.from(
      { length: count },
      (_, i) => `${baseName}-parte-${String(i + 1).padStart(3, "0")}.pdf`
    );
  }

  return {
    isSplitting,
    progress,
    results,
    error,
    split,
    generateFilenames,
  };
}
```

---

## Download como ZIP

Para múltiplos arquivos resultantes do split, usar JSZip:

```typescript
import JSZip from "jszip";

async function downloadAsZip(files: Array<{ name: string; blob: Blob }>) {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.name, file.blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pdfs-divididos.zip";
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## Testes

### Merge

| ID  | Cenário                  | Entrada      | Resultado Esperado    |
| --- | ------------------------ | ------------ | --------------------- |
| M1  | 2 PDFs simples           | 2 arquivos   | PDF combinado         |
| M2  | 5 PDFs                   | 5 arquivos   | Ordem preservada      |
| M3  | PDFs diferentes tamanhos | variados     | Funciona corretamente |
| M4  | Com compressão           | 2 + compress | Menor que soma        |

### Split

| ID  | Cenário     | Entrada    | Resultado Esperado |
| --- | ----------- | ---------- | ------------------ |
| S1  | Cada página | 10 páginas | 10 PDFs            |
| S2  | A cada 3    | 10 páginas | 4 PDFs (3,3,3,1)   |
| S3  | Customizado | 1-5, 6-10  | 2 PDFs             |
| S4  | Uma página  | 1 página   | 1 PDF (mesmo)      |

---

## Status

### Merge

- [ ] Upload múltiplo
- [ ] Reordenação drag-and-drop
- [ ] Merge básico
- [ ] Opção de compressão
- [ ] Testes

### Split

- [ ] Contagem de páginas
- [ ] Modo cada página
- [ ] Modo a cada N
- [ ] Modo customizado
- [ ] Download ZIP
- [ ] Testes
