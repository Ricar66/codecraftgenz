# Stories Instagram — Lançamento CodeCraft Gen-Z
## Direção visual: **Software Box · Edição Inaugural**

4 stories que se leem como **edições numeradas** (Nº 01–04) de um catálogo impresso de software house. Papel kraft, foil dourado nos selos, carimbo vermelho de tinta. Cada story tem um **selo de licença numerado** (`#0001` a `#0004`) que cria continuidade entre eles quando vistos em sequência.

---

## Os 4 stories

| # | Arquivo | Tema | Link sticker no Insta |
|---|---|---|---|
| 01 | `story-1-lancamento.html` | **LANÇAMENTO** — capa da edição inaugural com selo holográfico grande | `https://codecraftgenz.com.br` |
| 02 | `story-2-loja-desktop.html` | **DESKTOP FIRST** — spec sheet estilo "lateral da caixa" + carimbo "LICENÇA VITALÍCIA" | `https://codecraftgenz.com.br/aplicativos` |
| 03 | `story-3-craftcard.html` | **NETWORKING SEM PAPEL** — mockup do CraftCard letterpress com etiqueta de gráfica | `https://craftcardgenz.com/ricardo-coradini` |
| 04 | `story-4-feedback.html` | **FALA PRA GENTE** — cartão de resposta dos anos 90, com checkbox marcado e handwriting | `https://codecraftgenz.com.br/avaliacao?ref=instagram` |

Todos em **1080 × 1920px** (formato Story 9:16).

---

## Anatomia compartilhada (continuidade visual)

Cada story tem os mesmos elementos no mesmo lugar — isso amarra a sequência:

- **Topbar mono** com hexágono + "codecraft gen·z" + data/origem
- **Eyebrow** colorido com bolinha vermelha
- **Issue Nº XX** no canto superior direito (mesmo lugar sempre)
- **Hero gigante** (Archivo Black) com palavra em outline na segunda linha
- **Carimbo vermelho** girado, com textura SVG (parece carimbo real)
- **Mini-selo dourado** numerado #0001 → #0004
- **Barcode + SKU** (`CCG·DESK·V1`, `CCG·CARD·001`, etc)
- **Cantos de registro** (guias de impressão) + borda perfurada
- **Bottom CTA** apontando pro link sticker

---

## Como exportar PNG

### Opção 1 — Clique duas vezes em `gerar_pngs.bat`

Roda Chrome em headless e cospe os 4 PNGs em `png/`.

### Opção 2 — PowerShell (se .bat falhar):

```powershell
$dir = "C:\Users\ricardo.moretti\Documents\codecraft-frontend\marketing\stories"
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
foreach ($f in @("story-1-lancamento","story-2-loja-desktop","story-3-craftcard","story-4-feedback")) {
  $html = "file:///$($dir.Replace('\','/'))/$f.html"
  $png  = "$dir\png\$f.png"
  & $chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1080,1920 --screenshot=$png $html
}
```

### Opção 3 — Manual (Chrome DevTools)

1. Abra o `.html` no Chrome
2. F12 → ícone celular → setar **1080 × 1920** em "Responsive"
3. Ctrl+Shift+P → digite "Capture full size screenshot" → Enter

---

## Como publicar no Instagram

1. Story → **escolha o PNG** correspondente
2. Toque no ícone de **sticker** (smile no topo) → procure **"LINK"**
3. Cole o link da tabela acima — **um por story**
4. **Posicione o sticker no canto superior direito**, onde o design diz `Toque no link acima ↑`
5. Publique

> ⚠️ Instagram permite **apenas 1 link clicável por story**. Por isso são 4 stories — um pra cada destino.

---

## Ordem de publicação recomendada

**Tudo no mesmo dia.** Sequência narrativa:

1. **Nº 01 (Lançamento)** — abre o anúncio com o selo holográfico inaugural
2. **Nº 03 (CraftCard)** — pula pro produto mais "tangível" (cartão de visita com QR), gera curiosidade
3. **Nº 02 (Desktop)** — depois mostra a linha de apps offline (filtra audiência B2B séria)
4. **Nº 04 (Feedback)** — fecha pedindo opinião (gera respostas e DM)

Intervalo entre cada story: 30–60 minutos (ou em sequência se for evento de lançamento).

---

## Personalizações rápidas

| O que mudar | Onde |
|---|---|
| **Data** (`22.06.2026`) | Em todos os 4: buscar `22.06.2026` ou `22 · 06 · 2026` no `.html` |
| **Iniciais do avatar** do CraftCard | `story-3-craftcard.html` → `<div class="card-name">Ricardo<br>Coradini</div>` |
| **Contatos do cartão** | `story-3-craftcard.html` → bloco `.card-meta` |
| **Números do checklist** (5+ / 10+ / 9–17h) | `story-1-lancamento.html` → bloco `.ck` |
| **Handwriting do form** (slide 4) | `story-4-feedback.html` → `.line.l1::after` e `.line.l2::after` (campo `content`) |
| **Cor do selo** | Variável principal `#B89653` (dourado). Trocar pra `#7A6A4A` (bronze) ou `#8E6E2E` (mostarda) |

---

## Tokens visuais

```
Papel kraft        #E8DFC8   (bg principal)
Papel kraft+       #F0E7CF   (formulário)
Verde-floresta     #1A3329   (texto principal, hairlines)
Ink quase-preto    #0D1812   (texto forte)
Dourado de selo    #B89653   (eyebrow, selo, foil)
Dourado claro      #D8B975   (highlight do selo)
Vermelho carimbo   #D44A2C   (CTA, stamp, ink marks)
Cinza graphite     #7A6A4A   (texto secundário)
```

### Tipografia
- **Display:** Archivo (700/900)
- **Serif itálico:** Fraunces
- **Utility/mono:** JetBrains Mono
- **Handwriting:** Caveat (só no formulário do slide 4)

---

## Observações técnicas

- HTML standalone — abre direto do disco
- Puxa Google Fonts → conecte na internet na 1ª exportação
- Cada PNG: ~600 KB a 3 MB (dentro do limite do Insta de 30 MB)
- Os filtros SVG (grain do papel, rough do carimbo) garantem que **não pareça vetor limpo demais** — o detalhe que separa "AI-generated template" de "design real"
