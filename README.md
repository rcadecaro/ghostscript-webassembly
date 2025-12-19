# Ghostscript WASM + Vue.js

Aplicação web para processamento de PDFs usando Ghostscript WebAssembly.

## Funcionalidades

- 📄 Conversão PDF → PNG/JPEG
- 📐 Configuração de DPI (72, 150, 300, 600)
- 🎨 Modo colorido ou preto e branco
- 🔒 100% local - arquivos nunca saem do navegador
- 📡 Funciona offline após primeiro carregamento

## Tecnologias

- Vue.js 3 + TypeScript
- Vite 5
- Ghostscript WebAssembly (~16MB)
- jsPDF

## Como Rodar

```bash
cd app
npm install
npm run dev
```

Acesse http://localhost:5173

## Estrutura

```
├── app/                    # Aplicação Vue.js
│   ├── public/ghostscript/ # Arquivos WASM
│   ├── src/
│   │   ├── services/       # GhostscriptService
│   │   ├── types/          # TypeScript types
│   │   └── views/          # Vue components
│   └── vite.config.ts
│
└── diario/                 # Documentação do projeto
    ├── planejamento/
    ├── funcionalidades/
    ├── dificuldades/
    ├── estudos/
    ├── estrategias/
    └── logs/
```

## Licença

⚠️ Ghostscript é licenciado sob AGPL v3 - atenção para uso comercial.
