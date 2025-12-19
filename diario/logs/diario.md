# 📅 Log de Desenvolvimento

---

## 2025-12-19

### 🎯 Objetivo do dia

- Implementar MVP funcional do conversor PDF → Imagem

### ✅ Concluído

- Projeto Vue.js 3 + Vite + TypeScript criado
- Dependências instaladas (@jspawn/ghostscript-wasm, jspdf)
- Arquivos WASM copiados para public/ghostscript/
- GhostscriptService.ts implementado com carregamento dinâmico
- Tipos TypeScript definidos (ghostscript.ts)
- ConverterView.vue com interface dark mode premium
- Configurações de DPI (72/150/300/600)
- Modo colorido e preto & branco
- Upload com drag & drop
- Download individual e "Baixar Todas"
- Spinner animado com feedback visual
- Git inicializado e primeiro commit

### 📝 Descobertas técnicas

1. Vite não funciona com módulos Emscripten - bypass via public/
2. `window.Module` é factory function, não objeto
3. `locateFile` obrigatório para encontrar .wasm
4. `callMain()` é síncrono e bloqueia UI
5. Download com blob URL requer appendChild

### ⏰ Tempo investido

- ~2h implementação
- ~30min debugging e ajustes de UI

### 📊 Métricas

- 8 páginas convertidas em ~10s (após WASM carregado)
- 20 páginas convertidas em ~25s
- Interface responsiva e moderna

---

_Adicione novas entradas acima desta linha_
