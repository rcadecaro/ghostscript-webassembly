# 🔧 Funcionalidades Detalhadas

## Categoria 1: Conversões

### 1.1 PDF para Imagem (PNG/JPEG)

**Descrição**: Converter páginas de PDF em imagens de alta qualidade

**Parâmetros configuráveis**:
| Parâmetro | Valores | Default | Comando GS |
|-----------|---------|---------|------------|
| Formato | PNG, JPEG | PNG | `-sDEVICE=png16m` |
| Resolução | 72, 150, 300, 600 DPI | 150 | `-r150` |
| Qualidade JPEG | 1-100 | 85 | `-dJPEGQ=85` |
| Antialiasing Texto | 1-4 | 4 | `-dTextAlphaBits=4` |
| Antialiasing Gráficos | 1-4 | 4 | `-dGraphicsAlphaBits=4` |
| Páginas | todas, range, específicas | todas | `-dFirstPage`, `-dLastPage` |

**Comando base**:

```bash
gs -dNOPAUSE -dBATCH -sDEVICE=png16m -r300
   -dTextAlphaBits=4 -dGraphicsAlphaBits=4
   -sOutputFile=page-%03d.png input.pdf
```

**Complexidade**: ⭐⭐ Média  
**Dependências**: Nenhuma

---

### 1.2 Compressão de PDF

**Descrição**: Reduzir tamanho de arquivos PDF mantendo qualidade aceitável

**Presets disponíveis**:
| Preset | DPI | Uso ideal | Redução esperada |
|--------|-----|-----------|------------------|
| screen | 72 | Web, email | 70-90% |
| ebook | 150 | Leitura digital | 50-70% |
| printer | 300 | Impressão comum | 20-40% |
| prepress | 300+ | Gráfica profissional | 10-20% |

**Comando base**:

```bash
gs -dNOPAUSE -dBATCH -sDEVICE=pdfwrite
   -dPDFSETTINGS=/ebook -dCompatibilityLevel=1.4
   -sOutputFile=compressed.pdf input.pdf
```

**Complexidade**: ⭐ Baixa  
**Dependências**: Nenhuma

---

### 1.3 Conversão Grayscale

**Descrição**: Converter PDF colorido para escala de cinza

**Comando base**:

```bash
gs -dNOPAUSE -dBATCH -sDEVICE=pdfwrite
   -sColorConversionStrategy=Gray
   -dProcessColorModel=/DeviceGray
   -sOutputFile=grayscale.pdf input.pdf
```

**Complexidade**: ⭐ Baixa  
**Dependências**: Nenhuma

---

## Categoria 2: Manipulação

### 2.1 Extração de Páginas

**Descrição**: Extrair páginas específicas de um PDF

**Modos de seleção**:

- Página única: `5`
- Range: `1-10`
- Múltiplas: `1,3,5,7`
- Misto: `1-5,10,15-20`

**Comando base**:

```bash
gs -dNOPAUSE -dBATCH -sDEVICE=pdfwrite
   -dFirstPage=1 -dLastPage=5
   -sOutputFile=extracted.pdf input.pdf
```

**Complexidade**: ⭐⭐ Média  
**Dependências**: Parser de range de páginas

---

### 2.2 Merge de PDFs

**Descrição**: Combinar múltiplos PDFs em um único arquivo

**Recursos**:

- Ordenação via drag-and-drop
- Preview antes do merge
- Compressão pós-merge opcional

**Comando base**:

```bash
gs -dNOPAUSE -dBATCH -sDEVICE=pdfwrite
   -sOutputFile=merged.pdf
   input1.pdf input2.pdf input3.pdf
```

**Complexidade**: ⭐⭐ Média  
**Dependências**: Gerenciamento de múltiplos arquivos no MEMFS

---

### 2.3 Split de PDFs

**Descrição**: Dividir PDF em múltiplos arquivos

**Modos de divisão**:

- Por página (cada página = 1 arquivo)
- Por range (a cada N páginas)
- Personalizado (ranges específicos)

**Complexidade**: ⭐⭐⭐ Alta  
**Dependências**: Loop de processamento + ZIP para download

---

## Categoria 3: Análise

### 3.1 Informações do Documento

**Métricas extraídas**:

- Total de páginas
- Tamanho do arquivo
- Dimensões por página (width x height)
- Orientação (retrato/paisagem)
- Versão do PDF

**Complexidade**: ⭐⭐ Média  
**Dependências**: Parser de informações GS

---

### 3.2 Extração de Texto

**Descrição**: Extrair conteúdo textual do PDF

**Comando base**:

```bash
gs -dNOPAUSE -dBATCH -sDEVICE=txtwrite
   -sOutputFile=text.txt input.pdf
```

**Formatos de saída**:

- Plain text (.txt)
- JSON estruturado (por página)

**Complexidade**: ⭐⭐ Média  
**Dependências**: Encoding UTF-8

---

### 3.3 Extração de Metadados

**Dados extraídos**:

- Título
- Autor
- Assunto
- Palavras-chave
- Data de criação
- Data de modificação
- Aplicativo criador

**Complexidade**: ⭐⭐⭐ Alta  
**Dependências**: PostScript commands customizados

---

## Matriz de Priorização

| Funcionalidade      | Impacto | Esforço | Prioridade |
| ------------------- | ------- | ------- | ---------- |
| PDF → Imagem        | Alto    | Médio   | 🔴 P1      |
| Compressão          | Alto    | Baixo   | 🔴 P1      |
| Extração de páginas | Alto    | Médio   | 🔴 P1      |
| Merge               | Médio   | Médio   | 🟡 P2      |
| Split               | Médio   | Alto    | 🟡 P2      |
| Extração de texto   | Médio   | Médio   | 🟡 P2      |
| Grayscale           | Baixo   | Baixo   | 🟢 P3      |
| Metadados           | Baixo   | Alto    | 🟢 P3      |

**Legenda**:

- 🔴 P1: Essencial para MVP
- 🟡 P2: Importante, segunda iteração
- 🟢 P3: Nice-to-have
