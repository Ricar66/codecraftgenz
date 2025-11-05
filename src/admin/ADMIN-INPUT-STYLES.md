Admin – Padrões de Inputs e Formulários

Objetivo
- Unificar visual e usabilidade dos campos na área administrativa, mantendo responsividade e acessibilidade.

Classes e padrões
- `.formRow`: linha de formulário com espaçamento consistente; empilha verticalmente em telas pequenas.
- `.formGroup`: empacota `label + input` verticalmente.
- `.form-label`: estilo de rótulo claro (14px, cor #2c3e50).
- `.form-help`: texto auxiliar e dicas (12px, cor #7f8c8d).
- `.sr-only`: rótulo apenas para leitores de tela (acessibilidade) — mantém semântico sem afetar o layout.
- `.checkbox-row`: alinha checkbox e rótulo horizontalmente com gap.
- Base de inputs: dentro de `.admin-content`, todos os `input` (exceto checkbox/radio), `select` e `textarea` têm padding, borda, raio e fundo translúcido padronizados.
- Estados de interação: `:hover`, `:focus`/`:focus-visible` e `:disabled` com realce de foco em `#00E4F2`.
- Validação visual: `[aria-invalid="true"]`, `.is-invalid` e pseudo `:invalid` destacam erro com borda vermelha e halo suave; mensagens usam `.input-error`.
- Checkboxes e radios: `accent-color: #00E4F2` para consistência de marca e contraste.
- Botões: `.btn`, `.btn-primary`, `.btn-outline`, `.btn-secondary`, `.btn-danger` com estados `:hover`, `:focus-visible` e `:disabled`.

Transparência (glass)
- Containers `.card` e `.filters-section` usam fundo translúcido com `backdrop-filter` para efeito glass, garantindo legibilidade.
- Inputs mantêm fundo levemente translúcido para leitura clara sobre qualquer plano de fundo.

Diretrizes de uso
- Prefira incluir rótulos visíveis quando possível; se não for viável, use `aria-label` ou um `<label class="sr-only">` vinculado por `htmlFor`/`id`.
- Marque campos obrigatórios com `required` e/ou `aria-required="true"` e forneça feedback com `.input-error`.
- Em listas de filtros, mantenha espaçamento com `.formRow`; em telas estreitas, a classe já empilha os itens.

Exemplo básico
```
<div class="card">
  <div class="formRow">
    <div class="formGroup">
      <label class="form-label" for="nome">Nome</label>
      <input id="nome" placeholder="Digite o nome" required />
      <div class="form-help">Use nome completo.</div>
    </div>
    <div class="formGroup">
      <label class="form-label" for="email">E-mail</label>
      <input id="email" type="email" placeholder="email@exemplo.com" />
    </div>
    <label class="checkbox-row"><input type="checkbox" /> Visível</label>
  </div>
</div>
```

Manutenção
- Centralize estilos em `src/admin/AdminCommon.css`. Evite estilos inline para facilitar consistência.
- Ao criar novos formulários, reutilize `.formRow`, `.formGroup` e os estados padrão.