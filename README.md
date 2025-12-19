# 🔮 Ghostscript WebAssembly

Conversor de PDF para imagens usando Ghostscript WebAssembly, rodando 100% no navegador.

## 🚀 Demo

**[Acessar Aplicação](https://ghostscript-webassembly.web.app)**

## ✨ Funcionalidades

- **📄 PDF → PNG** - Converte páginas de PDF para imagens PNG
- **🎨 Opções de qualidade** - DPI: 72, 150, 300 ou 600
- **🖤 Modo P&B** - Conversão para escala de cinza
- **📑 Seleção de páginas** - Todas ou intervalo específico
- **📦 Download ZIP** - Baixar todas imagens em um arquivo
- **⚡ Processamento local** - Nenhum upload para servidor
- **🔒 100% Privado** - Tudo roda no seu navegador

## 🛠️ Tecnologias

- **Vue 3** + TypeScript
- **Vite** para build
- **Ghostscript WASM** para processamento de PDF
- **Web Workers** para não bloquear a UI
- **Firebase Hosting** para deploy
- **Google Analytics 4** para monitoramento

## 📦 Instalação Local

```bash
# Clone o repositório
git clone https://github.com/rcadecaro/ghostscript-webassembly.git
cd ghostscript-webassembly

# Instale dependências
cd app
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

## 🏗️ Build para Produção

```bash
cd app
npm run build
```

Os arquivos serão gerados em `app/dist/`.

## 🚀 Deploy

O deploy é automático via GitHub Actions quando há push para `main`.

Para deploy manual:

```bash
cd app
npm run build
firebase deploy --only hosting
```

## 📊 Estrutura do Projeto

```
ghostscript/
├── app/                          # Aplicação Vue
│   ├── public/
│   │   └── ghostscript/          # Arquivos WASM
│   │       ├── gs.js
│   │       ├── gs.wasm
│   │       └── worker.js
│   ├── src/
│   │   ├── services/
│   │   │   ├── firebase.ts       # Analytics
│   │   │   └── ghostscript/
│   │   └── views/
│   │       └── ConverterView.vue
│   └── firebase.json
├── diario/                       # Documentação do projeto
└── .github/workflows/            # CI/CD
```

## 📝 Licença

Ghostscript é licenciado sob AGPL v3. Veja [COPYING](https://www.gnu.org/licenses/agpl-3.0.html) para detalhes.
