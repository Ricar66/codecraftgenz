# CodeCraft Gen-Z - Guia de Identidade Visual

## 📋 Visão Geral

Este documento define as diretrizes para uso correto da identidade visual da CodeCraft Gen-Z, incluindo especificações de cores, tipografia, espaçamento e aplicações do logotipo.

## 🎨 Paleta de Cores Corporativa

### Cores Primárias

```css
/* Roxo Principal */
--primary-purple: #8b5cf6;
--primary-purple-rgb: rgb(139, 92, 246);

/* Roxo Médio */
--medium-purple: #a855f7;
--medium-purple-rgb: rgb(168, 85, 247);

/* Roxo Claro */
--light-purple: #c084fc;
--light-purple-rgb: rgb(192, 132, 252);
```

### Cores Secundárias

```css
/* Ciano Principal */
--primary-cyan: #06b6d4;
--primary-cyan-rgb: rgb(6, 182, 212);

/* Ciano Escuro */
--dark-cyan: #0891b2;
--dark-cyan-rgb: rgb(8, 145, 178);
```

### Cores de Apoio

```css
/* Branco */
--white: #ffffff;
--white-rgb: rgb(255, 255, 255);

/* Cinza Claro */
--light-gray: #f8fafc;
--light-gray-rgb: rgb(248, 250, 252);

/* Cinza Médio */
--medium-gray: #64748b;
--medium-gray-rgb: rgb(100, 116, 139);
```

## 🔤 Tipografia

### Fonte Principal

- **Família**: Arial, sans-serif (sistema)
- **Pesos**: Normal (400), Bold (700)
- **Uso**: Textos gerais, interface

### Fonte Secundária

- **Família**: Helvetica, Arial, sans-serif
- **Uso**: Títulos, destaques

## 📐 Especificações do Logo

### Dimensões Disponíveis

| Tamanho | Arquivo | Uso Recomendado |
|---------|---------|-----------------|
| 32x32px | `favicon.svg` | Favicon padrão, ícones pequenos |
| 32x32px | `favicon-32x32.svg` | Favicon otimizado |
| 64x64px | `favicon-64x64.svg` | Ícones médios, aplicativos |
| 128x128px | `favicon-128x128.svg` | Ícones grandes, alta resolução |

### Área de Proteção

- **Mínima**: 8px em todos os lados para tamanhos até 64px
- **Recomendada**: 16px em todos os lados para tamanhos acima de 64px

### Tamanho Mínimo

- **Digital**: 16x16px (legibilidade mínima)
- **Impressão**: 12mm x 12mm

## 🎯 Elementos Visuais

### Conceito do Logo

O logo da CodeCraft Gen-Z representa:

- **Rede de Conexões**: Simboliza conectividade, colaboração e tecnologia
- **Nós Interligados**: Representam diferentes tecnologias e soluções
- **Gradientes**: Transmitem modernidade e inovação
- **Letra "C"**: Identifica a marca de forma sutil e elegante

### Simbolismo

- **Círculos**: Pontos de conexão, soluções integradas
- **Linhas**: Fluxo de dados, comunicação, processos
- **Gradientes**: Evolução, crescimento, futuro
- **Brackets `{ }`**: Código, programação, desenvolvimento

## 📱 Aplicações

### Uso Digital

- **Websites**: Favicon, logo de cabeçalho
- **Aplicativos**: Ícone de aplicativo
- **Redes Sociais**: Avatar, profile picture
- **E-mail**: Assinatura, cabeçalho

### Uso em Fundos

| Fundo | Logo Recomendado | Opacidade |
|-------|------------------|-----------|
| Branco/Claro | Versão colorida | 100% |
| Escuro | Versão colorida | 100% |
| Colorido | Versão branca | 90-100% |

## 🚫 Restrições de Uso

### NÃO FAZER

- ❌ Alterar as proporções do logo
- ❌ Modificar as cores sem autorização
- ❌ Adicionar efeitos não especificados
- ❌ Usar em fundos que comprometam a legibilidade
- ❌ Rotacionar ou inclinar o logo
- ❌ Usar versões pixelizadas ou de baixa qualidade

### FAZER

- ✅ Manter proporções originais
- ✅ Usar cores especificadas
- ✅ Respeitar área de proteção
- ✅ Garantir contraste adequado
- ✅ Usar versões apropriadas para cada tamanho

## 🔧 Implementação Técnica

### HTML

```html
<!-- Favicon principal -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />

<!-- Versões específicas -->
<link rel="icon" type="image/svg+xml" sizes="32x32" href="/favicon-32x32.svg" />
<link rel="icon" type="image/svg+xml" sizes="64x64" href="/favicon-64x64.svg" />
<link rel="icon" type="image/svg+xml" sizes="128x128" href="/favicon-128x128.svg" />
```

### CSS

```css
/* Gradiente principal da marca */
.brand-gradient {
  background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #06b6d4 100%);
}

/* Cores da marca como variáveis CSS */
:root {
  --brand-primary: #8b5cf6;
  --brand-secondary: #a855f7;
  --brand-accent: #06b6d4;
}
```

## 📊 Métricas de Qualidade

### Resolução Mínima

- **Web**: 72 DPI
- **Impressão**: 300 DPI
- **Retina/HiDPI**: 144+ DPI

### Formatos Suportados

- **SVG**: Preferencial (escalável, pequeno)
- **PNG**: Alternativa (com transparência)
- **ICO**: Compatibilidade (Windows)

## 📞 Contato

Para dúvidas sobre o uso da identidade visual ou solicitação de novos formatos, entre em contato com a equipe de design da CodeCraft Gen-Z.

---

**Versão**: 1.0  
**Data**: Janeiro 2025  
**Autor**: CodeCraft Gen-Z Design Team
