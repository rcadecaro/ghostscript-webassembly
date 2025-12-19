# 🗜️ Funcionalidade: Compressão de PDF

## Visão Geral

Reduzir o tamanho de arquivos PDF mantendo qualidade aceitável para o uso pretendido.

---

## Especificação

### Entrada

- Arquivo PDF
- Preset de compressão

### Saída

- PDF comprimido
- Estatísticas de compressão

### Presets

| Preset     | DPI  | Uso                  | Compressão |
| ---------- | ---- | -------------------- | ---------- |
| `screen`   | 72   | Web, email, preview  | 70-90%     |
| `ebook`    | 150  | E-readers, tablets   | 50-70%     |
| `printer`  | 300  | Impressão doméstica  | 20-40%     |
| `prepress` | 300+ | Gráfica profissional | 10-20%     |

---

## Comandos Ghostscript

### Compressão Básica

```bash
gs -dNOPAUSE -dBATCH -dSAFER \
   -sDEVICE=pdfwrite \
   -dPDFSETTINGS=/ebook \
   -dCompatibilityLevel=1.4 \
   -sOutputFile=compressed.pdf \
   input.pdf
```

### Configurações Avançadas

```bash
gs -dNOPAUSE -dBATCH -dSAFER \
   -sDEVICE=pdfwrite \
   -dPDFSETTINGS=/ebook \
   -dCompatibilityLevel=1.4 \
   -dDownsampleColorImages=true \
   -dColorImageResolution=150 \
   -dDownsampleGrayImages=true \
   -dGrayImageResolution=150 \
   -dDownsampleMonoImages=true \
   -dMonoImageResolution=150 \
   -sOutputFile=compressed.pdf \
   input.pdf
```

### Máxima Compressão

```bash
gs -dNOPAUSE -dBATCH -dSAFER \
   -sDEVICE=pdfwrite \
   -dPDFSETTINGS=/screen \
   -dCompatibilityLevel=1.4 \
   -dConvertCMYKImagesToRGB=true \
   -dSubsetFonts=true \
   -dEmbedAllFonts=true \
   -sOutputFile=compressed.pdf \
   input.pdf
```

---

## Interface do Usuário

### Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Compressão de PDF                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Arquivo: documento.pdf                                      │
│  Tamanho original: 15.2 MB                                   │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Selecione a qualidade:                                      │
│                                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │  ◉ Web    │ │  ○ E-book │ │ ○ Printer │ │○ Prepress │   │
│  │   72 DPI  │ │  150 DPI  │ │  300 DPI  │ │  300+ DPI │   │
│  │  ~2.3 MB  │ │  ~4.5 MB  │ │  ~9.1 MB  │ │ ~12.2 MB  │   │
│  │   -85%    │ │   -70%    │ │   -40%    │ │   -20%    │   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Estimativa:                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 15.2 MB ═══════════════════════▶ 2.3 MB            │   │
│  │                                   -85% (12.9 MB)    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│            [    Comprimir    ]                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementação

### Composable

```typescript
// composables/usePdfCompressor.ts
import { ref, computed } from "vue";

export type CompressionPreset = "screen" | "ebook" | "printer" | "prepress";

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

export function usePdfCompressor() {
  const { send } = useGhostscriptWorker();

  const isCompressing = ref(false);
  const progress = ref(0);
  const result = ref<CompressionResult | null>(null);
  const error = ref<string | null>(null);

  async function compress(
    file: File,
    preset: CompressionPreset = "ebook"
  ): Promise<CompressionResult> {
    isCompressing.value = true;
    progress.value = 0;
    error.value = null;

    try {
      const buffer = await file.arrayBuffer();
      const originalSize = buffer.byteLength;

      const compressedBuffer = await send<ArrayBuffer>("COMPRESS_PDF", {
        buffer,
        preset,
      });

      const compressedSize = compressedBuffer.byteLength;
      const blob = new Blob([compressedBuffer], { type: "application/pdf" });

      result.value = {
        blob,
        originalSize,
        compressedSize,
        ratio: 1 - compressedSize / originalSize,
      };

      return result.value;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Erro desconhecido";
      throw e;
    } finally {
      isCompressing.value = false;
    }
  }

  // Estimativa baseada no preset
  function estimateSize(
    originalSize: number,
    preset: CompressionPreset
  ): number {
    const ratios: Record<CompressionPreset, number> = {
      screen: 0.15, // 85% redução
      ebook: 0.35, // 65% redução
      printer: 0.65, // 35% redução
      prepress: 0.85, // 15% redução
    };
    return Math.round(originalSize * ratios[preset]);
  }

  return {
    isCompressing,
    progress,
    result,
    error,
    compress,
    estimateSize,
  };
}
```

---

## Comparativo de Presets

| Característica | screen  | ebook   | printer  | prepress |
| -------------- | ------- | ------- | -------- | -------- |
| Imagens color  | 72 dpi  | 150 dpi | 300 dpi  | 300 dpi  |
| Imagens gray   | 72 dpi  | 150 dpi | 300 dpi  | 300 dpi  |
| Imagens mono   | 300 dpi | 300 dpi | 1200 dpi | 1200 dpi |
| Downscale      | Sim     | Sim     | Não      | Não      |
| Subset fonts   | Sim     | Sim     | Sim      | Não      |
| Embed fonts    | Não     | Sim     | Sim      | Sim      |
| CMYK→RGB       | Sim     | Sim     | Não      | Não      |

---

## Testes

| ID  | Cenário           | Entrada  | Resultado Esperado             |
| --- | ----------------- | -------- | ------------------------------ |
| T1  | PDF texto         | 5MB      | Redução significativa          |
| T2  | PDF imagens       | 20MB     | Redução proporcional ao preset |
| T3  | PDF já comprimido | 1MB      | Mantém ou reduz pouco          |
| T4  | Preset screen     | qualquer | Menor tamanho possível         |
| T5  | Preset prepress   | qualquer | Qualidade máxima mantida       |

---

## Status

- [ ] Implementação básica
- [ ] Presets de compressão
- [ ] Estimativa de tamanho
- [ ] Comparação antes/depois
- [ ] Opções avançadas (opcional)
- [ ] Testes
