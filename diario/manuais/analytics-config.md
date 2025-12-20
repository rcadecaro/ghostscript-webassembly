# 📊 Configuração do Google Analytics 4 (GA4)

Para visualizar os **parâmetros personalizados** (como `page_number`, `dpi`, `file_size_kb`) nos relatórios do GA4, você precisa registrá-los como **Dimensões Personalizadas**.

Os **eventos** (nomes como `preview_opened`) aparecem automaticamente, mas os detalhes (parâmetros) precisam dessa configuração manual.

---

## 🛠️ Como Registrar Dimensões Personalizadas

1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Vá em **Analytics** > **Custom Definitions** (Definições Personalizadas).
3. Clique no botão **Create custom dimensions** (Criar dimensões personalizadas).

### Lista de Dimensões para Criar

Crie uma dimensão para cada linha abaixo. Mantenha o "Escopo" como **Evento**.

| Nome da Dimensão (Exibição) | Parâmetro do Evento (Código) | Descrição                                 |
| --------------------------- | ---------------------------- | ----------------------------------------- |
| **File Name**               | `file_name`                  | Nome do arquivo PDF                       |
| **File Size (KB)**          | `file_size_kb`               | Tamanho do arquivo                        |
| **Page Count**              | `page_count`                 | Total de páginas do PDF                   |
| **DPI**                     | `dpi`                        | Resolução escolhida                       |
| **Grayscale**               | `grayscale`                  | Se foi conversão P&B (true/false)         |
| **Page Range**              | `page_range`                 | Intervalo de páginas (ex: "1-5" ou "all") |
| **Duration (Seconds)**      | `duration_seconds`           | Tempo de conversão                        |
| **Image Count**             | `image_count`                | Quantidade de imagens geradas/baixadas    |
| **Page Number**             | `page_number`                | Número da página visualizada/baixada      |
| **Direction**               | `direction`                  | Direção da navegação (next/prev)          |
| **Error Type**              | `error_type`                 | Tipo de erro                              |
| **Error Message**           | `error_message`              | Mensagem de erro                          |

---

## 📈 Onde ver os dados?

### 1. Tempo Real (Imediato)

- **Menu:** Analytics > Dashboard > View more in Google Analytics > Relatórios > Tempo real.
- **O que vê:** Eventos chegando agora. Clicando no evento, você vê os parâmetros mesmo sem registrar as dimensões acima.

### 2. Relatórios Padrão (24-48h)

- **Menu:** Relatórios > Engajamento > Eventos.
- **O que vê:** Contagem total de eventos.

### 3. Explorar (Análise Detalhada)

- **Menu:** Explorar (ícone de bússola no GA4).
- **O que vê:** Aqui é onde as **Dimensões Personalizadas** brilham. Você pode criar tabelas cruzando `preview_navigated` com `direction` para saber quantas vezes avançaram vs voltaram, por exemplo.

---

## ⚠️ Importante

- As dimensões só começam a coletar dados **a partir do momento que você as cria**. Dados passados não são retroativos para os parâmetros (apenas para a contagem de eventos).
- Pode levar até **24 horas** para as novas dimensões aparecerem nos relatórios após o registro.
