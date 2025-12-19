# ⚠️ Dificuldades e Desafios

Este documento registra os obstáculos identificados através de pesquisa e os que serão encontrados durante o desenvolvimento.

---

## Desafios Identificados (Pesquisa)

Os seguintes desafios foram identificados através de pesquisa prévia e documentação. As soluções propostas ainda precisam ser validadas durante a implementação.

### D1: Bundler Vite Quebra Módulo Emscripten

**Status:** 📝 Pesquisado (não implementado)

**Problema esperado:**

```
ReferenceError: createModule is not defined
```

**Causa:**  
O Vite tenta otimizar e pré-bundlear o pacote `@jspawn/ghostscript-wasm`, mas o módulo foi compilado com Emscripten em modo **MODULARIZE**, gerando uma estrutura especial que o bundler quebra.

**Solução proposta:**  
Copiar os arquivos estáticos para `public/` e carregar via `<script>` tag dinâmico:

```powershell
New-Item -ItemType Directory -Force -Path "public\ghostscript"
Copy-Item "node_modules\@jspawn\ghostscript-wasm\gs.js" -Destination "public\ghostscript\"
Copy-Item "node_modules\@jspawn\ghostscript-wasm\gs.wasm" -Destination "public\ghostscript\"
```

---

### D2: Módulo Não Inicializa Após Carregar Script

**Status:** 📝 Pesquisado (não implementado)

**Problema esperado:**  
Script carrega mas módulo não inicializa.

**Causa:**  
O `gs.js` está em modo **MODULARIZE** do Emscripten - `Module` é uma factory function, não um objeto.

**Solução proposta:**  
Chamar `window.Module()` como função:

```typescript
const module = await factory({
  locateFile: (path: string) => `/ghostscript/${path}`,
});
```

---

### D3: Tempo de Inicialização Longo

**Status:** 📝 Pesquisado (não implementado)

**Problema esperado:**  
Primeira conversão demora 10-60 segundos.

**Causa:**

- Download do `gs.wasm` (~16MB)
- Compilação do WebAssembly pelo browser
- Inicialização do runtime Emscripten

**Mitigações propostas:**

- Informar usuário sobre o tempo de carregamento
- Browser faz cache do WASM para execuções futuras
- Pré-carregar o módulo em background

---

### D4: Erro ao Salvar PDF com Imagens Grandes

**Status:** 📝 Pesquisado (não implementado)

**Problema esperado:**

```
RangeError: Invalid string length
```

**Causa:**  
Imagens em alta resolução (300+ DPI) geram base64 strings muito grandes.

**Soluções propostas:**

1. Converter PNG para JPEG (85% qualidade)
2. Reduzir escala 50% para DPI ≥ 300
3. Usar blob output em vez de string
4. Habilitar compressão no jsPDF

---

### D5: Sem Feedback de Progresso Durante Conversão

**Status:** 📝 Pesquisado (não implementado)

**Problema esperado:**  
Usuário não sabe em qual página está a conversão.

**Descoberta da pesquisa:**  
O `gs.js` compilado usa `console.log` diretamente, ignorando callbacks `print` do Emscripten.

**Solução proposta:**  
Interceptar `console.log` durante execução do `callMain()`:

```typescript
const originalLog = console.log;
console.log = (...args: any[]) => {
  const text = args.join(" ");

  const pageMatch = text.match(/^Page (\d+)$/i);
  if (pageMatch) {
    onProgress?.(parseInt(pageMatch[1]), totalPages);
  }

  originalLog.apply(console, args);
};
```

> ⚠️ **Importante:** NÃO usar `-dQUIET` para receber mensagens de progresso.

---

### D6: Bloqueio da Thread Principal

**Status:** ⬜ Pendente

**Descrição:** Operações pesadas do Ghostscript podem congelar a UI.

**Solução planejada:** Web Worker dedicado

---

### D7: Compatibilidade de Navegadores

**Status:** ⬜ Pendente

**Navegadores alvo:**
| Navegador | Versão mínima | Status |
|-----------|---------------|--------|
| Chrome | 57+ | A validar |
| Firefox | 52+ | A validar |
| Safari | 11+ | A validar |
| Edge | 16+ | A validar |
| IE | N/A | ❌ Não suportado |

---

### D8: PDFs Protegidos

**Status:** ⬜ Pendente

**Descrição:** PDFs com senha não podem ser processados sem credenciais.

**Parâmetro disponível:** `-sPDFPassword=senha`

---

## Especificações Técnicas (Pesquisa)

### Tamanho do Bundle WASM

| Arquivo   | Tamanho |
| --------- | ------- |
| `gs.wasm` | ~16MB   |
| `gs.js`   | ~107KB  |

### Consumo de Memória por DPI (Estimado)

| DPI | Memória por Página A4 |
| --- | --------------------- |
| 72  | ~2 MB                 |
| 150 | ~8 MB                 |
| 300 | ~32 MB                |
| 600 | ~128 MB               |

### Configuração Vite Proposta

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ["@jspawn/ghostscript-wasm"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  assetsInclude: ["**/*.wasm"],
});
```

---

## Desafios Encontrados (Durante Desenvolvimento)

_Esta seção será preenchida conforme problemas forem encontrados durante a implementação._

---

## Legenda de Status

- 📝 Pesquisado (identificado, não implementado)
- ⬜ Pendente
- 🔄 Em análise
- ✅ Resolvido
