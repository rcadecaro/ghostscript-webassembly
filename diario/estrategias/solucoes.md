# 🎯 Estratégias e Soluções

Abordagens técnicas validadas durante a implementação.

---

## S1: Carregamento do WASM ✅

**Problema:** Vite quebra módulo Emscripten.

**Solução:**

```typescript
async function loadGhostscript(): Promise<GhostscriptModule> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/ghostscript/gs.js";

    script.onload = async () => {
      const factory = window.Module;
      const module = await factory({
        locateFile: (path) => `/ghostscript/${path}`,
      });
      resolve(module);
    };

    document.head.appendChild(script);
  });
}
```

---

## S2: Conversão PDF → PNG ✅

```typescript
const args = [
  "-dNOPAUSE",
  "-dBATCH",
  "-dSAFER",
  `-sDEVICE=${grayscale ? "pnggray" : "png16m"}`,
  `-r${dpi}`,
  "-dTextAlphaBits=4",
  "-dGraphicsAlphaBits=4",
  "-sOutputFile=/tmp/output/page-%d.png",
  "/tmp/input.pdf",
];
gs.callMain(args);
```

---

## S3: Download de Imagens ✅

```typescript
function handleDownloadSingle(url: string, index: number) {
  const a = document.createElement("a");
  a.href = url;
  a.download = `pagina-${index + 1}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function handleDownloadAll() {
  resultImages.forEach((url, index) => {
    setTimeout(() => handleDownloadSingle(url, index), index * 100);
  });
}
```

---

## S4: Conversão Uint8Array → Blob URL ✅

```typescript
function uint8ArrayToDataUrl(data: Uint8Array, mimeType = "image/png"): string {
  const buffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([buffer], { type: mimeType });
  return URL.createObjectURL(blob);
}
```

---

## Melhorias Futuras

- [ ] Web Worker para conversão em background
- [ ] Progresso real-time (requer Worker)
- [ ] Cache de resultados via IndexedDB
- [ ] Compressão de PDF (sDEVICE=pdfwrite)
