# ⚠️ Dificuldades e Soluções

Este documento registra os obstáculos encontrados e suas soluções.

---

## Resolvidos ✅

### 1. Bundler Vite Quebra Módulo Emscripten

**Sintoma:** `ReferenceError: createModule is not defined`

**Causa:** Vite otimiza incorretamente o pacote `@jspawn/ghostscript-wasm` (modo MODULARIZE).

**Solução:** Copiar `gs.js` e `gs.wasm` para `public/ghostscript/` e carregar via `<script>` tag.

---

### 2. Workers Módulo Não Suportam importScripts

**Sintoma:** `Module scripts don't support importScripts()`

**Causa:** Vite cria Workers do tipo `module`, que usam `import` em vez de `importScripts()`.

**Solução:** Criar Worker **clássico** (JS puro) em `public/ghostscript/worker.js`:

```javascript
// public/ghostscript/worker.js
importScripts("/ghostscript/gs.js");
```

Carregar via URL absoluta:

```typescript
worker = new Worker("/ghostscript/worker.js");
```

---

### 3. Callback print do Emscripten Não Funciona

**Sintoma:** Output do Ghostscript vai para `console.log` em vez do callback.

**Causa:** O `gs.js` usa wrapper interno de `console.log` que ignora o callback `print`.

**Solução:** Interceptar `console.log` **ANTES** de importar o `gs.js`:

```javascript
// Guardar original
const originalConsoleLog = console.log;

// Interceptar
console.log = (...args) => {
  handleGsOutput(args.join(" "));
  originalConsoleLog("[GS]", ...args);
};

// Depois importar
importScripts("/ghostscript/gs.js");
```

---

### 4. Firebase webframeworks Experiment

**Sintoma:** `Cannot deploy a web framework from source because the experiment webframeworks is not enabled`

**Causa:** Firebase CLI requer flag experimental para frameworks.

**Solução:** Adicionar env no workflow:

```yaml
- uses: FirebaseExtended/action-hosting-deploy@v0
  with: ...
  env:
    FIREBASE_CLI_EXPERIMENTS: webframeworks
```

---

### 5. Workflow npm ci na pasta errada

**Sintoma:** `npm ci` falha porque não encontra `package-lock.json`

**Causa:** Projeto está em `app/` mas workflow roda na raiz.

**Solução:** Configurar `working-directory` e `entryPoint`:

```yaml
defaults:
  run:
    working-directory: app
steps:
  ...
  - uses: FirebaseExtended/action-hosting-deploy@v0
    with:
      entryPoint: app
```

---

## Especificações Técnicas

| Item                         | Valor          |
| ---------------------------- | -------------- |
| gs.wasm                      | ~16MB          |
| gs.js                        | ~107KB         |
| Primeira inicialização       | 10-60 segundos |
| Memória por página (300 DPI) | ~32MB          |

---

## Fluxo do Worker

```
[Main Thread]                    [Worker Thread]
     │                                 │
     ├─ new Worker() ─────────────────>│
     │                     intercept console.log
     │                     importScripts('gs.js')
     ├─ postMessage({type:'init'}) ───>│
     │                     factory({ locateFile })
     │<──────── postMessage({type:'ready'}) ─┤
     │                                 │
     ├─ postMessage({type:'analyze'}) >│
     │                     callMain(nullpage)
     │<────── postMessage({type:'analyze_progress'}) ─┤
     │<────── postMessage({type:'analyzed'}) ─┤
     │                                 │
     ├─ postMessage({type:'convert'}) >│
     │                     callMain(pngdevice)
     │<────── postMessage({type:'progress'}) ─┤
     │<────── postMessage({type:'complete'}) ─┤
```
