# 📋 Planejamento - Ghostscript WebAssembly

## Status: ✅ MVP Concluído + Em Produção

**URL de Produção:** https://ghostscript-webassembly.web.app

---

## Funcionalidades Implementadas

### Core

- [x] **Conversão PDF → Imagem** (PNG)
- [x] **Web Worker** para processamento em background
- [x] **Seleção de DPI** (72, 150, 300, 600)
- [x] **Modo Grayscale** (Preto & Branco)
- [x] **Seleção de páginas** (Todas ou Intervalo)

### UX

- [x] **Análise de PDF** com contagem de páginas
- [x] **Progresso em tempo real** (página a página)
- [x] **Drag & Drop** para upload
- [x] **Download individual** de imagens
- [x] **Download ZIP** de todas imagens

### Infraestrutura

- [x] **Firebase Hosting** com deploy automático
- [x] **GitHub Actions** CI/CD
- [x] **Google Analytics** para monitoramento
- [x] **Headers COOP/COEP** para WASM

---

## Stack Tecnológica

| Camada     | Tecnologia         |
| ---------- | ------------------ |
| Frontend   | Vue 3 + TypeScript |
| Build      | Vite               |
| PDF Engine | Ghostscript WASM   |
| Hosting    | Firebase Hosting   |
| Analytics  | Google Analytics 4 |
| CI/CD      | GitHub Actions     |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Vue App (Main Thread)                │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ConverterView│  │WorkerService │  │   Firebase     │  │
│  │   (.vue)    │◄─┤    (.ts)     │  │  Analytics     │  │
│  └─────────────┘  └──────┬───────┘  └────────────────┘  │
└──────────────────────────┼──────────────────────────────┘
                           │ postMessage
                           ▼
┌──────────────────────────────────────────────────────────┐
│                  Web Worker (Background)                 │
│  ┌────────────────┐  ┌─────────────────────────────────┐ │
│  │  worker.js     │  │  Ghostscript WASM               │ │
│  │  (Classic)     │──┤  gs.js + gs.wasm (~16MB)        │ │
│  └────────────────┘  └─────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## Eventos de Analytics

| Evento                 | Descrição           |
| ---------------------- | ------------------- |
| `pdf_loaded`           | PDF selecionado     |
| `conversion_started`   | Conversão iniciada  |
| `conversion_completed` | Conversão concluída |
| `image_downloaded`     | Download individual |
| `zip_downloaded`       | Download ZIP        |
| `error_occurred`       | Erro detectado      |

---

## Próximos Passos (Backlog)

- [ ] Compressão de PDF
- [ ] Merge de PDFs
- [ ] Split de PDFs
- [ ] Conversão para outros formatos
- [ ] PWA / Offline support
