# 📔 Log Diário de Desenvolvimento

---

## 19/12/2024 - MVP Concluído + Deploy 🚀

### Conquistas

**Web Worker Funcional**

- Criado Worker clássico em `public/ghostscript/worker.js`
- Interceptação de `console.log` antes de importar `gs.js`
- Captura de progresso página a página

**Seleção de Páginas**

- Análise automática do PDF para detectar total de páginas
- UI com opções "Todas" ou "Intervalo"
- Parâmetros `-dFirstPage` e `-dLastPage` do Ghostscript

**Download ZIP**

- Integração com JSZip
- Download de todas imagens em arquivo único
- Nomeação automática baseada no PDF original

**Firebase Deploy**

- Configuração de Firebase Hosting
- GitHub Actions para CI/CD automático
- Headers COOP/COEP para WASM funcionar

**Google Analytics**

- Integração com Firebase Analytics (GA4)
- Eventos: pdf_loaded, conversion_started/completed, downloads
- Monitoramento de erros

### Desafios Resolvidos

1. **Workers módulo vs clássico** - Emscripten usa `importScripts()` que só funciona em Workers clássicos
2. **Callback print ignorado** - `gs.js` usa wrapper interno, solução foi interceptar `console.log`
3. **Experimento webframeworks** - Firebase exigiu flag experimental para deploy de Vite

### Commits do Dia

- `cffff9c` - fix: intercepta console.log ANTES de importar gs.js
- `222e7e8` - feat: download de todas imagens como ZIP
- `1df8117` - feat: progresso visual durante análise de PDF
- `96aa7cc` - fix: habilita experimento webframeworks no Firebase
- `e27a641` - feat: integra Google Analytics via Firebase

### URL de Produção

🔗 https://ghostscript-webassembly.web.app

---

## Template para Próximas Entradas

```markdown
## DD/MM/AAAA - Título

### Conquistas

- ...

### Desafios

- ...

### Próximos Passos

- ...
```
