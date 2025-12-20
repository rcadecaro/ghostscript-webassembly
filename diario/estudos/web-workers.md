# 🧵 Web Workers - Guia Completo para Estudantes

Este guia explica Web Workers de forma detalhada, usando nossa aplicação Ghostscript WebAssembly como exemplo prático.

---

## 📚 Índice

1. [O que são Web Workers?](#1-o-que-são-web-workers)
2. [Por que usar Web Workers?](#2-por-que-usar-web-workers)
3. [Tipos de Workers](#3-tipos-de-workers)
4. [Criando seu Primeiro Worker](#4-criando-seu-primeiro-worker)
5. [Comunicação entre Threads](#5-comunicação-entre-threads)
6. [Caso Real: Nossa Aplicação](#6-caso-real-nossa-aplicação)
7. [Limitações dos Workers](#7-limitações-dos-workers)
8. [Boas Práticas](#8-boas-práticas)
9. [Exercícios Práticos](#9-exercícios-práticos)

---

## 1. O que são Web Workers?

### Definição

**Web Workers** são uma API do JavaScript que permite executar scripts em **threads de background**, separadas da thread principal do navegador.

### Analogia

Imagine uma cozinha de restaurante:

- **Thread Principal** = Chef principal que atende clientes e organiza pedidos
- **Web Worker** = Ajudante de cozinha que prepara pratos demorados

O chef não pode ficar parado esperando um prato demorado. Ele delega ao ajudante e continua atendendo clientes.

### O Problema da Single Thread

JavaScript é **single-threaded** por padrão. Isso significa que:

```javascript
// ❌ PROBLEMA: Isso CONGELA a página por 5 segundos!
function tarefaPesada() {
  const inicio = Date.now();
  while (Date.now() - inicio < 5000) {
    // Processamento pesado
  }
  return "Concluído";
}

tarefaPesada(); // Durante esses 5s, o usuário não consegue clicar, rolar, nada!
```

Com Web Workers:

```javascript
// ✅ SOLUÇÃO: Tarefa pesada em background
const worker = new Worker("meuWorker.js");
worker.postMessage("iniciar");

// O usuário continua interagindo normalmente!
worker.onmessage = (e) => console.log(e.data);
```

---

## 2. Por que usar Web Workers?

### Cenários Ideais

| Cenário                   | Exemplo na Nossa App               |
| ------------------------- | ---------------------------------- |
| Processamento de arquivos | Conversão de PDF para imagens      |
| Cálculos complexos        | Renderização de páginas            |
| Parsing de dados grandes  | Análise do PDF para contar páginas |
| Operações criptográficas  | -                                  |
| Compressão/descompressão  | Criação de arquivo ZIP             |

### Benefícios

1. **UI Responsiva** - Usuário pode continuar interagindo
2. **Melhor UX** - Feedback de progresso em tempo real
3. **Performance** - Uso de múltiplos cores da CPU
4. **Timeout Prevention** - Evita "script não responde"

### Quando NÃO usar

- Tarefas simples (overhead de comunicação)
- Operações que precisam do DOM
- Operações muito rápidas (< 50ms)

---

## 3. Tipos de Workers

### 3.1 Dedicated Workers (Mais comum)

Um worker dedicado a uma única página.

```javascript
// main.js
const worker = new Worker("worker.js");
```

**Usado em nossa app:** `worker.js` para processar PDFs.

### 3.2 Shared Workers

Compartilhado entre várias abas/janelas do mesmo domínio.

```javascript
// main.js
const worker = new SharedWorker("shared.js");
worker.port.start();
worker.port.postMessage("Olá");
```

**Uso:** Cache compartilhado, sincronização entre abas.

### 3.3 Service Workers

Intermediário entre app e rede. Permite funcionalidade offline.

```javascript
// main.js
navigator.serviceWorker.register("/sw.js");
```

**Uso:** PWAs, caching, push notifications.

### Comparação

| Característica | Dedicated              | Shared                    | Service               |
| -------------- | ---------------------- | ------------------------- | --------------------- |
| Escopo         | Uma página             | Várias páginas            | Todo domínio          |
| Acesso ao DOM  | ❌                     | ❌                        | ❌                    |
| Persistência   | Enquanto página aberta | Enquanto alguma conectada | Até ser desregistrado |
| Uso principal  | Processamento          | Compartilhamento          | Offline/Cache         |

---

## 4. Criando seu Primeiro Worker

### Estrutura Básica

**main.js** (Thread Principal)

```javascript
// 1. Criar o worker
const worker = new Worker("worker.js");

// 2. Enviar mensagem para o worker
worker.postMessage({ tipo: "somar", numeros: [1, 2, 3, 4, 5] });

// 3. Receber resposta do worker
worker.onmessage = (event) => {
  console.log("Resultado:", event.data); // 15
};

// 4. Tratar erros
worker.onerror = (error) => {
  console.error("Erro no worker:", error.message);
};

// 5. Encerrar o worker (quando não precisar mais)
// worker.terminate();
```

**worker.js** (Thread do Worker)

```javascript
// Receber mensagem da thread principal
self.onmessage = (event) => {
  const { tipo, numeros } = event.data;

  if (tipo === "somar") {
    const resultado = numeros.reduce((a, b) => a + b, 0);

    // Enviar resposta de volta
    self.postMessage(resultado);
  }
};
```

### Diagrama de Comunicação

```
┌─────────────────────┐         ┌─────────────────────┐
│   Thread Principal  │         │    Web Worker       │
│                     │         │                     │
│  worker.postMessage ├────────►│  self.onmessage     │
│                     │         │                     │
│  worker.onmessage   │◄────────┤  self.postMessage   │
│                     │         │                     │
└─────────────────────┘         └─────────────────────┘
```

---

## 5. Comunicação entre Threads

### 5.1 postMessage / onmessage

O método padrão. Os dados são **clonados** (não passados por referência).

```javascript
// Enviando diferentes tipos de dados
worker.postMessage("texto");
worker.postMessage(42);
worker.postMessage({ nome: "João", idade: 25 });
worker.postMessage([1, 2, 3]);
```

### 5.2 Transferable Objects

Para dados grandes, evita cópia usando **transferência de propriedade**.

```javascript
// ❌ Lento: copia o ArrayBuffer (pode ser gigabytes!)
worker.postMessage({ buffer: meuArrayBuffer });

// ✅ Rápido: TRANSFERE o ArrayBuffer (não copia)
worker.postMessage({ buffer: meuArrayBuffer }, [meuArrayBuffer]);
// ATENÇÃO: Após isso, meuArrayBuffer fica inutilizável na thread principal!
```

**Na nossa app:** Usamos para enviar o PDF (Uint8Array) ao worker.

### 5.3 Structured Clone Algorithm

O `postMessage` usa o **Structured Clone Algorithm** que suporta:

✅ Suportados:

- Primitivos (string, number, boolean, null, undefined)
- Arrays e Objects
- Date, RegExp, Blob, File, FileList
- ArrayBuffer, TypedArrays
- Map, Set

❌ NÃO suportados:

- Funções
- DOM Nodes
- Classes customizadas (perde métodos)
- Symbols

---

## 6. Caso Real: Nossa Aplicação

### Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Vue App (Main Thread)                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              GhostscriptWorkerService.ts        │   │
│  │                                                  │   │
│  │  - initGhostscriptWorker()                      │   │
│  │  - analyzePdf(pdfData, onProgress)              │   │
│  │  - convertPdfWithWorker(pdfData, options)       │   │
│  └─────────────────────┬───────────────────────────┘   │
│                        │                                │
└────────────────────────┼────────────────────────────────┘
                         │ postMessage / onmessage
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Web Worker (Background)                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              public/ghostscript/worker.js       │   │
│  │                                                  │   │
│  │  - Carrega gs.js via importScripts()            │   │
│  │  - Inicializa módulo WASM                       │   │
│  │  - Processa PDF e gera imagens                  │   │
│  │  - Envia progresso em tempo real                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Ghostscript WASM                   │   │
│  │              gs.js + gs.wasm (~16MB)            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Código Real: Serviço (Thread Principal)

```typescript
// GhostscriptWorkerService.ts

let worker: Worker | null = null;
let convertResolve: ((result: ConvertResult) => void) | null = null;

// Handler de mensagens do Worker
function handleWorkerMessage(event: MessageEvent) {
  const { type, payload } = event.data;

  switch (type) {
    case "ready":
      console.log("Worker pronto!");
      break;

    case "progress":
      // Atualiza UI com progresso
      progressCallback?.(payload.current, payload.total);
      break;

    case "complete":
      // Resolve a Promise com as imagens
      convertResolve?.({
        images: payload.images,
        totalPages: payload.images.length,
      });
      break;

    case "error":
      console.error("Erro:", payload.error);
      break;
  }
}

// Inicializa o Worker
export async function initGhostscriptWorker(): Promise<void> {
  worker = new Worker("/ghostscript/worker.js");
  worker.onmessage = handleWorkerMessage;
  worker.postMessage({ type: "init" });
}

// Converte PDF
export async function convertPdfWithWorker(
  pdfData: Uint8Array,
  options: ConvertOptions
): Promise<ConvertResult> {
  return new Promise((resolve) => {
    convertResolve = resolve;
    progressCallback = options.onProgress;

    worker!.postMessage({
      type: "convert",
      payload: { pdfData, dpi: options.dpi, grayscale: options.grayscale },
    });
  });
}
```

### Código Real: Worker

```javascript
// public/ghostscript/worker.js

let gsModule = null;

// Handler de mensagens da thread principal
self.onmessage = async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case "init":
      await initGhostscript();
      break;

    case "convert":
      await convertPdf(payload.pdfData, payload.dpi, payload.grayscale);
      break;
  }
};

// Inicializa Ghostscript
async function initGhostscript() {
  importScripts("/ghostscript/gs.js");

  gsModule = await self.Module({
    locateFile: (path) => `/ghostscript/${path}`,
  });

  self.postMessage({ type: "ready" });
}

// Converte PDF
async function convertPdf(pdfData, dpi, grayscale) {
  // Escreve PDF no sistema de arquivos virtual
  gsModule.FS.writeFile("/tmp/input.pdf", pdfData);

  // Executa Ghostscript
  gsModule.callMain([
    "-dNOPAUSE",
    "-dBATCH",
    `-sDEVICE=${grayscale ? "pnggray" : "png16m"}`,
    `-r${dpi}`,
    "-sOutputFile=/tmp/output/page-%d.png",
    "/tmp/input.pdf",
  ]);

  // Lê imagens geradas
  const files = gsModule.FS.readdir("/tmp/output");
  const images = files
    .filter((f) => f.endsWith(".png"))
    .map((f) => gsModule.FS.readFile(`/tmp/output/${f}`));

  // Envia resultado
  self.postMessage({ type: "complete", payload: { images } });
}
```

### Fluxo de Mensagens na Nossa App

```
Thread Principal                        Worker
      │                                    │
      ├─── {type:'init'} ─────────────────►│
      │                                    │ importScripts()
      │                                    │ await Module()
      │◄──────────── {type:'ready'} ───────┤
      │                                    │
      ├─── {type:'analyze', pdfData} ─────►│
      │                                    │ callMain(nullpage)
      │◄── {type:'analyze_progress'} ──────┤ (por página)
      │◄── {type:'analyzed', pageCount} ───┤
      │                                    │
      ├─── {type:'convert', pdfData} ─────►│
      │                                    │ callMain(png16m)
      │◄── {type:'progress', current} ─────┤ (por página)
      │◄── {type:'complete', images} ──────┤
      │                                    │
```

---

## 7. Limitações dos Workers

### O que Workers NÃO podem fazer

| Não Permitido                         | Por quê                                        |
| ------------------------------------- | ---------------------------------------------- |
| Acessar DOM                           | `document`, `window` não existem               |
| Manipular UI diretamente              | Precisa passar mensagem para main thread       |
| Usar algumas APIs                     | `alert()`, `confirm()`, localStorage (parcial) |
| Importar módulos ES6 (Classic Worker) | Só `importScripts()`                           |

### O que Workers PODEM fazer

| Permitido                | Como usar                    |
| ------------------------ | ---------------------------- |
| XMLHttpRequest / fetch   | Requisições HTTP normalmente |
| WebSockets               | Conexões em tempo real       |
| IndexedDB                | Banco de dados local         |
| setTimeout / setInterval | Temporizadores               |
| Console                  | `console.log()` funciona     |
| Crypto API               | Operações criptográficas     |
| Criar outros Workers     | Workers aninhados            |

### Module Workers vs Classic Workers

```javascript
// Classic Worker (suporta importScripts)
const worker = new Worker("worker.js");

// Module Worker (suporta import/export)
const worker = new Worker("worker.js", { type: "module" });
```

**Problema na nossa app:** Ghostscript usa `importScripts()` internamente, que NÃO funciona em Module Workers. Por isso usamos Classic Worker.

---

## 8. Boas Práticas

### 1. Sempre trate erros

```javascript
// main.js
worker.onerror = (error) => {
  console.error("Erro:", error);
  // Mostrar mensagem ao usuário
};

// worker.js
try {
  // código arriscado
} catch (error) {
  self.postMessage({ type: "error", payload: { error: error.message } });
}
```

### 2. Use protocolo de mensagens estruturado

```javascript
// ❌ Ruim
worker.postMessage("processar");

// ✅ Bom
worker.postMessage({
  type: "PROCESS_FILE",
  payload: { fileData, options },
  requestId: "req-123", // Para rastrear respostas
});
```

### 3. Mostre progresso para tarefas longas

```javascript
// worker.js
for (let i = 0; i < items.length; i++) {
  processItem(items[i]);

  // Reportar progresso a cada 10% ou 100 items
  if (i % 100 === 0) {
    self.postMessage({
      type: "progress",
      payload: { current: i, total: items.length },
    });
  }
}
```

### 4. Limpe recursos quando não precisar

```javascript
// Terminar worker quando não precisar mais
worker.terminate();

// No worker, limpar recursos
self.onmessage = (e) => {
  if (e.data.type === "cleanup") {
    // Liberar memória, fechar conexões
    self.close();
  }
};
```

### 5. Use Transferable para dados grandes

```javascript
// Para Uint8Array grande (como nosso PDF)
const buffer = pdfData.buffer;
worker.postMessage({ pdfData: new Uint8Array(buffer) }, [buffer]);
```

---

## 9. Exercícios Práticos

### Exercício 1: Worker Básico (Iniciante)

Crie um worker que calcule a soma de números de 1 a N.

**Requisitos:**

1. Receber N via postMessage
2. Calcular soma
3. Retornar resultado

<details>
<summary>Ver Solução</summary>

**main.js**

```javascript
const worker = new Worker("soma.worker.js");

worker.postMessage({ n: 1000000 });

worker.onmessage = (e) => {
  console.log("Soma:", e.data.resultado);
};
```

**soma.worker.js**

```javascript
self.onmessage = (e) => {
  const { n } = e.data;
  let soma = 0;

  for (let i = 1; i <= n; i++) {
    soma += i;
  }

  self.postMessage({ resultado: soma });
};
```

</details>

### Exercício 2: Progresso (Intermediário)

Modifique o exercício anterior para enviar progresso a cada 10%.

<details>
<summary>Ver Solução</summary>

**soma.worker.js**

```javascript
self.onmessage = (e) => {
  const { n } = e.data;
  let soma = 0;
  const step = Math.floor(n / 10);

  for (let i = 1; i <= n; i++) {
    soma += i;

    if (i % step === 0) {
      self.postMessage({
        type: "progress",
        percent: Math.round((i / n) * 100),
      });
    }
  }

  self.postMessage({ type: "complete", resultado: soma });
};
```

</details>

### Exercício 3: Processamento de Imagem (Avançado)

Crie um worker que aplique filtro grayscale em uma imagem.

<details>
<summary>Ver Solução</summary>

**main.js**

```javascript
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const img = document.getElementById("imagem");

ctx.drawImage(img, 0, 0);
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

const worker = new Worker("grayscale.worker.js");
worker.postMessage({ imageData }, [imageData.data.buffer]);

worker.onmessage = (e) => {
  const newImageData = new ImageData(
    new Uint8ClampedArray(e.data.buffer),
    canvas.width,
    canvas.height
  );
  ctx.putImageData(newImageData, 0, 0);
};
```

**grayscale.worker.js**

```javascript
self.onmessage = (e) => {
  const data = e.data.imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = gray; // R
    data[i + 1] = gray; // G
    data[i + 2] = gray; // B
    // Alpha (i+3) permanece igual
  }

  self.postMessage({ buffer: data.buffer }, [data.buffer]);
};
```

</details>

---

## 📖 Recursos Adicionais

- [MDN Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Using Web Workers (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [Código da nossa aplicação](https://github.com/rcadecaro/ghostscript-webassembly)

---

## 🎯 Resumo

| Conceito      | Resumo                                       |
| ------------- | -------------------------------------------- |
| Web Worker    | Thread de background para tarefas pesadas    |
| postMessage   | Envia dados entre threads (copia dados)      |
| onmessage     | Recebe dados da outra thread                 |
| Transferable  | Passa dados sem copiar (mais rápido)         |
| importScripts | Carrega scripts externos (só Classic Worker) |
| terminate()   | Encerra o worker                             |

**Lembre-se:** Web Workers são sobre **não bloquear a UI**. Se sua tarefa leva mais de 50ms, considere usar um Worker!
