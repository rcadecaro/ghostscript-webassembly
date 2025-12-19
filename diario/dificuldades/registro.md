# ⚠️ Dificuldades e Desafios

Este documento registra os obstáculos encontrados durante o desenvolvimento e suas soluções.

---

## Desafios Resolvidos ✅

### D1: Bundler Vite Quebra Módulo Emscripten ✅

**Sintoma:** `ReferenceError: createModule is not defined`

**Causa:** Vite otimiza incorretamente o pacote `@jspawn/ghostscript-wasm` (modo MODULARIZE do Emscripten).

**Solução:** Copiar arquivos para `public/` e carregar via `<script>` tag.

---

### D2: Módulo Não Inicializa ✅

**Sintoma:** Script carrega mas módulo não inicializa.

**Causa:** `window.Module` é uma factory function, não um objeto.

**Solução:** `const module = await factory({ locateFile: ... })`

---

### D3: Workers Módulo Não Suportam importScripts ✅

**Sintoma:** `Module scripts don't support importScripts()`

**Causa:** Vite cria Workers do tipo `module`, que usam `import` em vez de `importScripts()`.

**Solução:** Criar Worker clássico em JavaScript puro no diretório `public/`:

```javascript
// public/ghostscript/worker.js
importScripts("/ghostscript/gs.js");
// ... resto do código
```

Carregar via URL absoluta:

```typescript
worker = new Worker("/ghostscript/worker.js");
```

---

### D4: Download Individual Não Funcionava ✅

**Sintoma:** Clicar no ícone de download não baixava a imagem.

**Solução:** Usar `document.body.appendChild(a)` antes de `a.click()`.

---

### D5: Texto Ilegível no Dark Mode ✅

**Sintoma:** Texto escuro em fundo escuro.

**Solução:** `color: var(--text-primary)`

---

## Especificações Técnicas

| Item                         | Valor          |
| ---------------------------- | -------------- |
| gs.wasm                      | ~16MB          |
| gs.js                        | ~107KB         |
| Primeira inicialização       | 10-60 segundos |
| Memória por página (300 DPI) | ~32MB          |

### Arquitetura do Worker

```
[Main Thread]                    [Worker Thread]
     │                                 │
     ├─ new Worker() ─────────────────>│
     │                                 │
     ├─ postMessage({type:'init'}) ───>│
     │                     importScripts('gs.js')
     │                     factory({ locateFile })
     │<──────── postMessage({type:'ready'}) ─┤
     │                                 │
     ├─ postMessage({type:'convert'}) >│
     │                     callMain(args)
     │<────── postMessage({type:'progress'}) ─┤ (por página)
     │                                 │
     │<────── postMessage({type:'complete'}) ─┤
```
