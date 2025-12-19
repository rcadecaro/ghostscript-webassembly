# ⚠️ Dificuldades e Desafios

Este documento registra os obstáculos encontrados durante o desenvolvimento e suas soluções.

---

## Desafios Resolvidos ✅

### D1: Bundler Vite Quebra Módulo Emscripten ✅

**Sintoma:** `ReferenceError: createModule is not defined`

**Causa:** Vite otimiza incorretamente o pacote `@jspawn/ghostscript-wasm` (modo MODULARIZE do Emscripten).

**Solução:** Copiar arquivos para `public/` e carregar via `<script>` tag:

```powershell
Copy-Item "node_modules\@jspawn\ghostscript-wasm\gs.*" -Destination "public\ghostscript\"
```

---

### D2: Módulo Não Inicializa ✅

**Sintoma:** Script carrega mas módulo não inicializa.

**Causa:** `window.Module` é uma factory function, não um objeto.

**Solução:**

```typescript
const module = await factory({
  locateFile: (path) => `/ghostscript/${path}`,
});
```

---

### D3: Sem Feedback de Progresso ✅ (parcial)

**Sintoma:** Usuário não sabe em qual página está a conversão.

**Causa:** O `callMain()` é síncrono e bloqueia a thread principal. Mesmo interceptando `console.log`, a UI não atualiza.

**Descoberta:** O gs.js usa `console.log` diretamente (linha 669), ignorando callbacks `print` do Emscripten.

**Solução aplicada:** Spinner animado com mensagens contextuais. **Progresso real-time requer Web Worker** (fase futura).

---

### D4: Download Individual Não Funcionava ✅

**Sintoma:** Clicar no ícone de download não baixava a imagem.

**Causa:** `<a download>` com blob URL não funciona em todos os casos.

**Solução:** Usar função JavaScript com `document.body.appendChild()`:

```typescript
function handleDownloadSingle(url: string, index: number) {
  const a = document.createElement("a");
  a.href = url;
  a.download = `pagina-${index + 1}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
```

---

### D5: Texto Ilegível no Dark Mode ✅

**Sintoma:** Texto do toggle "Preto & Branco" estava com cor escura.

**Solução:** Mudar `color: var(--text-secondary)` para `color: var(--text-primary)`.

---

## Desafios Pendentes

### D6: UI Bloqueia Durante Conversão

**Impacto:** 🟡 Médio  
**Status:** ⬜ Documentado

O `callMain()` bloqueia a thread principal. A UI só atualiza após a conversão terminar.

**Solução planejada:** Web Worker dedicado para processamento em background.

---

## Especificações Técnicas

| Item                         | Valor          |
| ---------------------------- | -------------- |
| gs.wasm                      | ~16MB          |
| gs.js                        | ~107KB         |
| Primeira inicialização       | 10-60 segundos |
| Memória por página (300 DPI) | ~32MB          |

### Configuração Vite

```typescript
export default defineConfig({
  optimizeDeps: { exclude: ["@jspawn/ghostscript-wasm"] },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  assetsInclude: ["**/*.wasm"],
});
```
